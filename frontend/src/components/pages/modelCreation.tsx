import React, { useEffect, useMemo } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { useModelStore } from '../models/store/modelStore';
import { ModelCard } from '../models/ui/ModelCard';
import { NewModelModal } from '../models/ui/NewModelModal';
import { ModelCollectionsModal } from '../models/ui/ModelCollectionsModal';
import { LoadingSpinner } from '../models/ui/LoadingSpinner';

export const ModelCreation: React.FC = () => {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  
  // Get state and actions from the store
  const {
    // State
    models,
    isLoading,
    isModelsLoading,
    isDeleting,
    
    availableCollections,
    selectedCollections,
    isCollectionsLoading,
    isSavingCollections,
    editingModel,
    searchQuery,
    
    showNewModelModal,
    newModelName,
    newModelType,
    departmentName,
    isCreating,
    
    // Actions
    setShowNewModelModal,
    setNewModelName,
    setNewModelType,
    setSearchQuery,
    setEditingModel,
    
    // Thunks
    fetchModels,
    createModel,
    deleteModel,
    fetchCollections,
    toggleCollectionSelection,
    confirmCollections
  } = useModelStore();
  
  // Load models when component mounts
  useEffect(() => {
    fetchModels();
  }, []);
  
  // Fetch collections when editingModel changes
  useEffect(() => {
    if (editingModel) {
      fetchCollections();
    }
  }, [editingModel]);
  
  // Filter models to show only accessible ones
  const filteredModels = useMemo(() => {
    if (!models || !user) return [];
    
    // Filter to show:
    // 1. Models created by the user
    // 2. Models from the user's department
    return models.filter(model => {
      // Condition 1: User created the model
      const isCreator = model.createdBy === user.nameID || model.createdBy === user.username;
      
      // Condition 2: Model is from the user's department
      const isSameDepartment = model.modelType === 'department' && model.department === user.department;
      
      // Condition 3: Model is official (visible to all)
      const isOfficial = model.modelType === 'official';
      
      return isCreator || isSameDepartment || isOfficial;
    });
  }, [models, user]);

  return (
    <div className="container mx-auto p-6 font-sans">
      {isLoading ? (
        <LoadingSpinner message="Loading models..." />
      ) : (
        <>
          <header className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Models</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Create and manage your models for training and chat
                </p>
              </div>
              <button
                onClick={() => setShowNewModelModal(true)}
                className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                  hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200
                  transform hover:scale-[1.02] shadow-md hover:shadow-lg"
              >
                <FaPlus className="mr-2" size={16} />
                <span className="font-medium">New Model</span>
              </button>
            </div>
          </header>

          {isModelsLoading ? (
            <LoadingSpinner message="Fetching models..." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onCollectionsEdit={setEditingModel}
                  onDelete={deleteModel}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          )}

          {showNewModelModal && (
            <NewModelModal
              newModelName={newModelName}
              newModelType={newModelType}
              isCreating={isCreating}
              isStaff={isAdmin || isSuperAdmin}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              departmentName={departmentName}
              onNameChange={setNewModelName}
              onTypeChange={setNewModelType}
              onDepartmentChange={() => {}} // Not needed as we get department from user token
              onSubmit={createModel}
              onCancel={() => setShowNewModelModal(false)}
            />
          )}
          
          {editingModel && (
            <ModelCollectionsModal
              model={editingModel}
              availableCollections={availableCollections}
              selectedCollections={selectedCollections}
              searchQuery={searchQuery}
              isCollectionsLoading={isCollectionsLoading}
              isSavingCollections={isSavingCollections}
              isReadOnly={!(
                // Model creator
                (user?.nameID === editingModel.createdBy) || 
                (user?.username === editingModel.createdBy) ||
                // Or admin in the same department as the department model
                (editingModel.modelType === 'department' && 
                  isAdmin && 
                  user?.department === editingModel.department)
              )}
              onSearchChange={setSearchQuery}
              onCollectionToggle={toggleCollectionSelection}
              onConfirm={confirmCollections}
              onClose={() => setEditingModel(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ModelCreation; 