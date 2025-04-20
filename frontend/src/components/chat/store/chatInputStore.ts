import { create } from 'zustand';
import { Message, MessageFile } from '../utils/types';
import { useChatStore } from './chatStore';
import { config } from '../../../config/config';

interface ChatInputState {
  // State
  inputMessage: string;
  selectedImageFiles: File[];
  selectedDocFiles: File[];
  existingImageFiles: MessageFile[];
  existingDocFiles: MessageFile[];
  isProcessingFiles: boolean;
  isEditing: boolean;
  editingMessage: Message | null;
  
  // Actions
  setInputMessage: (message: string) => void;
  setSelectedImageFiles: (files: File[] | ((prev: File[]) => File[])) => void;
  setSelectedDocFiles: (files: File[] | ((prev: File[]) => File[])) => void;
  setExistingImageFiles: (files: MessageFile[] | ((prev: MessageFile[]) => MessageFile[])) => void;
  setExistingDocFiles: (files: MessageFile[] | ((prev: MessageFile[]) => MessageFile[])) => void;
  setIsProcessingFiles: (value: boolean) => void;
  setIsEditing: (value: boolean) => void;
  setEditingMessage: (message: Message | null) => void;
  
  // File handling
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveSelectedImage: (index: number) => void;
  handleRemoveSelectedDoc: (index: number) => void;
  handleRemoveExistingImage: (index: number) => void;
  handleRemoveExistingDoc: (index: number) => void;
  
  // Editing
  handleStartEdit: (message: Message) => void;
  handleSaveEdit: (message: Message, onEditClick?: (message: Message) => void) => Promise<void>;
  handleCancelEdit: () => void;
  
  // Utility
  resetFileSelections: () => void;
}

