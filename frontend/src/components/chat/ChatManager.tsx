import React, { useState, useEffect } from 'react';
import { config } from '../../config/config';

interface ChatHistory {
  _id: string;
  chatname: string;
  modelId: string;
  folder: string;
  tags: string[];
  isPinned: boolean;
  messages: Message[];
  lastUpdated: Date;
}

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatManagerProps {
  onSelectChat: (chat: ChatHistory) => void;
  onCreateNewChat: () => void;
  selectedChatId?: string;
}

const ChatManager: React.FC<ChatManagerProps> = ({ onSelectChat, onCreateNewChat, selectedChatId }) => {
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [folders, setFolders] = useState<string[]>(['default']);
  const [selectedFolder, setSelectedFolder] = useState<string>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    loadChats();
  }, [selectedFolder]);

  const loadChats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const queryParams = new URLSearchParams();
      if (selectedFolder) queryParams.append('folder', selectedFolder);
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await fetch(`${config.apiUrl}/api/chat/history?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json() as ChatHistory[];
        setChats(data);
        
        // Extract unique folders
        const uniqueFolders = [...new Set(data.map(chat => chat.folder || 'default'))];
        setFolders(['default', ...uniqueFolders.filter(f => f !== 'default')]);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const handleRename = async (chatId: string, newName: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/chat/history/${chatId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newName })
      });

      if (response.ok) {
        await loadChats();
        setIsRenaming(null);
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  const handleDelete = async (chatId: string) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/chat/history/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadChats();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleMoveToFolder = async (chatId: string, folder: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/chat/history/${chatId}/folder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ folder })
      });

      if (response.ok) {
        await loadChats();
      }
    } catch (error) {
      console.error('Error moving chat:', error);
    }
  };

  const handleTogglePin = async (chatId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/chat/history/${chatId}/toggle-pin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadChats();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleExport = async (chatId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/chat/history/${chatId}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${chatId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting chat:', error);
    }
  };

  const handleCreateNewChat = async () => {
    if (isCreatingChat) return;
    
    try {
      setIsCreatingChat(true);
      await onCreateNewChat();
      await loadChats();
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search chats..."
            className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={handleCreateNewChat}
            disabled={isCreatingChat}
            className={`px-4 py-2 bg-blue-500 text-white rounded-lg ${
              isCreatingChat ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isCreatingChat ? 'Creating...' : 'New Chat'}
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                selectedFolder === folder
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <div
            key={chat._id}
            className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
              selectedChatId === chat._id ? 'bg-blue-50 dark:bg-gray-800' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => handleTogglePin(chat._id)}
                  className={`p-1 rounded ${chat.isPinned ? 'text-yellow-500' : 'text-gray-400'}`}
                >
                  📌
                </button>
                
                {isRenaming === chat._id ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(chat._id, newName);
                      if (e.key === 'Escape') setIsRenaming(null);
                    }}
                    className="flex-1 px-2 py-1 border rounded"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => onSelectChat(chat)}
                    className="flex-1 text-left hover:text-blue-500"
                  >
                    {chat.chatname}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsRenaming(chat._id);
                    setNewName(chat.chatname);
                  }}
                  className="p-1 text-gray-500 hover:text-blue-500"
                >
                  ✏️
                </button>
                <select
                  onChange={(e) => handleMoveToFolder(chat._id, e.target.value)}
                  value={chat.folder || 'default'}
                  className="p-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  {folders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                  <option value="new">+ New Folder</option>
                </select>
                <button
                  onClick={() => handleExport(chat._id)}
                  className="p-1 text-gray-500 hover:text-blue-500"
                >
                  📤
                </button>
                <button
                  onClick={() => handleDelete(chat._id)}
                  className="p-1 text-gray-500 hover:text-red-500"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatManager; 