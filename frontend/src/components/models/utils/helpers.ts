import { CollectionPermission } from './types';

/**
 * Get relative time from a date string
 */
export const getRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Recently created';
    }
    
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Created just now';
    if (diffSeconds < 3600) return `Created ${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `Created ${Math.floor(diffSeconds / 3600)} hours ago`;
    
    const days = Math.floor(diffSeconds / 86400);
    if (days === 1) return 'Created yesterday';
    return `Created ${days} days ago`;
  } catch (error) {
    return 'Recently created';
  }
};

/**
 * Get CSS style classes for model types
 */
export const getModelTypeStyle = (type: string) => {
  switch (type) {
    case 'official':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'personal':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    case 'department':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

/**
 * Get CSS style classes for collection permissions
 */
export const getPermissionStyle = (permission?: CollectionPermission | string[] | undefined) => {
  if (Array.isArray(permission)) {
    return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
  }
  switch (permission) {
    case CollectionPermission.PRIVATE:
      return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    case CollectionPermission.PUBLIC:
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

/**
 * Get readable label for collection permissions
 */
export const getPermissionLabel = (permission?: CollectionPermission | string[] | undefined) => {
  if (Array.isArray(permission)) {
    return 'Shared';
  }
  switch (permission) {
    case CollectionPermission.PRIVATE:
      return 'Private';
    case CollectionPermission.PUBLIC:
      return 'Public';
    default:
      return 'Unknown';
  }
}; 