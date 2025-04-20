import React from 'react';
import { FaCheck, FaLayerGroup } from 'react-icons/fa';
import { BaseModal } from './BaseModal';
import { Collection, Model } from '../utils/types';
import { getPermissionStyle, getPermissionLabel } from '../utils/helpers';
import { useAuth } from '../../../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

interface ModelCollectionsModalProps {
  model: Model;
  availableCollections: Collection[];
  selectedCollections: string[];
  searchQuery: string;
  isCollectionsLoading: boolean;
  isSavingCollections: boolean;
  isReadOnly?: boolean;
  onSearchChange: (value: string) => void;
  onCollectionToggle: (collectionName: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const ModelCollectionsModal: React.FC<ModelCollectionsModalProps> = ({
  availableCollections,
  selectedCollections,
  searchQuery,
  isCollectionsLoading,
  isSavingCollections,
  isReadOnly = false,
  onSearchChange,
  onCollectionToggle,
  onConfirm,
  onClose,
}) => {
  const { user } = useAuth();

  // Filter collections based on permissions and model type
  const filteredCollections = availableCollections
    .filter(collection => {
      if (!collection || typeof collection !== 'object') return false;
      
      // When in read-only mode (not creator), show only collections in the model
      if (isReadOnly) {
        return selectedCollections.includes(collection.name);
      }
      
      // Consider access conditions:
      // 1. Public collections - accessible to all
      // 2. Private collections - only for owners
      const permission = collection.permission && typeof collection.permission === 'string'
        ? collection.permission.toLowerCase()
        : '';
      
      const isPublic = permission === 'public';
      const isOwner = collection.createdBy === user?.nameID || collection.createdBy === user?.username;
      
      return isPublic || isOwner;
    })
    .filter(collection => {
      if (!collection || !collection.name) return false;
      return collection.name.toLowerCase().includes((searchQuery || '').toLowerCase());
    });

  return (
    <BaseModal onClose={onClose} containerClasses="w-[40rem]">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {isReadOnly ? "View Model Collections" : "Edit Model Collections"}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isReadOnly 
            ? "Collections associated with this model" 
            : "Select collections to associate with this model"}
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search collections..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={isCollectionsLoading || isReadOnly}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
            placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {isCollectionsLoading ? (
        <LoadingSpinner message="Loading collections..." />
      ) : (
        <div className="max-h-[400px] overflow-y-auto space-y-2 mb-6">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FaLayerGroup size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No collections found</p>
              <p className="text-sm mt-2">Try adjusting your search query</p>
            </div>
          ) : (
            filteredCollections.map((collection) => (
              <div
                key={collection.id}
                onClick={() => !isReadOnly && onCollectionToggle(collection.name)}
                className={`flex items-center justify-between p-4 rounded-xl ${!isReadOnly ? 'cursor-pointer' : 'cursor-default'} 
                  transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50
                  ${selectedCollections.includes(collection.name) 
                    ? 'bg-blue-50/50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  } border`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                      ${getPermissionStyle(collection.permission)}`}
                    >
                      {getPermissionLabel(collection.permission)}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {collection.name}
                  </h4>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Created by {collection.createdBy}
                  </div>
                </div>
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-200 
                  flex items-center justify-center ${
                  selectedCollections.includes(collection.name)
                    ? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedCollections.includes(collection.name) && (
                    <FaCheck size={12} className="text-white" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex justify-between items-center border-t dark:border-gray-700 pt-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedCollections.length} collections selected
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSavingCollections}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
              rounded-xl transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          
          {!isReadOnly && (
            <button
              onClick={onConfirm}
              disabled={isSavingCollections}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 
                hover:from-blue-700 hover:to-blue-800 text-white rounded-xl 
                transition-all duration-200 transform hover:scale-[1.02]
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingCollections ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  );
}; 