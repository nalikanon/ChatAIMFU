import { create } from 'zustand';

export interface UIState {
  isLoading: boolean;
  isMobile: boolean;
  isImageGenerationMode: boolean;
  inputMessage: string;
  awaitingChatId: boolean;
  
  // Actions
  setIsLoading: (isLoading: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsImageGenerationMode: (mode: boolean) => void;
  setInputMessage: (message: string) => void;
  setAwaitingChatId: (awaiting: boolean) => void;
  
  // Derived actions
  initMobileDetection: () => void;
}

export const useUIStore = create<UIState>((set, _get) => ({
  // State
  isLoading: false,
  isMobile: false,
  isImageGenerationMode: false,
  inputMessage: '',
  awaitingChatId: false,
  
  // Actions
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setIsImageGenerationMode: (mode) => set({ isImageGenerationMode: mode }),
  setInputMessage: (message) => set({ inputMessage: message }),
  setAwaitingChatId: (awaiting) => set({ awaitingChatId: awaiting }),
  
  // ตรวจสอบขนาดหน้าจอ
  initMobileDetection: () => {
    const checkIfMobile = () => {
      set({ isMobile: window.innerWidth < 768 });
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }
})); 