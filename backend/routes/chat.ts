import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { chatService } from '../services/chat';
import { roleGuard } from '../middleware/roleGuard';
import { CollectionModel, CollectionPermission } from '../models/Collection';
import { WebSocket, WebSocketServer } from 'ws';
import { UserRole } from '../models/User';
import { Chat } from '../models/Chat';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { usageService } from '../services/usageService';
import multer from 'multer';
import { fileParserService } from '../services/fileParser';

const router = Router();
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  chatId?: string;
}

// Middleware to verify token
const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.use(verifyToken);

const wss = new WebSocketServer({ 
  port: 5001,
  path: '/ws',
  clientTracking: true,
  verifyClient: (info, cb) => {
    try {
      // Get token from URL parameters
      const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
      // console.log('Incoming WebSocket connection URL:', info.req.url);
      
      const token = url.searchParams.get('token');
      // console.log('Token from URL params:', token ? 'Present' : 'Not present');
      
      if (!token) {
        // console.log('WebSocket connection rejected: No token provided');
        cb(false, 401, 'Unauthorized');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        (info.req as any).user = decoded;
        // console.log('WebSocket connection authorized for user:', decoded.username);
        cb(true);
      } catch (jwtError) {
        // console.error('JWT verification failed:', jwtError);
        cb(false, 401, 'Invalid token');
        return;
      }
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      cb(false, 401, 'Unauthorized');
    }
  }
});

function heartbeat(this: WebSocket) {
  (this as ExtendedWebSocket).isAlive = true;
}

const interval = setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
    const extWs = ws as ExtendedWebSocket;
    if (!extWs.isAlive) {
      // console.log(`Terminating inactive connection for user: ${extWs.userId}`);
      return ws.terminate();
    }
    extWs.isAlive = false;
    extWs.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(interval);
});

