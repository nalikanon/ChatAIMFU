import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...' 
}) => (
  <div className="flex flex-col items-center justify-center py-8">
    <div className="w-12 h-12 mb-4 relative">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
    </div>
    <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
  </div>
); 