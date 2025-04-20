import { MongoDBDate } from './types';

export const formatMessageTime = (timestamp: MongoDBDate | Date | string | undefined) => {
  try {
    // Handle undefined timestamp
    if (!timestamp) {
      return 'Just now';
    }

    // Convert to Date object based on format
    let dateObj: Date;
    if (typeof timestamp === 'string') {
      dateObj = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      dateObj = timestamp;
    } else if (timestamp.$date) {
      dateObj = new Date(timestamp.$date);
    } else {
      return 'Just now';
    }

    // Verify the timestamp is valid
    if (isNaN(dateObj.getTime())) {
      return 'Just now';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // If less than 1 minute ago
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    // If less than 1 hour ago
    else if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    // If less than 24 hours ago
    else if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    // If less than 7 days ago
    else if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    // If in the current year
    else if (dateObj.getFullYear() === now.getFullYear()) {
      return dateObj.toLocaleString('th-TH', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    // If older than current year
    else {
      return dateObj.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Just now';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

export const isValidObjectId = (id: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}; 