wss.on('connection', (ws: WebSocket, req: Request) => {
  const extWs = ws as ExtendedWebSocket;
  extWs.isAlive = true;
  
  // Try to get token from URL parameters first
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const urlToken = url.searchParams.get('token');
  const urlChatId = url.searchParams.get('chat');
  
  // Then try to get from headers if not in URL
  const headerToken = req.headers['authorization']?.split(' ')[1];
  const token = urlToken || headerToken;
  
  // Validate MongoDB ObjectId format
  const isValidObjectId = (id: string | null): boolean => {
    if (!id) return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  };
  
  // console.log('Connection parameters:', {
  //   fromUrl: !!urlToken,
  //   fromHeader: !!headerToken,
  //   finalToken: !!token,
  //   chatId: urlChatId,
  //   isValidChatId: urlChatId ? isValidObjectId(urlChatId) : false
  // });
  
  if (!token) {
    console.error('No token found in either URL parameters or headers');
    ws.close(1008, 'No authentication token provided');
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    extWs.userId = decoded.username;
    
    // Only set chatId if it's a valid ObjectId
    if (urlChatId) {
      if (isValidObjectId(urlChatId)) {
        extWs.chatId = urlChatId;
        // console.log(`WebSocket client connected: ${extWs.userId}, chatId: ${extWs.chatId}`);
      } else {
        console.warn(`Invalid chatId format provided: ${urlChatId}, ignoring it`);
        // Don't set the chatId but allow connection to continue
        // console.log(`WebSocket client connected: ${extWs.userId}, no valid chatId provided`);
      }
    } else {
      // console.log(`WebSocket client connected: ${extWs.userId}, no chatId provided`);
    }
  } catch (error) {
    console.error('Invalid token in WebSocket connection:', error);
    ws.close(1008, 'Invalid authentication token');
    return;
  }

  extWs.on('pong', heartbeat);

  extWs.on('error', (error) => {
    console.error(`WebSocket error for user ${extWs.userId}:`, error);
  });

  extWs.on('close', () => {
    // console.log(`WebSocket client disconnected: ${extWs.userId}`);
  });

  extWs.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      const userId = extWs.userId;

      // Handle message_edited request specifically
      if (data.type === 'message_edited') {
        console.log(`User ${userId} edited message in chat ${data.chatId}`);
        
        // Broadcast to other clients of same user
        wss.clients.forEach((client: WebSocket) => {
          const extClient = client as ExtendedWebSocket;
          if (extClient.userId === extWs.userId && extClient !== extWs) {
            extClient.send(JSON.stringify({
              type: 'message_edited',
              chatId: data.chatId,
              messageId: data.messageId,
              content: data.content
            }));
          }
        });
        
        return;
      }

      // Handle cancel request specifically
      if (data.type === 'cancel') {
        console.log(`User ${userId} cancelled generation for chat ${data.chatId}`);
        // The frontend will handle UI updates
        return;
      }

      // Check user limits before processing
      const hasRemaining = await usageService.checkUserLimit(userId!);
      if (!hasRemaining) {
        extWs.send(JSON.stringify({
          type: 'error',
          error: 'You have used all your quota for today. Please wait until tomorrow.'
        }));
        return;
      }
      
      const { messages, modelId, isImageGeneration, path, chatId, type } = data;

      if (!messages || !Array.isArray(messages)) {
        throw new Error('Invalid messages format');
      }

      if (!modelId) {
        throw new Error('ModelId is required');
      }

      // Check if this is a regenerate request
      const isRegenerate = type === 'regenerate';
      
      // Handle chat updates and message processing
      let savedChat;
      let currentChatId: string;
      try {
        // Check if any files were sent with the message
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.files && lastMessage.files.length > 0) {
          console.log(`User ${userId} sent ${lastMessage.files.length} files with their message`);
          
          // ตรวจสอบข้อมูลของไฟล์
          lastMessage.files.forEach((file: any, index: number) => {
            console.log(`File ${index + 1}:`, {
              name: file.name,
              type: file.mediaType,
              size: file.size,
              hasData: !!file.data
            });
          });
        }
        
        if (!chatId) {
          savedChat = await chatService.saveChat(extWs.userId!, modelId, messages);
          currentChatId = savedChat._id.toString();
          
          // Send chatId immediately after creation
          if (extWs.readyState === WebSocket.OPEN) {
            extWs.send(JSON.stringify({ 
              type: 'chat_created',
              chatId: currentChatId
            }));
          }
        } else {
          savedChat = await chatService.updateChat(chatId, extWs.userId!, messages);
          currentChatId = chatId;
        }

        // Get query from last message
        const query = isImageGeneration
          ? messages[messages.length - 1].content
          : messages.map(msg => msg.content).join('\n');

        // Generate response and send chunks
        let assistantResponse = '';
        let isCancelled = false;
        
        // Setup a listener for cancel messages while we're generating
        const cancelListener = (cancelMsg: string) => {
          try {
            const cancelData = JSON.parse(cancelMsg.toString());
            if (cancelData.type === 'cancel' && cancelData.chatId === currentChatId) {
              console.log(`Cancellation received during generation for chat ${currentChatId}`);
              isCancelled = true;
            }
          } catch (error) {
            console.error('Error parsing cancel message:', error);
          }
        };
        
        // Add temporary listener for this generation
        extWs.on('message', cancelListener);
        
        // Generate the response
        try {
          for await (const content of chatService.generateResponse(messages, query, modelId, extWs.userId!)) {
            // Check if the generation has been cancelled
            if (isCancelled) {
              console.log(`Breaking out of generation loop due to cancellation for chat ${currentChatId}`);
              break;
            }
            
            assistantResponse += content;
            if (extWs.readyState === WebSocket.OPEN) {
              extWs.send(JSON.stringify({ 
                type: 'content',
                content
              }));
            } else {
              break;
            }
          }
        } finally {
          // Always remove the listener when done
          extWs.removeListener('message', cancelListener);
        }

        // If generation was cancelled, we don't need to send completion
        if (isCancelled) {
          console.log(`Generation was cancelled for chat ${currentChatId}, not sending completion`);
          return;
        }

        // Send completion signal
        if (extWs.readyState === WebSocket.OPEN) {
          const allMessages = [...messages];
          allMessages.push({
            id: messages.length + 1,
            role: 'assistant',
            content: assistantResponse,
            timestamp: new Date(),
            sources: [],
            isImageGeneration: isImageGeneration || false,
            isComplete: true
          });

          // Update chat with final messages
          try {
            const finalChat = await chatService.updateChat(
              currentChatId,
              extWs.userId!,
              allMessages
            );

            extWs.send(JSON.stringify({ 
              type: 'complete',
              chatId: currentChatId,
              shouldUpdateList: true,
              timestamp: new Date().toISOString()
            }));

            // Broadcast to other clients of same user
            wss.clients.forEach((client: WebSocket) => {
              const extClient = client as ExtendedWebSocket;
              if (extClient.userId === extWs.userId && extClient !== extWs) {
                extClient.send(JSON.stringify({
                  type: 'chat_updated',
                  shouldUpdateList: true,
                  timestamp: new Date().toISOString()
                }));
              }
            });
          } catch (error) {
            console.error('Error saving final chat:', error);
            extWs.send(JSON.stringify({ 
              type: 'error',
              error: 'Failed to save chat history' 
            }));
          }
        }
      } catch (error) {
        console.error(`Error generating response:`, error);
        if (extWs.readyState === WebSocket.OPEN) {
          extWs.send(JSON.stringify({ 
            type: 'error',
            error: 'Error generating response' 
          }));
        }
      }
    } catch (error) {
      console.error(`Error processing message:`, error);
      if (extWs.readyState === WebSocket.OPEN) {
        extWs.send(JSON.stringify({ 
          type: 'error',
          error: error instanceof Error ? error.message : 'Invalid message format' 
        }));
      }
    }
  });
});

