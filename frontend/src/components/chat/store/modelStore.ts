import { create } from 'zustand';
import { config } from '../../../config/config';
import { Model, Usage } from '../utils/types';

export interface ModelState {
  // State
  models: Model[];
  selectedModel: string;
  usage: Usage | null;
  
  // Actions
  setModels: (models: Model[]) => void;
  setSelectedModel: (modelId: string) => void;
  setUsage: (usage: Usage | null) => void;
  updateTokenUsage: (tokensUsed: number) => void;
  
  // Thunks
  fetchModels: () => Promise<void>;
  fetchUsage: () => Promise<void>;
}

export const useModelStore = create<ModelState>((set, get) => ({
  // State
  models: [],
  selectedModel: '',
  usage: null,
  
  // Actions
  setModels: (models) => set({ models }),
  setSelectedModel: (modelId) => set({ selectedModel: modelId }),
  setUsage: (usage) => set({ usage }),
  updateTokenUsage: (tokensUsed) => {
    const currentUsage = get().usage;
    if (currentUsage) {
      set({
        usage: {
          ...currentUsage,
          dailyTokens: currentUsage.dailyTokens + tokensUsed,
          remainingTokens: Math.max(0, currentUsage.remainingTokens - tokensUsed)
        }
      });
    }
  },
  
  // Thunks
  fetchModels: async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      // Validate token format
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        return;
      }

      // Fetch models from API
      const response = await fetch(`${config.apiUrl}/api/models`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch models:', response.status, errorText);
        
        if (response.status === 401) {
          // Handle unauthorized error
          // อาจจะต้องเพิ่ม logout logic หรือ redirect ไปที่หน้า login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        
        return;
      }

      const data = await response.json();
      const allModels: Model[] = data.map((model: any) => ({
        id: model._id,
        name: model.name,
        modelType: model.modelType,
        department: model.department,
        createdBy: model.createdBy
      }));
      
      set({ models: allModels });

      // Set default model if none selected
      if (!get().selectedModel && allModels.length > 0) {
        const defaultModel = allModels.find(model => model.name === 'Default') || allModels[0];
        set({ selectedModel: defaultModel.id });
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  },
  
  fetchUsage: async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${config.apiUrl}/api/chat/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const usageData = await response.json();
        set({ 
          usage: {
            dailyTokens: usageData.dailyTokens,
            tokenLimit: usageData.tokenLimit,
            remainingTokens: usageData.remainingTokens
          }
        });
      } else {
        console.error('Failed to fetch usage data');
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  }
})); 