import React, { useState } from 'react';
import { VscDebugContinue } from "react-icons/vsc";
import { MdEdit, MdRefresh, MdClose, MdContentCopy } from "react-icons/md";
import { RiFileAddFill, RiCloseLine } from 'react-icons/ri';
import { Message, MessageFile } from '../utils/types';
import MessageContent from './MessageContent';
import LoadingDots from './LoadingDots';
import { formatMessageTime } from '../utils/formatters';
import FileIcon from './FileIcon';
import { useChatInputStore } from '../store/chatInputStore';
import { useChatStore } from '../store/chatStore';
import { prepareMessageFiles, compressImage } from '../utils/fileProcessing';

interface ChatBubbleProps {
  message: Message;
  isLastMessage: boolean;
  isLoading: boolean;
  onContinueClick: (e: React.MouseEvent) => void;
  onCancelClick?: (e: React.MouseEvent) => void;
  onEditClick?: (message: Message) => void;
  onRegenerateClick?: (e: React.MouseEvent, index?: number) => void;
  selectedModel: string;
  messageIndex?: number;
  isLastAssistantMessage?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  isLoading, 
  onContinueClick, 
  onEditClick,
  onRegenerateClick,
  selectedModel,
  messageIndex = 0,
  isLastAssistantMessage = false
}) => {
  const [isCopied, setIsCopied] = useState(false);
  
  // ใช้ chatStore สำหรับ attach file
  const chatStore = useChatStore();
  const { 
    selectedImages, 
    selectedFiles, 
    handleFileSelect, 
    handleRemoveImage, 
    handleRemoveFile,
  } = chatStore;

  // Use state from chatInputStore
  const {
    isEditing,
    inputMessage, setInputMessage,
    handleCancelEdit,
  } = useChatInputStore();

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRegenerateClick = (e: React.MouseEvent) => {
    if (onRegenerateClick) {
      onRegenerateClick(e, messageIndex);
    }
  };

  const onStartEdit = () => {
    // รีเซ็ตไฟล์ที่เลือกใน chatStore
    chatStore.setSelectedImages([]);
    chatStore.setSelectedFiles([]);
    
    // เริ่มการแก้ไขใน chatInputStore
    useChatInputStore.getState().handleStartEdit(message);
  };

  const onSaveEdit = () => {
    // console.log('Saving message edit:', message.id);
    
    // Separate logic for user and assistant messages
    if (message.role === 'user') {
      // For user: send a new message as in normal submission
      const chatStore = useChatStore.getState();
      
      // ใช้ข้อมูลจาก chatStore
      const { 
        selectedImages, 
        selectedFiles, 
        wsRef, 
        currentChatId, 
        messages 
      } = chatStore;
      
      // Prepare data for sending a new message
      // ใช้ฟังก์ชันการประมวลผลไฟล์เดียวกับที่ chatStore ใช้
      const processFiles = async () => {
        // จัดการรูปภาพ
        let images: { data: string; mediaType: string }[] = [];
        if (selectedImages.length > 0) {
          // ใช้ compressImage เพื่อบีบอัดรูปภาพก่อนแปลงเป็น base64
          images = await Promise.all(selectedImages.map(async (file) => await compressImage(file)));
        }
        
        // จัดการไฟล์เอกสาร - ใช้ prepareMessageFiles จาก fileProcessing.ts
        let files: MessageFile[] = [];
        if (selectedFiles.length > 0) {
          files = await prepareMessageFiles(selectedFiles);
        }
        
        return { images, files };
      };
      
      // Process all files
      processFiles().then(({ images, files }) => {
        // Create a new user message
        const newUserMessage: Message = {
          id: `new-${Date.now()}`,
          role: 'user',
          content: inputMessage,
          timestamp: { $date: new Date().toISOString() },
          images: images.length > 0 ? images : undefined,
          files: files.length > 0 ? files : undefined
        };
        
        // Create a waiting assistant message
        const newAssistantMessage: Message = {
          id: `new-assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: { $date: new Date().toISOString() },
          modelId: selectedModel,
          isComplete: false
        };
        
        // Add new messages to state
        chatStore.setMessages([...messages, newUserMessage, newAssistantMessage]);
        
        // Send message via WebSocket
        if (wsRef && currentChatId) {
          wsRef.send(JSON.stringify({
            type: 'chat',
            content: inputMessage,
            chatId: currentChatId,
            modelId: selectedModel,
            images: images.length > 0 ? images : undefined,
            files: files.length > 0 ? files : undefined,
            messages: [...messages, newUserMessage],
            path: window.location.pathname
          }));
        }
        
        // Reset state after sending message
        chatStore.setSelectedImages([]);
        chatStore.setSelectedFiles([]);
        useChatInputStore.setState({
          isEditing: false,
          inputMessage: '',
          editingMessage: null
        });
      })
      .catch(error => {
        console.error('Error processing files:', error);
      });
    } else {
      // For assistant: use the chatInputStore's handleSaveEdit function
      const updatedMessage: Message = {
        ...message,
        content: inputMessage
      };
      
      // ใช้ function handleSaveEdit จาก chatInputStore
      useChatInputStore.getState().handleSaveEdit(updatedMessage, onEditClick);
    }
  };

  // Separate Canvas for User and Assistant
  const renderEditCanvas = () => {
    if (message.role === 'user') {
      return renderUserEditCanvas();
    } else if (message.role === 'assistant') {
      return renderAssistantEditCanvas();
    }
    return null;
  };

  // Canvas for editing User message (with file upload)
  const renderUserEditCanvas = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resubmit Message
            </h3>
            <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <MdClose className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-4 flex-grow overflow-auto">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="w-full h-full min-h-[200px] p-3 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="Edit your message..."
            />
          </div>

          {/* File upload section */}
          <div className="px-4 pb-2">
            <input
              type="file"
              id="chatbubble-file-upload"
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ppt,.pptx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              type="button"
              className="px-3 py-1.5 flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              onClick={() => {
                document.getElementById('chatbubble-file-upload')?.click();
              }}
            >
              <RiFileAddFill className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Attach File</span>
            </button>
            
            {/* คำแนะนำสำหรับผู้ใช้ */}
            <div className="text-xs text-gray-500 dark:text-gray-400 px-4 py-1">
              * You must upload all new files you want to attach (old files will not be used)
            </div>
          </div>
          
          {/* Combined Attached Files Preview */}
          {(selectedImages.length > 0 || selectedFiles.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-2 px-4 pb-2">
              <div className="w-full text-xs text-gray-500 dark:text-gray-400 mb-1">
                Attached Files ({selectedImages.length + selectedFiles.length})
              </div>
              
              {/* Image previews */}
              {selectedImages.map((image, index) => (
                <div key={`img-${index}`} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    <RiCloseLine />
                  </button>
                </div>
              ))}
              
              {/* Document previews */}
              {selectedFiles.map((file, index) => (
                <div key={`doc-${index}`} className="relative">
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <FileIcon fileName={file.name} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 rounded-b-lg">
                    <div className="px-1 py-0.5 text-white text-[8px] truncate">
                      {file.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    <RiCloseLine />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Canvas for editing Assistant message (no file upload allowed)
  const renderAssistantEditCanvas = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Assistant Message
            </h3>
            <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <MdClose className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-4 flex-grow overflow-auto">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="w-full h-full min-h-[300px] p-3 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="Edit assistant message..."
            />
          </div>
          
          {/* Display existing files (read-only) */}
          {message.files && message.files.length > 0 && (
            <div className="px-4 pb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments:</h4>
              <div className="flex flex-wrap gap-2">
                {message.files.map((file, index) => (
                  <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                    <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Save Edit
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="message relative">
      {isEditing && message.id === useChatInputStore.getState().editingMessage?.id && renderEditCanvas()}

      <div className={`flex items-start gap-3 ${
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      }`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden ${
          message.role === 'user'
            ? 'bg-gradient-to-r from-red-600 to-yellow-400'
            : 'bg-transparent'
        } flex items-center justify-center`}>
          {message.role === 'user' ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : (
            <img
              src="/dindin.PNG"
              alt="AI Assistant"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className={`flex flex-col space-y-2 max-w-[80%] ${
          message.role === 'user' ? 'items-end' : 'items-start'
        }`}>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatMessageTime(message.timestamp)}
          </div>
          <div className={`rounded-lg p-3 ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
          }`}>
            {message.role === 'assistant' && message.content === '' && isLoading ? (
              <LoadingDots />
            ) : (
              <MessageContent message={message} />
            )}
          </div>
        </div>
      </div>

      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
        <div className="ml-11 mt-1">
          <button
            onClick={() => {
              const sourceInfo = message.sources?.map(source =>
                `Model: ${source.modelId}\n` +
                `Collection: ${source.collectionName}\n` +
                `File: ${source.filename}\n` +
                `Source: ${source.source || 'N/A'}\n` +
                `Similarity: ${(source.similarity * 100).toFixed(1)}%`
              ).join('\n\n');
              alert(sourceInfo);
            }}
            className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Sources ({message.sources.length})
          </button>
        </div>
      )}

      {/* Action buttons for assistant messages */}
      {message.role === 'assistant' && message.isComplete && (
        <div className="ml-11 mt-2 flex flex-wrap gap-2">
          {/* Continue button - shown for the latest assistant message */}
          {isLastAssistantMessage && (
            <button
              type="button"
              onClick={onContinueClick}
              className={`p-2 rounded-md transition-colors ${
                selectedModel 
                  ? 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400' 
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              disabled={!selectedModel}
              title="Continue"
              data-verify="false"
            >
              <VscDebugContinue className="h-5 w-5" />
            </button>
          )}
          
          {/* Regenerate button - for all assistant messages */}
          {onRegenerateClick && (
            <button
              type="button"
              onClick={handleRegenerateClick}
              className={`p-2 rounded-md transition-colors ${
                selectedModel 
                  ? 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400' 
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              disabled={!selectedModel}
              title={isLastAssistantMessage ? "Regenerate response" : "Clear newer history and regenerate response"}
            >
              <MdRefresh className="h-5 w-5" />
            </button>
          )}
          
          {/* Copy to clipboard button */}
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="p-2 rounded-md transition-colors text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            title={isCopied ? "Copied!" : "Copy to clipboard"}
          >
            <MdContentCopy className="h-5 w-5" />
          </button>
          
          {/* Edit button */}
          <button
            type="button"
            onClick={onStartEdit}
            className="p-2 rounded-md transition-colors text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            title="Edit message"
          >
            <MdEdit className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Action buttons for user messages */}
      {message.role === 'user' && (
        <div className={`${message.role === 'user' ? 'mr-11' : 'ml-11'} mt-2 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="p-2 rounded-md transition-colors text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            title={isCopied ? "Copied!" : "Copy to clipboard"}
          >
            <MdContentCopy className="h-5 w-5" />
          </button>
          
          {/* Edit button - for all user messages */}
          {onEditClick && (
            <button
              type="button"
              onClick={onStartEdit}
              className="p-2 rounded-md transition-colors text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              title="Edit message"
            >
              <MdEdit className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubble; 