router.post('/', async (req: Request, res: Response) => {
  // console.log('Received chat request');

  // 1. ส่ง headers ทันทีก่อนทำอย่างอื่น
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 2. ส่ง initial response เพื่อเริ่ม stream
  res.write(':\n\n');  // Keep-alive ping
  // console.log('Sent initial response');

  try {
    const { messages, modelId, collectionName } = req.body;
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // 3. ฟังก์ชันสำหรับส่งข้อมูล
    const sendChunk = (content: string) => {
      const data = JSON.stringify({ content });
      res.write(`data: ${data}\n\n`);
    };

    // 4. ส่ง empty chunk เพื่อให้ frontend เริ่มอ่าน stream
    sendChunk('');
    
    // console.log('Starting response generation');
    // console.log('Starting generateResponse:', {
    //   modelId,
    //   collectionName,
    //   messagesCount: messages.length,
    //   query
    // });
    try {
      for await (const content of chatService.generateResponse(messages, query, modelId, collectionName)) {
        // console.log('Sending chunk:', content);
        sendChunk(content);
      }
    } catch (error) {
      console.error('Error in stream generation:', error);
      sendChunk('\nSorry, an error occurred. Please try again.');
    }

    // console.log('Chat response completed');
    res.end();
  } catch (error) {
    console.error('Chat error details:', error);
    
    // ถ้ายังไม่ได้ส่ง headers
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }
    
    const errorData = JSON.stringify({ content: 'Sorry, an error occurred. Please try again.' });
    res.write(`data: ${errorData}\n\n`);
    res.end();
  }
});

router.post('/history', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, modelId } = req.body;
    const userId = (req.user as any)?.username || '';

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid messages format' });
      return;
    }

    if (!modelId) {
      res.status(400).json({ error: 'ModelId is required' });
      return;
    }

    const chat = await chatService.saveChat(userId, modelId, messages);
    res.json(chat);
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ error: 'Failed to save chat' });
  }
});

router.get('/chats', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.username;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const chats = await chatService.getChats(userId, page, limit);
    res.json(chats);
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get chats' 
    });
  }
});

router.get('/chats/:chatId', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.username;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { chatId } = req.params;
    const chat = await chatService.getChat(userId, chatId);
    res.json(chat);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid chat ID format') {
        res.status(400).json({ error: 'Invalid chat ID format. Chat ID must be a 24-character hex string.' });
        return;
      }
      if (error.message === 'Chat not found') {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }
    }
    console.error('Error getting chat:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get chat' 
    });
  }
});

// Update chat
router.put('/history/:chatId', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.username;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { chatId } = req.params;
    const { messages } = req.body;
    
    const updatedChat = await chatService.updateChat(chatId, userId, messages);
    res.json(updatedChat);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid chat ID format') {
        res.status(400).json({ error: 'Invalid chat ID format. Chat ID must be a 24-character hex string.' });
        return;
      }
      if (error.message === 'Chat not found') {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }
    }
    console.error('Error updating chat:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update chat' 
    });
  }
});

