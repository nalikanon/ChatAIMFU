import { create } from 'zustand';
import { config } from '../../../config/config';
import { Collection, Model } from '../utils/types';
import { jwtDecode } from 'jwt-decode';

interface ModelState {
  // Model state
  models: Model[];
  isLoading: boolean;
  isModelsLoading: boolean;
  isDeleting: string | null;
  
  // Collections modal state
  availableCollections: Collection[];
  selectedCollections: string[];
  isCollectionsLoading: boolean;
  isSavingCollections: boolean;
  editingModel: Model | null;
  searchQuery: string;
  
  // New model modal state
  showNewModelModal: boolean;
  newModelName: string;
  newModelType: 'official' | 'personal' | 'department';
  departmentName: string;
  isCreating: boolean;
  
  // Actions
  setModels: (models: Model[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsModelsLoading: (isLoading: boolean) => void;
  setIsDeleting: (modelId: string | null) => void;
  
  setAvailableCollections: (collections: Collection[]) => void;
  setSelectedCollections: (collections: string[]) => void;
  setIsCollectionsLoading: (isLoading: boolean) => void;
  setIsSavingCollections: (isSaving: boolean) => void;
  setEditingModel: (model: Model | null) => void;
  setSearchQuery: (query: string) => void;
  
  setShowNewModelModal: (show: boolean) => void;
  setNewModelName: (name: string) => void;
  setNewModelType: (type: 'official' | 'personal' | 'department') => void;
  setDepartmentName: (name: string) => void;
  setIsCreating: (isCreating: boolean) => void;
  
  // Thunks
  fetchModels: () => Promise<void>;
  createModel: (e: React.FormEvent) => Promise<void>;
  deleteModel: (modelId: string) => Promise<void>;
  fetchCollections: () => Promise<void>;
  toggleCollectionSelection: (collectionName: string) => void;
  confirmCollections: () => Promise<void>;
}

export const useModelStore = create<ModelState>((set, get) => ({
  // Initial state
  models: [],
  isLoading: true,
  isModelsLoading: false,
  isDeleting: null,
  
  availableCollections: [],
  selectedCollections: [],
  isCollectionsLoading: false,
  isSavingCollections: false,
  editingModel: null,
  searchQuery: '',
  
  showNewModelModal: false,
  newModelName: '',
  newModelType: 'personal',
  departmentName: '',
  isCreating: false,
  
  // Basic state setters
  setModels: (models) => set({ models }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsModelsLoading: (isModelsLoading) => set({ isModelsLoading }),
  setIsDeleting: (modelId) => set({ isDeleting: modelId }),
  
  setAvailableCollections: (collections) => set({ availableCollections: collections }),
  setSelectedCollections: (collections) => set({ selectedCollections: collections }),
  setIsCollectionsLoading: (isLoading) => set({ isCollectionsLoading: isLoading }),
  setIsSavingCollections: (isSaving) => set({ isSavingCollections: isSaving }),
  setEditingModel: (model) => set({ editingModel: model }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setShowNewModelModal: (show) => set({ showNewModelModal: show }),
  setNewModelName: (name) => set({ newModelName: name }),
  setNewModelType: (type) => set({ newModelType: type }),
  setDepartmentName: (name) => set({ departmentName: name }),
  setIsCreating: (isCreating) => set({ isCreating: isCreating }),
  
  // Thunks
  fetchModels: async () => {
    const { setIsModelsLoading, setModels, setIsLoading } = get();
    setIsModelsLoading(true);
    
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch(`${config.apiUrl}/api/models`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Failed to fetch models: ${errorText}`);
      }

      const modelsFromBackend = await response.json();
      const transformedModels: Model[] = modelsFromBackend.map((model: any) => ({
        id: model._id,
        name: model.name,
        collections: model.collections || [],
        modelType: model.modelType,
        department: model.department,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        createdBy: model.createdBy
      }));

      setModels(transformedModels);
    } catch (error) {
      console.error('Error fetching models:', error);
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      setIsModelsLoading(false);
      setIsLoading(false);
    }
  },
  
  createModel: async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { 
      newModelName, 
      newModelType, 
      setIsCreating, 
      models, 
      setModels, 
      setShowNewModelModal, 
      setNewModelName, 
      setDepartmentName, 
      setNewModelType 
    } = get();
    
    if (!newModelName.trim()) {
      alert('Please enter a model name');
      return;
    }

    // Check if user is in a department when creating a department model
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('No auth token found');
      return;
    }
    
    const tokenPayload = jwtDecode(token) as any;
    const userDepartment = tokenPayload.department;
    
    if (newModelType === 'department' && !userDepartment && !tokenPayload.groups?.includes('Admin') && !tokenPayload.groups?.includes('SuperAdmin')) {
      alert('You cannot create a department model without a department assigned to your account');
      return;
    }

    setIsCreating(true);
    
    try {
      const createdBy = tokenPayload.nameID || tokenPayload.username;
      if (!createdBy) {
        throw new Error('No user identifier found in token');
      }

      const response = await fetch(`${config.apiUrl}/api/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newModelName.trim(),
          modelType: newModelType,
          department: newModelType === 'department' ? (userDepartment || 'General') : undefined,
          createdBy
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create model');
      }

      const data = await response.json();
      const newModel: Model = {
        id: data._id,
        name: data.name,
        collections: data.collections || [],
        modelType: data.modelType,
        department: data.department,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy
      };

      setModels([...models, newModel]);
      setShowNewModelModal(false);
      setNewModelName('');
      setDepartmentName('');
      
      const isAdmin = tokenPayload.groups?.includes('Admin');
      const isSuperAdmin = tokenPayload.groups?.includes('SuperAdmin');
      setNewModelType((isAdmin || isSuperAdmin) ? 'official' : 'personal');
    } catch (error) {
      console.error('Error creating model:', error);
      alert(error instanceof Error ? error.message : 'Failed to create model');
    } finally {
      setIsCreating(false);
    }
  },
  
  deleteModel: async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    const { setIsDeleting, models, setModels } = get();
    setIsDeleting(modelId);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      setModels(models.filter(m => m.id !== modelId));
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Failed to delete model. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  },
  
  fetchCollections: async () => {
    const { 
      setIsCollectionsLoading, 
      setAvailableCollections, 
      editingModel, 
      setEditingModel,
      setSelectedCollections
    } = get();
    
    if (!editingModel) return;
    
    setIsCollectionsLoading(true);
    setSelectedCollections(editingModel.collections || []);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${config.apiUrl}/api/training/collections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();
      const transformedCollections = data.map((collection: any) => ({
        id: collection._id?.toString() || collection.id || 'unknown',
        name: collection.name || '',
        createdBy: collection.createdBy || 'Unknown',
        created: collection.created || collection.createdAt || new Date().toISOString(),
        permission: collection.permission || 'PUBLIC'
      }));

      setAvailableCollections(transformedCollections);
    } catch (error) {
      console.error('Error fetching collections:', error);
      alert('Failed to fetch collections. Please try again.');
      setEditingModel(null);
    } finally {
      setIsCollectionsLoading(false);
    }
  },
  
  toggleCollectionSelection: (collectionName: string) => {
    const { selectedCollections, setSelectedCollections } = get();
    
    setSelectedCollections(
      selectedCollections.includes(collectionName)
        ? selectedCollections.filter((name) => name !== collectionName)
        : [...selectedCollections, collectionName]
    );
  },
  
  confirmCollections: async () => {
    const { 
      editingModel, 
      selectedCollections, 
      setIsSavingCollections, 
      models, 
      setModels, 
      setEditingModel 
    } = get();
    
    if (!editingModel) return;
    
    setIsSavingCollections(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/models/${editingModel.id}/collections`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ collections: selectedCollections })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update collections');
      }

      const updatedModel = await response.json();
      setModels(
        models.map(m =>
          m.id === editingModel.id ? { ...m, collections: updatedModel.collections } : m
        )
      );
      setEditingModel(null);
    } catch (error) {
      console.error('Error updating collections:', error);
      alert(error instanceof Error ? error.message : 'Failed to update collections');
    } finally {
      setIsSavingCollections(false);
    }
  }
})); 