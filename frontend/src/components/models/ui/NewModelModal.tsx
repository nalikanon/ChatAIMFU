import React, { FormEvent } from 'react';
import { BaseModal } from './BaseModal';

interface NewModelModalProps {
  newModelName: string;
  newModelType: 'official' | 'personal' | 'department';
  isCreating: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  departmentName: string;
  onNameChange: (value: string) => void;
  onTypeChange: (value: 'official' | 'personal' | 'department') => void;
  onDepartmentChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export const NewModelModal: React.FC<NewModelModalProps> = ({
  newModelName,
  newModelType,
  isCreating,
  isStaff,
  isAdmin,
  isSuperAdmin,
  departmentName,
  onNameChange,
  onTypeChange,
  onSubmit,
  onCancel,
}) => (
  <BaseModal onClose={onCancel} containerClasses="w-[28rem]">
    <div className="mb-6">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Create New Model
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Create a new model to organize your collections and training data.
      </p>
    </div>
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Model Name
        </label>
        <input
          type="text"
          placeholder="Enter model name"
          value={newModelName}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={isCreating}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
            placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Model Type
        </label>
        <select
          value={newModelType}
          onChange={(e) => onTypeChange(e.target.value as 'official' | 'personal' | 'department')}
          disabled={isCreating}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="personal">Personal</option>
          {isStaff && (
            <>
              <option value="official">Official</option>
              {(isAdmin || isSuperAdmin) ? <option value="department">Department</option> : departmentName && <option value="department">Department ({departmentName})</option>}
            </>
          )}
        </select>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCreating}
          className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 
            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isCreating || !newModelName.trim() || (newModelType === 'department' && !departmentName && !(isAdmin || isSuperAdmin))}
          className="px-4 py-2 rounded-lg text-white 
            bg-blue-600 hover:bg-blue-700
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating...
            </>
          ) : (
            'Create Model'
          )}
        </button>
      </div>
    </form>
  </BaseModal>
); 