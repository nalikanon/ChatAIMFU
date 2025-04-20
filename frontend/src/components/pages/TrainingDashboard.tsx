import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent, useRef, useMemo } from 'react';
import { config } from '../../config/config';
import { FaPlus, FaTimes, FaCog, FaEllipsisH, FaTrash } from 'react-icons/fa';
import { Collection, CollectionPermission } from '../../types/collection';

// ----------------------
// Type Definitions
// ----------------------
interface UserInfo {
  username: string;
  role: 'Students' | 'Staffs' | 'Admin' | 'SuperAdmin';
  nameID?: string;
}

interface UploadedFile {
  filename: string;
  uploadedBy: string;
  timestamp: string;
  ids: string[];
}

interface MongoFile {
  filename: string;
  uploadedBy?: string;
  timestamp?: string;
  ids?: string[];
}

// ----------------------
// Utility Functions
// ----------------------
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = (now.getTime() - date.getTime()) / 1000;
  if (diffSeconds < 60) return 'Updated just now';
  const diffMinutes = diffSeconds / 60;
  if (diffMinutes < 60) return `Updated ${Math.floor(diffMinutes)} minutes ago`;
  const diffHours = diffMinutes / 60;
  if (diffHours < 24) return `Updated ${Math.floor(diffHours)} hours ago`;
  const diffDays = diffHours / 24;
  return `Updated ${Math.floor(diffDays)} days ago`;
};

// ----------------------
// Reusable Modal Component
// ----------------------
interface BaseModalProps {
  onClose: () => void;
  containerClasses?: string;
  children: React.ReactNode;
}

