import React, { useRef, useState, useEffect } from 'react';
import { Model } from '../utils/types';
import { useAuth } from '../../../hooks/useAuth';

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  setSelectedModel: (id: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModel, setSelectedModel }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Filter models based on permissions - same as modelCreation page
  const filteredModels = models.filter(model => {
    // 1. โมเดลที่ผู้ใช้สร้างเอง
    const isCreator = model.createdBy === user?.nameID || model.createdBy === user?.username;
    
    // 2. โมเดล official (แสดงให้ทุกคนเห็น)
    const isOfficial = model.modelType === 'official';
    
    // 3. โมเดล department ที่อยู่ในแผนกเดียวกัน
    const isSameDepartment = model.modelType === 'department' && model.department === user?.department;
    
    // แสดงเฉพาะโมเดลที่ตรงเงื่อนไขอย่างน้อย 1 ข้อ
    return isCreator || isOfficial || isSameDepartment;
  });

  const getModelTypeBadge = (modelType: string, department?: string) => {
    switch (modelType) {
      case 'official':
        return (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Official
          </span>
        );
      case 'personal':
        return (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Personal
          </span>
        );
      case 'department':
        return (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            {department || 'Department'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 
          hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 min-w-[120px] md:min-w-[180px]"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 truncate flex-1 text-left">
          {selectedModel ? (filteredModels.find(m => m.id === selectedModel)?.name ?? 'Select Model') : 'Select Model'}
        </span>
      </button>

      {isDropdownOpen && (
        <div className="absolute z-10 bottom-full mb-1 w-56 origin-bottom-right rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 py-1">
          {filteredModels.length > 0 ? (
            filteredModels.map((model) => (
              <button
                key={model.id}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors
                  ${selectedModel === model.id 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                onClick={() => {
                  setSelectedModel(model.id);
                  setIsDropdownOpen(false);
                }}
              >
                <span className="truncate">{model.name}</span>
                {getModelTypeBadge(model.modelType, model.department)}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No models available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector; 