// Delete specific chat
router.delete('/history/:chatId', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.username;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { chatId } = req.params;
    await chatService.deleteChat(chatId, userId);
    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid chat ID format') {
        res.status(400).json({ error: 'Invalid chat ID format. Chat ID must be a 24-character hex string.' });
        return;
      }
      if (error.message === 'Chat not found or unauthorized') {
        res.status(404).json({ error: 'Chat not found or you are not authorized to delete it' });
        return;
      }
    }
    console.error('Error deleting chat:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete chat' 
    });
  }
});

// Export chat
router.get('/history/:chatId/export', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.username;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { chatId } = req.params;
    const chat = await chatService.getChat(userId, chatId);
    res.json(chat);
  } catch (error) {
    if (error instanceof Error && error.message === 'Chat not found') {
      res.status(404).json({ error: 'Chat not found' });
    } else {
      console.error('Error exporting chat:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to export chat' 
      });
    }
  }
});

// Import chat
router.post('/history/import', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.username || '';
    const { messages } = req.body;
    
    const importedChat = await chatService.saveChat(userId, 'default', messages);
    res.json(importedChat);
  } catch (error) {
    console.error('Error importing chat:', error);
    res.status(500).json({ error: 'Failed to import chat' });
  }
});

router.route('/clear').delete(async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !user.username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    await Chat.deleteMany({ userId: user.username });
    res.json({ success: true, message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { messages, modelId } = req.body;
    const text = messages[messages.length - 1].content;
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/collections', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // ดึงข้อมูล collections จาก MongoDB
    const collections = await CollectionModel.find({});
    
    // Admin can access all collections
    if (user.groups.includes('Admin') || user.groups.includes('SuperAdmin')) {
      res.json(collections.map(c => c.name));
      return;
    }
    
    // กรองตามสิทธิ์
    const accessibleCollections = collections.filter(collection => {
      switch (collection.permission) {
        case CollectionPermission.PUBLIC:
          return true;
        case CollectionPermission.PRIVATE:
          return collection.createdBy === user.nameID;
        default:
          return false;
      }
    });

    // ส่งเฉพาะชื่อ collection ที่มีสิทธิ์
    res.json(accessibleCollections.map(c => c.name));
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// async function checkCollectionAccess(user: any, collection: any): Promise<boolean> {
//   return user.groups.includes('Admin') || 
//          user.groups.includes('Staffs') || 
//          collection.createdBy === (user.nameID || user.username);
// }

// Add validation middleware
const validateRenameChat = [
  body('newName')
    .trim()
    .notEmpty().withMessage('Chat name cannot be empty')
    .isLength({ max: 100 }).withMessage('Chat name too long (max 100 characters)')
    .matches(/^[^<>]*$/).withMessage('Chat name contains invalid characters'),
];

// Update rename endpoint
router.put('/history/:chatId/rename', 
  roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']),
  validateRenameChat,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userId = (req.user as any)?.username;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { chatId } = req.params;
      const { newName } = req.body;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        res.status(400).json({ error: 'Invalid chat ID format' });
        return;
      }

      // Get chat and verify ownership
      const chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        res.status(404).json({ error: 'Chat not found or unauthorized' });
        return;
      }

      // Update chat name
      chat.chatname = newName.trim();
      chat.updatedAt = new Date();
      await chat.save();

      // Log the change
      // console.log(`Chat ${chatId} renamed to "${newName}" by user ${userId}`);

      res.json({
        success: true,
        chat: {
          id: chat._id,
          chatname: chat.chatname,
          updatedAt: chat.updatedAt
        }
      });

    } catch (error) {
      console.error('Error renaming chat:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to rename chat' 
      });
    }
});

router.put('/history/:chatId/pin', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.username;
    const chatId = req.params.chatId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Verify chat exists and belongs to user
    const chat = await chatService.getChat(userId, chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    // Toggle isPinned status
    const updatedChat = await chatService.togglePinChat(userId, chatId);
    res.json(updatedChat);
  } catch (error) {
    console.error('Error toggling chat pin status:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to toggle chat pin status' 
    });
  }
});

// เพิ่ม endpoint สำหรับดูข้อมูลการใช้งาน
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.username;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const usage = await usageService.getUserUsage(userId);
    res.json(usage);
  } catch (error) {
    console.error('Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage information' });
  }
});