export const useChatInputStore = create<ChatInputState>((set, get) => ({
  // Initial state
  inputMessage: '',
  selectedImageFiles: [],
  selectedDocFiles: [],
  existingImageFiles: [],
  existingDocFiles: [],
  isProcessingFiles: false,
  isEditing: false,
  editingMessage: null,
  
  // Basic state setters
  setInputMessage: (message) => set({ inputMessage: message }),
  setSelectedImageFiles: (filesOrFn) => {
    if (typeof filesOrFn === 'function') {
      set((state) => ({ selectedImageFiles: filesOrFn(state.selectedImageFiles) }));
    } else {
      set({ selectedImageFiles: filesOrFn });
    }
  },
  setSelectedDocFiles: (filesOrFn) => {
    if (typeof filesOrFn === 'function') {
      set((state) => ({ selectedDocFiles: filesOrFn(state.selectedDocFiles) }));
    } else {
      set({ selectedDocFiles: filesOrFn });
    }
  },
  setExistingImageFiles: (filesOrFn) => {
    if (typeof filesOrFn === 'function') {
      set((state) => ({ existingImageFiles: filesOrFn(state.existingImageFiles) }));
    } else {
      set({ existingImageFiles: filesOrFn });
    }
  },
  setExistingDocFiles: (filesOrFn) => {
    if (typeof filesOrFn === 'function') {
      set((state) => ({ existingDocFiles: filesOrFn(state.existingDocFiles) }));
    } else {
      set({ existingDocFiles: filesOrFn });
    }
  },
  setIsProcessingFiles: (value) => set({ isProcessingFiles: value }),
  setIsEditing: (value) => set({ isEditing: value }),
  setEditingMessage: (message) => set({ editingMessage: message }),
  
  // File handling
  handleFileSelect: (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // แยกไฟล์ตามประเภท
    const newImageFiles: File[] = [];
    const newDocFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        newImageFiles.push(file);
      } else {
        newDocFiles.push(file);
      }
    });
    
    set((state) => ({
      selectedImageFiles: [...state.selectedImageFiles, ...newImageFiles],
      selectedDocFiles: [...state.selectedDocFiles, ...newDocFiles]
    }));
  },
  
  handleRemoveSelectedImage: (index) => {
    set((state) => ({
      selectedImageFiles: state.selectedImageFiles.filter((_, i) => i !== index)
    }));
  },
  
  handleRemoveSelectedDoc: (index) => {
    set((state) => ({
      selectedDocFiles: state.selectedDocFiles.filter((_, i) => i !== index)
    }));
  },
  
  handleRemoveExistingImage: (index) => {
    set((state) => ({
      existingImageFiles: state.existingImageFiles.filter((_, i) => i !== index)
    }));
  },
  
  handleRemoveExistingDoc: (index) => {
    set((state) => ({
      existingDocFiles: state.existingDocFiles.filter((_, i) => i !== index)
    }));
  },
  
  // Editing
  handleStartEdit: (message) => {
    set({
      isEditing: true,
      editingMessage: message,
      inputMessage: message.content,
      // ไม่ดึงข้อมูลไฟล์จาก message เดิมมาใช้ แต่ให้ user อัพโหลดใหม่
      existingImageFiles: [],
      existingDocFiles: []
    });
  },
  
  handleSaveEdit: async (message, onEditClick) => {
    const { inputMessage, selectedImageFiles, selectedDocFiles, existingImageFiles, existingDocFiles } = get();
    
    if (!inputMessage && !selectedImageFiles.length && !selectedDocFiles.length && !existingImageFiles.length && !existingDocFiles.length) {
      // ถ้าไม่มีข้อความหรือไฟล์ที่จะบันทึก ให้ยกเลิกการแก้ไข
      set({ isEditing: false });
      return;
    }
    
    // เริ่มประมวลผลไฟล์
    set({ isProcessingFiles: true });
    
    try {
      // อัปโหลดไฟล์ภาพใหม่
      const imageReadPromises: Promise<{ name: string; data: string; mediaType: string; size: number }>[] = 
        selectedImageFiles.map(file => {
          return new Promise<{ name: string; data: string; mediaType: string; size: number }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target && e.target.result) {
                const base64 = e.target.result.toString().split(',')[1];
                resolve({
                  name: file.name,
                  data: base64,
                  mediaType: file.type,
                  size: file.size
                });
              }
            };
            reader.readAsDataURL(file);
          });
        });

      // อัปโหลดไฟล์เอกสารใหม่
      const docReadPromises: Promise<{ name: string; data: string; mediaType: string; size: number }>[] = 
        selectedDocFiles.map(file => {
          return new Promise<{ name: string; data: string; mediaType: string; size: number }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target && e.target.result) {
                const base64 = e.target.result.toString().split(',')[1];
                resolve({
                  name: file.name,
                  data: base64,
                  mediaType: file.type,
                  size: file.size
                });
              }
            };
            reader.readAsDataURL(file);
          });
        });

      // รอให้อัปโหลดไฟล์ทั้งหมดเสร็จแล้วบันทึก
      const [newImageFiles, newDocFiles] = await Promise.all([
        Promise.all(imageReadPromises),
        Promise.all(docReadPromises)
      ]);
      
      // รวมไฟล์ภาพทั้งหมด (ตาม schema)
      const allImages = existingImageFiles.map(file => ({
        data: file.data,
        mediaType: file.mediaType
      })).concat(newImageFiles.map(file => ({
        data: file.data,
        mediaType: file.mediaType
      })));
      
      // รวมไฟล์เอกสารทั้งหมด
      const allFiles = [...existingDocFiles, ...newDocFiles];
      
      const chatStore = useChatStore.getState();
      
      // แยกการทำงานระหว่าง User และ Assistant
      if (message.role === 'user') {
        // สำหรับข้อความของ User: ทำงานแบบ resubmit
        
        // เตรียมข้อความที่จะแก้ไข (เพื่อ resubmit)
        const editedMessage = {
          ...message,
          content: inputMessage,
          images: allImages.length > 0 ? allImages : undefined,
          files: allFiles.length > 0 ? allFiles : undefined,
          isEdited: true  // เพิ่มการระบุว่าเป็นข้อความที่แก้ไขแล้ว
        };
        
        //console.log('[chatInputStore] แก้ไขข้อความ User:', editedMessage);
        
        // ตั้งค่าข้อความที่แก้ไขใน chatStore เพื่อให้ handleSubmit รับไปดำเนินการต่อ
        chatStore.setEditingMessage(editedMessage);
        
        // สร้าง synthetic event เพื่อส่งให้ handleSubmit
        const event = {
          preventDefault: () => {}
        } as React.FormEvent;
        
        // ส่งข้อความที่แก้ไขแล้ว (resubmit)
        await chatStore.handleSubmit(event);
      } else if (message.role === 'assistant') {
        // สำหรับข้อความของ Assistant: เพียงอัพเดทข้อความในฐานข้อมูล
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // สร้างข้อความที่แก้ไขแล้ว
        const editedMessage = {
          ...message,
          content: inputMessage,
          isEdited: true
        };
        
        //console.log('[chatInputStore] กำลังแก้ไขข้อความ Assistant:', editedMessage);
        
        // อัพเดทข้อความใน state
        chatStore.setMessages(prev => {
          const newMessages = prev.map(msg => msg.id === message.id ? editedMessage : msg);
          //console.log('[chatInputStore] อัพเดทข้อความใน UI สำเร็จ', newMessages);
          return newMessages;
        });
        
        // เรียกใช้ callback onEditClick ถ้ามีทันทีหลังอัพเดท state
        if (onEditClick) {
          //console.log('[chatInputStore] เรียกใช้ onEditClick callback');
          onEditClick(editedMessage);
        }
        
        // ส่งคำขอไปยัง API เพื่ออัพเดทข้อความในฐานข้อมูล
        const wsRef = chatStore.wsRef;
        const chatId = chatStore.currentChatId;
        
        if (wsRef && chatId) {
          // ส่งคำสั่งแก้ไขข้อความผ่าน WebSocket
          wsRef.send(JSON.stringify({
            type: 'message_edited',
            chatId: chatId,
            messageId: message.id,
            content: inputMessage
          }));
        }
        
        // ส่ง API request โดยตรงเพื่อบันทึกลงฐานข้อมูล
        if (chatId) {
          fetch(`${config.apiUrl}/api/chat/edit-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              chatId: chatId,
              messageId: message.id,
              content: inputMessage,
              role: 'assistant',
              isEdited: true
            })
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to edit message: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('[chatInputStore] Save edited message success:', data);
          })
          .catch(error => {
            console.error('[chatInputStore] Error saving edited message:', error);
          });
        }
      }
      
      // รีเซ็ตสถานะหลังจากการบันทึก
      get().resetFileSelections();
      set({
        isEditing: false,
        inputMessage: '',
        editingMessage: null,
        isProcessingFiles: false
      });
    } catch (error) {
      //console.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์:', error);
      set({ isProcessingFiles: false });
    }
  },
  
  handleCancelEdit: () => {
    get().resetFileSelections();
    set({
      isEditing: false,
      inputMessage: '',
      editingMessage: null
    });
  },
  
  resetFileSelections: () => {
    set({
      selectedImageFiles: [],
      selectedDocFiles: [],
      existingImageFiles: [],
      existingDocFiles: []
    });
  }
})); 