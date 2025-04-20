import React, { useState, useEffect } from 'react';
import { FaSave, FaUndo } from 'react-icons/fa';
import { config } from '../../config/config';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface SystemPromptData {
  prompt: string;
  updatedAt: string;
  updatedBy: string;
}

const SystemPrompt: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [promptData, setPromptData] = useState<SystemPromptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSystemPrompt();
  }, [isSuperAdmin, navigate]);

  const fetchSystemPrompt = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No token for authentication');
      }
      
      const response = await fetch(`${config.apiUrl}/api/admin/system-prompt`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('You do not have permission to access this page');
        }
        throw new Error('Error fetching system prompt data');
      }
      
      const data = await response.json();
      setSystemPrompt(data.prompt);
      setOriginalPrompt(data.prompt);
      setPromptData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error fetching system prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      // ตรวจสอบว่า prompt ไม่ว่างเปล่า
      if (!systemPrompt.trim()) {
        setError('System prompt cannot be empty');
        return;
      }
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No token for authentication');
      }
      
      const response = await fetch(`${config.apiUrl}/api/admin/system-prompt`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: systemPrompt })
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('You do not have permission to edit system prompt');
        }
        throw new Error('Error saving system prompt');
      }
      
      const data = await response.json();
      setSystemPrompt(data.prompt);
      setOriginalPrompt(data.prompt);
      setPromptData(data);
      setSuccessMessage('System prompt saved successfully');
      
      // ซ่อนข้อความแจ้งเตือนสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error saving system prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPrompt = () => {
    setSystemPrompt(originalPrompt);
    setError(null);
    setSuccessMessage(null);
  };

  const isModified = systemPrompt !== originalPrompt;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
          Manage System Prompt
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            <p>{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
            <p>{successMessage}</p>
          </div>
        )}
        
        {promptData && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Last updated: {new Date(promptData.updatedAt).toLocaleString('th-TH')}</p>
            <p>Updated by: {promptData.updatedBy}</p>
          </div>
        )}
        
        <div className="mb-6">
          <label htmlFor="systemPrompt" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            System Prompt
          </label>
          <textarea
            id="systemPrompt"
            className="w-full h-96 px-4 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-mono text-sm resize-none"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter system prompt here..."
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            System prompt will be used as the default instruction for AI in every conversation
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleResetPrompt}
            disabled={!isModified || saving}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              !isModified || saving
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FaUndo className="w-4 h-4" />
            <span>Reset</span>
          </button>
          
          <button
            type="button"
            onClick={handleSavePrompt}
            disabled={!isModified || saving}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              !isModified || saving
                ? 'bg-blue-300 text-blue-700 cursor-not-allowed dark:bg-blue-800/50 dark:text-blue-300'
                : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemPrompt; 