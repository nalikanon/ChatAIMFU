import React, { useState } from 'react';
import { FaEllipsisH, FaTrash, FaLayerGroup } from 'react-icons/fa';
import { Model } from '../utils/types';
import { getModelTypeStyle, getRelativeTime } from '../utils/helpers';
import { useAuth } from '../../../hooks/useAuth';

interface ModelCardProps {
  model: Model;
  onCollectionsEdit: (model: Model, isReadOnly?: boolean) => void;
  onDelete: (modelId: string) => void;
  isDeleting: string | null;
}

export const ModelCard: React.FC<ModelCardProps> = ({ 
  model, 
  onCollectionsEdit, 
  onDelete, 
  isDeleting 
}) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const { isAdmin, isSuperAdmin, user } = useAuth();
  
  // Check if current user is the creator of this model
  const isCreator = user?.nameID === model.createdBy || user?.username === model.createdBy;

  const handleCardClick = () => {
    // Check access permissions
    if (model.modelType === 'official' && !isAdmin && !isSuperAdmin) {
      window.alert('You do not have permission to access official models');
      return;
    }
    
    if (model.modelType === 'department' && !isAdmin && !isSuperAdmin) {
      if (user?.department !== model.department) {
        window.alert('You do not have permission to access this department model');
        return;
      }
    }
    
    // Check if department admin can edit
    const isDepartmentAdmin = model.modelType === 'department' && 
      isAdmin && 
      user?.department === model.department;
    
    // Call appropriate function based on permissions
    if (isCreator || isDepartmentAdmin) {
      onCollectionsEdit(model); // Creator or department admin can edit
    } else {
      // Others can view but not edit
      onCollectionsEdit(model, true); // Pass isReadOnly as true
    }
  };

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 
        shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer 
        border border-gray-200 dark:border-gray-700 
        hover:border-blue-300 dark:hover:border-blue-600
        transform hover:scale-[1.02]"
      onClick={handleCardClick}
    >
      {/* Show options button only for creators or department admins */}
      {(isCreator || (model.modelType === 'department' && isAdmin && user?.department === model.department)) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="absolute top-4 right-4 p-2.5 text-gray-400 hover:text-gray-600 
            dark:text-gray-500 dark:hover:text-gray-300 rounded-lg
            hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
          title="Options"
        >
          <FaEllipsisH size={16} />
        </button>
      )}

      {showMenu && (
        <div className="absolute top-14 right-4 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
          border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(model.id);
              setShowMenu(false);
            }}
            disabled={isDeleting === model.id}
            className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 
              dark:hover:bg-red-900/30 flex items-center space-x-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting === model.id ? (
              <>
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FaTrash size={14} />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {model.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Created by: {model.createdBy}
          </p>
          {model.modelType === 'department' && (
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Department: {model.department}
            </p>
          )}
        </div>
        
        <div className="mt-auto space-y-4">
          {/* Collections Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <FaLayerGroup className="mr-2" size={14} />
                <span>{model.collections.length} Collections</span>
              </div>
            </div>
            
            {model.collections.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {model.collections.map((collection, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs 
                      font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {collection}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No collections added
              </p>
            )}
          </div>

          {/* Model Type and Creation Date */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getModelTypeStyle(model.modelType)}`}>
              {model.modelType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {getRelativeTime(model.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 