// ตั้งค่า multer สำหรับรับไฟล์
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// endpoint สำหรับแปลงไฟล์
router.post('/parse-file', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.file;
    const text = await fileParserService.parseFile(file as Express.Multer.File);
    
    res.json({ text });
  } catch (error) {
    console.error('Error parsing file:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to parse file' 
    });
  }
});

// Add API endpoint for editing message
router.post('/edit-message', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    // ข้อมูลพื้นฐาน
    const { chatId, messageId, content, role, isEdited } = req.body;
    const userId = (req.user as any)?.username || '';

    // ลอกข้อมูลเพื่อตรวจสอบ
    console.log('Edit request:', { 
      chatId, 
      messageId,
      role,
      isEdited,
      contentLength: content?.length 
    });

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      res.status(400).json({ error: 'Invalid chat ID' });
      return;
    }

    if (!messageId) {
      res.status(400).json({ error: 'Message ID is required' });
      return;
    }

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // ค้นหา chat
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      res.status(404).json({ error: 'Chat not found or unauthorized' });
      return;
    }

    // ค้นหาข้อความที่ต้องการแก้ไข
    const messageIdStr = String(messageId);
    const messageIndex = chat.messages.findIndex(m => String(m.id) === messageIdStr);
    
    console.log('Message search:', { 
      messageIdStr, 
      messageIndex,
      messageIds: chat.messages.slice(0, 5).map(m => ({ 
        id: m.id, 
        idType: typeof m.id,
        idString: String(m.id) 
      }))
    });
    
    if (messageIndex === -1) {
      // ถ้าไม่พบข้อความ ให้ตรวจสอบลักษณะของ messages array
      const messagesInfo = {
        totalMessages: chat.messages.length,
        firstFew: chat.messages.slice(0, 3).map(m => ({
          id: m.id,
          idType: typeof m.id,
          role: m.role,
          contentPreview: m.content?.substring(0, 20)
        }))
      };
      
      console.error('Message not found:', {
        requestedId: messageId,
        requestedIdType: typeof messageId,
        messagesInfo
      });
      
      res.status(404).json({ 
        error: 'Message not found',
        details: {
          messageId,
          availableIds: chat.messages.slice(0, 5).map(m => String(m.id))
        }
      });
      return;
    }

    // แก้ไขข้อความอย่างง่าย
    chat.messages[messageIndex].content = content;
    
    // เพิ่ม flag isEdited เฉพาะสำหรับข้อความ assistant
    // หมายเหตุ: ข้อความ user ที่แก้ไขจะทำงานเป็น resubmit ในฝั่ง client แล้ว
    if (role === 'assistant' && isEdited) {
      try {
        chat.messages[messageIndex].set('isEdited', true);
      } catch (error) {
        console.log('Cannot set isEdited directly, ignoring this field');
      }
    }

    // บันทึกการเปลี่ยนแปลง
    await chat.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// เพิ่มข้อความลงในการสนทนา - สำหรับการส่งข้อความใหม่หลังจากแก้ไข (resubmit)
router.post('/history/:chatId/messages', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = (req.user as any)?.username || '';

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      res.status(400).json({ error: 'Invalid chat ID' });
      return;
    }

    if (!message || !message.content || !message.role) {
      res.status(400).json({ error: 'Message content and role are required' });
      return;
    }

    // ค้นหา chat
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      res.status(404).json({ error: 'Chat not found or unauthorized' });
      return;
    }

    // สร้างข้อความที่จะเพิ่ม
    const newMessage = {
      id: message.id || Date.now(),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || { $date: new Date().toISOString() }
    };
    
    // เพิ่มไฟล์แนบถ้ามี
    if (message.files && Array.isArray(message.files) && message.files.length > 0) {
      console.log(`Adding ${message.files.length} files to the message`);
      
      // แสดงข้อมูลไฟล์
      message.files.forEach((file: any, index: number) => {
        console.log(`File ${index + 1} details:`, {
          name: file.name,
          mediaType: file.mediaType,
          size: file.size,
          dataLength: file.data ? file.data.length : 0
        });
      });
      
      (newMessage as any).files = message.files;
    }

    // เพิ่มข้อความลงในการสนทนา
    chat.messages.push(newMessage);

    // บันทึกการเปลี่ยนแปลง
    await chat.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router;