const BaseModal: React.FC<BaseModalProps> = ({
  onClose,
  containerClasses = '',
  children,
}) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 ${containerClasses}`}>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
          p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
        title="Close"
      >
        <FaTimes size={20} />
      </button>
      {children}
    </div>
  </div>
);

// ----------------------
// Dashboard Header Component
// ----------------------
interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewCollectionToggle: () => void;
  loading: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onNewCollectionToggle,
  loading
}) => (
  <header className="mb-8">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Training Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your training collections and documents
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
              placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
            disabled={loading}
          />
        </div>
        <button
          onClick={onNewCollectionToggle}
          className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
            hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200
            transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed
            shadow-md hover:shadow-lg"
          disabled={loading}
        >
          <FaPlus className="mr-2" />
          {loading ? 'Loading...' : 'New Collection'}
        </button>
      </div>
    </div>
  </header>
);

// ----------------------
// New Collection Modal Component
// ----------------------
interface NewCollectionModalProps {
  newCollectionName: string;
  newCollectionPermission: string;
  onNameChange: (value: string) => void;
  onPermissionChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const NewCollectionModal: React.FC<NewCollectionModalProps> = ({
  newCollectionName,
  newCollectionPermission,
  onNameChange,
  onPermissionChange,
  onSubmit,
  onCancel,
  isAdmin,
  isSuperAdmin
}) => {
  // Add ref for click outside detection
  const modalRef = useRef<HTMLDivElement>(null);

  // เพิ่มฟังก์ชันตรวจสอบชื่อ collection
  const isValidCollectionName = (name: string): boolean => {
    // ตรวจสอบความยาวและช่องว่าง
    if (name.length < 3 || name.includes(' ')) {
      return false;
    }
    // ตรวจสอบให้ใช้ได้เฉพาะ a-z, A-Z, 0-9, - และ _
    const validNameRegex = /^[a-zA-Z0-9-_]+$/;
    return validNameRegex.test(name);
  };

  // เพิ่ม state สำหรับแสดง error message
  const [nameError, setNameError] = useState<string>('');

  // ตรวจสอบชื่อเมื่อมีการเปลี่ยนแปลง
  const handleNameChange = (value: string) => {
    onNameChange(value);
    if (value.length < 3) {
      setNameError('Collection name must be at least 3 characters');
    } else if (value.includes(' ')) {
      setNameError('Collection name cannot contain spaces');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
      setNameError('Collection name can only contain English letters, numbers, hyphens (-) and underscores (_)');
    } else {
      setNameError('');
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  return (
    <BaseModal onClose={onCancel} containerClasses="w-[28rem]">
      <div ref={modalRef} className="relative">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Create New Collection
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create a new collection to organize your training documents.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Collection Name
            </label>
            <input
              type="text"
              placeholder="Enter collection name (English letters, numbers, - and _ only)"
              value={newCollectionName}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border 
                ${nameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                placeholder-gray-500 dark:placeholder-gray-400`}
            />
            {nameError && (
              <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                {nameError}
              </p>
            )}
          </div>
          {isAdmin || isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Permission
              </label>
              <select
                value={newCollectionPermission}
                onChange={(e) => onPermissionChange(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="PRIVATE">Private - Only you can access</option>
                <option value="PUBLIC">Public - Everyone can access</option>
              </select>
            </div>
          )}
          <div className="flex flex-col space-y-2 pt-4">
            <button
              type="submit"
              disabled={!isValidCollectionName(newCollectionName)}
              className={`w-full px-4 py-2 rounded-lg font-medium 
                transform transition-all duration-200
                ${isValidCollectionName(newCollectionName)
                  ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}
            >
              Create Collection
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
              transform transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};

// ----------------------
// Collection Modal (File Management)
// ----------------------
interface CollectionModalProps {
  collection: Collection;
  onClose: () => void;
  uploadedFiles: UploadedFile[];
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: (e: FormEvent) => void;
  uploadLoading: boolean;
  onShowSettings: () => void;
  onDeleteFile: (file: UploadedFile) => void;
}

const CollectionModal: React.FC<CollectionModalProps> = ({
  collection,
  onClose,
  uploadedFiles,
  onFileChange,
  onFileUpload,
  uploadLoading,
  onShowSettings,
  onDeleteFile,
}) => {
  // Add ref for click outside detection
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const settingsModal = document.querySelector('[data-modal="settings"]');
      // If settings modal is open, don't handle click outside for collection modal
      if (settingsModal) {
        return;
      }
      
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <BaseModal onClose={onClose} containerClasses="w-full md:w-2/3 lg:w-1/2 relative overflow-y-auto max-h-[80vh]">
      <div ref={modalRef} data-modal="collection" className="relative">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{collection.name}</h2>
              {onShowSettings && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowSettings();
                  }}
                  className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                  text-gray-600 dark:text-gray-300 transition-all duration-200
                  border border-gray-200 dark:border-gray-700"
                  title="Collection Settings"
                >
                  <FaCog size={18} />
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage documents and settings for this collection
            </p>
          </div>
        </div>

        {/* File Upload Section */}
        <section className="mb-8 bg-gradient-to-br from-gray-50 to-gray-100 
        dark:from-gray-800/50 dark:to-gray-800/30 rounded-xl p-6 
        border-2 border-dashed border-gray-300 dark:border-gray-600">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Upload Document
          </h3>
          <form onSubmit={onFileUpload} className="space-y-4">
            <div className="relative">
              <input
                type="file"
                onChange={onFileChange}
                className="block w-full text-gray-600 dark:text-gray-300
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                dark:file:bg-blue-900/30 dark:file:text-blue-400
                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40
                file:cursor-pointer cursor-pointer
                focus:outline-none transition-colors duration-200"
                accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.csv,.json,.xml"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Supported formats: PDF, TXT, DOC, DOCX, XLS, XLSX, CSV, JSON, XML (Max 1MB)
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please upload files without images.
              </p>
            </div>
            <button
              type="submit"
              disabled={uploadLoading}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-white
              transition-all duration-200 flex items-center justify-center space-x-2
              ${uploadLoading 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 shadow-md hover:shadow-lg transform hover:scale-105'
              }`}
            >
              {uploadLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Files List Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Documents in Collection
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {uploadedFiles.length > 0 ? (
            <div className="space-y-3">
              {uploadedFiles.map((fileItem, index) => (
                <div 
                  key={index} 
                  className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm 
                  border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md 
                  transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                        {fileItem.filename}
                      </h4>
                      <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4 text-sm">
                        <p className="text-gray-600 dark:text-gray-300">
                          {fileItem.uploadedBy}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {new Date(fileItem.timestamp).toLocaleString()}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {fileItem.ids.length} chunks
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteFile(fileItem)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 
                      dark:hover:text-red-400 transition-colors duration-200 rounded-lg 
                      hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Delete Document"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 
            dark:from-gray-800/50 dark:to-gray-800/30 rounded-xl border-2 border-dashed 
            border-gray-300 dark:border-gray-600">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <p className="mt-4 text-base font-medium text-gray-600 dark:text-gray-400">
                No documents uploaded yet
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                Upload a document to get started with your collection
              </p>
            </div>
          )}
        </section>
      </div>
    </BaseModal>
  );
};

// ----------------------
// Settings Modal Component
// ----------------------
interface SettingsModalProps {
  updatedCollectionName: string;
  updatedCollectionPermission: string;
  onNameChange: (value: string) => void;
  onPermissionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  updatedCollectionPermission,
  onPermissionChange,
  onClose,
  onSubmit,
}) => {
  // Add ref for click outside detection
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <BaseModal onClose={onClose} containerClasses="w-96">
      <div ref={modalRef} data-modal="settings" className="relative">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Collection Settings
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Update your collection settings and permissions.
          </p>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit(e);
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Permission
            </label>
            <select
              value={updatedCollectionPermission}
              onChange={(e) => onPermissionChange(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            >
              <option value="PRIVATE">Private - Only you can access</option>
              <option value="PUBLIC">Public - Everyone can access</option>
            </select>
          </div>
          <div className="flex flex-col space-y-2 pt-4">
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 
              dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium 
              transform transition-all duration-200"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
              transform transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};

// ----------------------
// Main Dashboard Component
// ----------------------
const TrainingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  const [showNewCollectionModal, setShowNewCollectionModal] = useState<boolean>(false);
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [newCollectionPermission, setNewCollectionPermission] = useState<string>('PRIVATE');

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [updatedCollectionName, setUpdatedCollectionName] = useState<string>('');
  const [updatedCollectionPermission, setUpdatedCollectionPermission] = useState<string>('PRIVATE');

  const [isCollectionsLoading, setIsCollectionsLoading] = useState<boolean>(false);

  // Add useEffect to fetch collections on mount
  useEffect(() => {
    fetchCollections().finally(() => setLoading(false));
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      // console.log('Starting to fetch collections...');
      setIsCollectionsLoading(true);
      
      const token = localStorage.getItem('auth_token');
      // console.log('Using auth token:', token ? 'Token exists' : 'No token found');

      const response = await fetch(`${config.apiUrl}/api/training/collections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // console.log('Collection API response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch collections');
      
      const data = await response.json();
      // console.log('Raw collection data from backend:', data);
      
      // Transform collection data
      const transformedCollections: Collection[] = data.map((mongo: any) => ({
        id: mongo._id?.toString() || mongo.id || 'unknown',
        name: mongo.name || '',
        createdBy: mongo.createdBy || 'Unknown',
        created: mongo.created || mongo.createdAt || new Date().toISOString(),
        permission: mongo.permission || CollectionPermission.PUBLIC
      }));

      // console.log('Transformed collections:', transformedCollections);
      setCollections(transformedCollections);
      // console.log('Collections state updated successfully');
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsCollectionsLoading(false);
    }
  }, []);

  const fetchUploadedFiles = useCallback(async (collectionName: string) => {
    try {
      const response = await fetch(
        `${config.apiUrl}/api/training/documents?collectionName=${encodeURIComponent(collectionName)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const mongoFiles: MongoFile[] = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      // Transform MongoFile[] to UploadedFile[]
      const transformedFiles: UploadedFile[] = mongoFiles.map(file => ({
        filename: file.filename,
        uploadedBy: file.uploadedBy || 'Unknown',
        timestamp: file.timestamp || new Date().toISOString(),
        ids: file.ids || []
      }));

      setUploadedFiles(transformedFiles);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      alert(error instanceof Error ? error.message : 'Failed to fetch files');
    }
  }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userDataStr = localStorage.getItem('user_data');
        if (!userDataStr) {
          throw new Error('No user data found');
        }
        const userData = JSON.parse(userDataStr);
        setUserInfo(userData);
      } catch (error) {
        console.error('Error getting user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (userInfo) {
      fetchCollections();
    }
  }, [fetchCollections, userInfo]);

  useEffect(() => {
    if (selectedCollection) {
      setUpdatedCollectionName(selectedCollection.name);
      setUpdatedCollectionPermission(
        Array.isArray(selectedCollection.permission) 
          ? 'PRIVATE' 
          : (selectedCollection.permission?.toString() || 'PRIVATE')
      );
      fetchUploadedFiles(selectedCollection.name);
    }
  }, [selectedCollection, fetchUploadedFiles]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateCollectionData = async () => {
      if (!selectedCollection?.id) return;

      try {
        // Instead of fetching a single collection, fetch all and find the one we need
        const response = await fetch(
          `${config.apiUrl}/api/training/collections`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch collections: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const updatedCollectionData = data.find((c: any) => c._id === selectedCollection.id || c.id === selectedCollection.id);
        
        if (!updatedCollectionData) {
          // Collection no longer exists
          // console.log(`Collection ${selectedCollection.id} no longer exists, removing from list`);
          setCollections(prev => prev.filter(c => c.id !== selectedCollection.id));
          setSelectedCollection(null);
          return;
        }

        const currentTime = new Date().toISOString();

        // Only update collection metadata, not files
        setCollections(prevCollections =>
          prevCollections.map(col =>
            col.id === selectedCollection.id
              ? {
                  ...col,
                  name: updatedCollectionData.name || col.name,
                  permission: updatedCollectionData.permission || col.permission,
                  lastModified: currentTime,
                }
              : col
          )
        );

        // Update selected collection metadata only
        setSelectedCollection(prev => ({
          ...prev!,
          name: updatedCollectionData.name || prev!.name,
          permission: updatedCollectionData.permission || prev!.permission,
          lastModified: currentTime,
        }));

      } catch (error) {
        console.error('Error in real-time update:', error);
      }
    };

    if (selectedCollection) {
      intervalId = setInterval(updateCollectionData, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedCollection?.id]); // Only depend on the ID to prevent unnecessary updates

  // Separate effect for initial file loading when collection is selected
  useEffect(() => {
    if (selectedCollection) {
      fetchUploadedFiles(selectedCollection.name);
    }
  }, [selectedCollection?.id, fetchUploadedFiles]);

  const handleCollectionSelect = async (collection: Collection) => {
    // Set selected collection immediately for better UX
    setSelectedCollection(collection);
    // Files will be loaded by the useEffect hook
    
    try {
      const response = await fetch(
        `${config.apiUrl}/api/training/collections`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();
      const freshData = data.find((c: any) => c._id === collection.id || c.id === collection.id);

      if (!freshData) {
        // Collection no longer exists
        // console.log(`Collection ${collection.id} no longer exists, removing from list`);
        setCollections(prev => prev.filter(c => c.id !== collection.id));
        setSelectedCollection(null);
        return;
      }
      
      // Update collections list with fresh data
      setCollections(prevCollections =>
        prevCollections.map(col =>
          col.id === collection.id
            ? {
                ...col,
                name: freshData.name || col.name,
                permission: freshData.permission || col.permission,
                created: col.created,
                createdBy: col.createdBy,
              }
            : col
        )
      );

      // Update selected collection with fresh data
      setSelectedCollection(prev => ({
        ...prev!,
        name: freshData.name || prev!.name,
        permission: freshData.permission || prev!.permission,
        created: collection.created,
        createdBy: collection.createdBy,
      }));

    } catch (error) {
      console.error('Error fetching collection details:', error);
      // On error, keep using existing collection data
    }
  };

  const handleCreateCollection = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // ตรวจสอบชื่อซ้ำ
      const isDuplicate = collections.some(
        collection => collection.name.toLowerCase() === newCollectionName.toLowerCase()
      );

      if (isDuplicate) {
        alert('Collection name already exists. Please choose a different name.');
        return; // ไม่ปิด modal เพื่อให้ผู้ใช้แก้ไขชื่อใหม่
      }

      const permission = userInfo?.role === 'Admin' || userInfo?.role === 'SuperAdmin' ? newCollectionPermission : 'PRIVATE';
      
      const response = await fetch(`${config.apiUrl}/api/training/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          name: newCollectionName,
          permission: permission,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create collection');
      }

      await fetchCollections(); // รีโหลดข้อมูล collections
      setShowNewCollectionModal(false);
      setNewCollectionName('');
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Failed to create collection. Please try again.');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !selectedCollection) {
      alert('Please choose a file.');
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('modelId', 'default');
      formData.append('collectionName', selectedCollection.name);

      const response = await fetch(`${config.apiUrl}/api/training/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });
      if (response.ok) {
        alert('File uploaded successfully');
        setFile(null);
        // Refresh file list after successful upload
        await fetchUploadedFiles(selectedCollection.name);
      } else {
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteCollection = async (collection: Collection) => {
    if (!window.confirm(`Are you sure you want to delete collection "${collection.name}"?`)) return;
    try {
      const response = await fetch(`${config.apiUrl}/api/training/collections/${collection.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete collection');
      alert('Collection deleted successfully');
      if (selectedCollection && selectedCollection.id === collection.id) {
        setSelectedCollection(null);
      }
      fetchCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Error deleting collection');
    }
  };

  const handleDeleteFile = async (fileToDelete: UploadedFile) => {
    if (!selectedCollection) return;
    if (!window.confirm(`Are you sure you want to delete the file ${fileToDelete.filename}?`)) return;
    
    setUploadLoading(true);
    try {
      for (const chunkId of fileToDelete.ids) {
        const response = await fetch(
          `${config.apiUrl}/api/training/documents/${chunkId}?collectionName=${encodeURIComponent(selectedCollection.name)}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to delete chunk ${chunkId}`);
        }
      }
      
      // Refresh file list after successful deletion
      await fetchUploadedFiles(selectedCollection.name);
      alert('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUpdateSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCollection) return;

    try {
      const currentTime = new Date().toISOString();
      const response = await fetch(`${config.apiUrl}/api/training/collections/${selectedCollection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          name: updatedCollectionName,
          permission: updatedCollectionPermission,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to update collection');
      }

      // Track the changes in history
      const modificationHistory = [
        ...(selectedCollection.modificationHistory || []),
        {
          timestamp: currentTime,
          action: 'SETTINGS_UPDATE',
          details: `Name changed to: ${updatedCollectionName}, Permission changed to: ${updatedCollectionPermission}`
        }
      ];

      // Create updated collection object with history
      const updatedCollection: Collection = {
        id: selectedCollection.id,
        name: updatedCollectionName,
        permission: updatedCollectionPermission as CollectionPermission,
        created: selectedCollection.created,
        createdBy: selectedCollection.createdBy,
        lastModified: currentTime,
        modificationHistory
      };

      // Close the settings modal before updating state
      setShowSettings(false);

      // Update states with history
      setCollections(prevCollections =>
        prevCollections.map(col =>
          col.id === selectedCollection.id ? updatedCollection : col
        )
      );

      setSelectedCollection(updatedCollection);

      // Log successful update
      // console.log(`Collection ${selectedCollection.id} settings updated:`, {
      //   previousName: selectedCollection.name,
      //   newName: updatedCollectionName,
      //   previousPermission: selectedCollection.permission,
      //   newPermission: updatedCollectionPermission,
      //   updateTime: currentTime
      // });

      await fetchUploadedFiles(updatedCollectionName);
      await fetchCollections();

    } catch (error) {
      console.error('Error updating collection:', error);
      // Enhanced error logging
      console.error(`Failed to update collection ${selectedCollection.id}:`, {
        attemptedChanges: {
          name: updatedCollectionName,
          permission: updatedCollectionPermission
        },
        currentState: {
          name: selectedCollection.name,
          permission: selectedCollection.permission,
          lastModified: selectedCollection.lastModified
        },
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error type'
      });
      alert(error instanceof Error ? error.message : 'Failed to update collection. Please try again.');
    }
  };

  // เพิ่มฟังก์ชันกรอง collections
  const filterUserCollections = (collections: Collection[]): Collection[] => {
    if (!userInfo) return [];
    
    // กรองเฉพาะ collections ที่ผู้ใช้สร้าง
    return collections.filter(collection => 
      collection.createdBy === (userInfo.nameID || userInfo.username)
    );
  };

  // แก้ไขส่วนการ render collections
  const filteredCollections = useMemo(() => {
    // กรองตาม search query
    const searchFiltered = collections.filter(collection =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // กรองเฉพาะ collections ของผู้ใช้
    return filterUserCollections(searchFiltered);
  }, [collections, searchQuery, userInfo]);

  const getPermissionStyle = (permission?: CollectionPermission | string[] | undefined) => {
    if (Array.isArray(permission)) return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
    switch (permission) {
      case CollectionPermission.PRIVATE:
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case CollectionPermission.PUBLIC:
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPermissionLabel = (permission?: CollectionPermission | string[] | undefined) => {
    if (Array.isArray(permission)) return 'Shared';
    switch (permission) {
      case CollectionPermission.PRIVATE:
        return 'Private';
      case CollectionPermission.PUBLIC:
        return 'Public';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="container mx-auto p-4 font-sans relative">
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewCollectionToggle={() => setShowNewCollectionModal(true)}
        loading={loading}
      />

      {/* Collections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isCollectionsLoading ? (
          // Loading skeletons...
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm 
              border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))
        ) : filteredCollections.length > 0 ? (
          // Show filtered collections
          filteredCollections.map(collection => (
            <div
              key={collection.id}
              onClick={() => handleCollectionSelect(collection)}
              className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm 
                border border-gray-200 dark:border-gray-700 hover:shadow-md 
                transition-all duration-200 cursor-pointer group"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownId(activeDropdownId === collection.id ? null : collection.id);
                }}
                className="absolute top-4 right-4 p-2.5 text-gray-400 hover:text-gray-600 
                  dark:text-gray-500 dark:hover:text-gray-300 rounded-lg
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                title="Options"
              >
                <FaEllipsisH size={16} />
              </button>

              {activeDropdownId === collection.id && (
                <div className="absolute top-14 right-4 w-48 bg-white dark:bg-gray-800 rounded-xl 
                  shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                >
                  {(userInfo?.role === 'Admin' || userInfo?.role === 'SuperAdmin') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCollection(collection);
                        setShowSettings(true);
                        setActiveDropdownId(null);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 dark:text-gray-300 
                        hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2
                        transition-colors duration-200"
                    >
                      <FaCog size={14} />
                      <span>Settings</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(collection);
                      setActiveDropdownId(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-red-600 dark:text-red-400 
                      hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center space-x-2
                      transition-colors duration-200"
                  >
                    <FaTrash size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}

              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {collection.name}
                  </h2>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <span className="truncate">{collection.createdBy}</span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPermissionStyle(collection.permission)}`}>
                      {getPermissionLabel(collection.permission)}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getRelativeTime(collection.created)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          // No collections found
          <div className="col-span-full text-center py-12">
            <div className="mx-auto w-24 h-24 mb-4 text-gray-400 dark:text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              No collections found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? "No collections match your search criteria"
                : "Create your first collection to get started"}
            </p>
          </div>
        )}
      </div>

      {selectedCollection && (
        <CollectionModal
          collection={selectedCollection}
          onClose={() => setSelectedCollection(null)}
          uploadedFiles={uploadedFiles}
          onFileChange={handleFileChange}
          onFileUpload={handleFileUpload}
          uploadLoading={uploadLoading}
          onShowSettings={userInfo?.role === 'Admin' || userInfo?.role === 'SuperAdmin' ? () => setShowSettings(true) : () => {}}
          onDeleteFile={handleDeleteFile}
        />
      )}

      {showSettings && selectedCollection && (
        <SettingsModal
          updatedCollectionName={updatedCollectionName}
          updatedCollectionPermission={updatedCollectionPermission}
          onNameChange={setUpdatedCollectionName}
          onPermissionChange={setUpdatedCollectionPermission}
          onClose={() => setShowSettings(false)}
          onSubmit={handleUpdateSettings}
        />
      )}

      {showNewCollectionModal && (
        <NewCollectionModal
          newCollectionName={newCollectionName}
          newCollectionPermission={newCollectionPermission}
          onNameChange={setNewCollectionName}
          onPermissionChange={setNewCollectionPermission}
          onSubmit={handleCreateCollection}
          onCancel={() => {
            setShowNewCollectionModal(false);
            setNewCollectionName('');
          }}
          isAdmin={userInfo?.role === 'Admin'}
          isSuperAdmin={userInfo?.role === 'SuperAdmin'}
        />
      )}
    </div>
  );
};

export default TrainingDashboard;
