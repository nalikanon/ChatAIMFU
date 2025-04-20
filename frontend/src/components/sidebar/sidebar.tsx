import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaComments, FaBars, FaSignOutAlt, FaTrash, FaEdit, FaAndroid, FaSearch, FaBookOpen, FaUserPlus, FaQuestionCircle, FaChartBar, FaCog, FaUsers, FaBuilding } from 'react-icons/fa';
import { config } from '../../config/config';
import DarkModeToggle from '../darkmode/DarkModeToggle';

interface SidebarProps {
  onClose?: () => void;
}

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: {
    data: string;
    mediaType: string;
  }[];
  sources?: {
    modelId: string;
    collectionName: string;
    filename: string;
    similarity: number;
  }[];
}

interface ChatHistory {
  _id: string;
  chatname: string;
  name: string;
  modelId: string;
  messages: Message[];
  isPinned: boolean;
  updatedAt: Date;
}

interface RenameState {
  isEditing: boolean;
  chatId: string | null;
  newName: string;
  isLoading: boolean;
  error: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  // const isStaff = userData.groups?.includes('Staffs') || userData.groups?.includes('Admin');
  // const isAdmin = userData.groups?.includes('Admin');
  const isStaff = userData.groups?.includes('Admin') || userData.groups?.includes('Students') || userData.groups?.includes('Staffs');
  const isSuperAdmin = userData.groups?.includes('SuperAdmin');
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const searchParams = new URLSearchParams(location.search);
  const currentChatId = searchParams.get('chat');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [renameState, setRenameState] = useState<RenameState>({
    isEditing: false,
    chatId: null,
    newName: '',
    isLoading: false,
    error: null
  });

  const handleTokenExpired = () => {
    localStorage.clear();
    navigate('/login');
  };

  const fetchChatHistories = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      // console.log('Auth token present:', !!token); 
      // Debug if token exists

      if (!token) {
        console.error('No auth token found in localStorage');
        handleTokenExpired();
        return;
      }

      // Validate token format
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        handleTokenExpired();
        return;
      }

      // Get user info from token
      try {
        JSON.parse(atob(token.split('.')[1])); // Validate token payload
      } catch (e) {
        console.error('Failed to parse token payload:', e);
        handleTokenExpired();
        return;
      }

      // console.log('Making API request with token:', `Bearer ${token}`); // Debug full token

      const response = await fetch(`${config.apiUrl}/api/chat/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // console.log('API Response status:', response.status); // Debug response status

      if (response.status === 401) {
        console.error('Unauthorized - token might be expired');
        handleTokenExpired();
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        return;
      }

      const data = await response.json();
      // console.log('Chat histories data:', data); // Debug response data

      if (data && data.chats && Array.isArray(data.chats)) {
        setChatHistories(data.chats);
      } else if (data && Array.isArray(data)) {
        setChatHistories(data);
      } else if (data && data.messages) {
        setChatHistories([data]);
      } else {
        setChatHistories([]);
      }
    } catch (error) {
      console.error('Error fetching chat histories:', error);
      setChatHistories([]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // console.log('No auth token found, redirecting to login...');
      window.location.href = `${config.apiUrl}/api/auth/login/saml`;
      return;
    }

    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket(`${config.wsUrl}?token=${token}`);

      ws.onopen = () => {
        // console.log('WebSocket connection established');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // console.log('WebSocket message received:', data);

        if (data.shouldUpdateList || data.done || data.isNewChat) {
          // console.log('Refreshing chat list due to:', data);
          fetchChatHistories();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        // console.log('WebSocket connection closed, attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };
    };

    // Initial fetch and WebSocket connection
    fetchChatHistories();
    connectWebSocket();

    // Cleanup function
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const handleLogout = async () => {
  //   try {
  //     localStorage.clear();
  //     // for development
  //     // window.location.href = 'http://localhost:5173/login';
  //     window.location.href = 'https://authsso.mfu.ac.th/adfs/ls/?wa=wsignout1.0';
  //   } catch (error) {
  //     console.error('Logout error:', error);
  //     window.location.href = '/login';
  //   }
  // };

  const handleLogout = async () => {
    try {
      localStorage.clear();
      document.cookie = "MSISAuth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      // เปลี่ยนจากการเรียก ADFS โดยตรง เป็นเรียกผ่าน API endpoint
      window.location.href = `${config.apiUrl}/api/auth/logout/saml`;
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  const handleDelete = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/chat/history/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        handleTokenExpired();
        return;
      }

      if (response.ok) {
        // ถ้าลบแชทที่กำลังดูอยู่ ให้กลับไปหน้า New Chat
        if (currentChatId === chatId) {
          navigate('/mfuchatbot');
        }
        fetchChatHistories();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleEdit = (chatId: string, currentName: string) => {
    setRenameState({
      isEditing: true,
      chatId,
      newName: currentName,
      isLoading: false,
      error: null
    });
    setEditingChatId(chatId);
  };

  const handleSaveEdit = async (chatId: string) => {
    try {
      // Validate chat name
      if (!renameState.newName.trim()) {
        setRenameState(prev => ({ ...prev, error: 'Chat name cannot be empty' }));
        return;
      }

      if (renameState.newName.length > 100) {
        setRenameState(prev => ({ ...prev, error: 'Chat name too long (max 100 characters)' }));
        return;
      }

      // Sanitize chat name
      const sanitizedName = renameState.newName.trim().replace(/[<>]/g, '');

      const token = localStorage.getItem('auth_token');
      if (!token) {
        handleTokenExpired();
        return;
      }

      setRenameState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${config.apiUrl}/api/chat/history/${chatId}/rename`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newName: sanitizedName })
      });

      if (response.status === 401) {
        handleTokenExpired();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename chat');
      }

      // Reset states
      setRenameState({
        isEditing: false,
        chatId: null,
        newName: '',
        isLoading: false,
        error: null
      });
      setEditingChatId(null);

      fetchChatHistories();

    } catch (error) {
      console.error('Error updating chat name:', error);
      setRenameState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to rename chat',
        isLoading: false
      }));
    }
  };

  const cancelEdit = () => {
    setRenameState({
      isEditing: false,
      chatId: null,
      newName: '',
      isLoading: false,
      error: null
    });
    setEditingChatId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (renameState.chatId) {
        handleSaveEdit(renameState.chatId);
      }
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const filteredChats = chatHistories.filter(chat =>
    (chat.chatname || chat.name || 'Untitled Chat').toLowerCase().includes(searchQuery.toLowerCase())
  );
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    // console.log('Filtered chats:', filteredChats);
  }

  const sortedChats = [...filteredChats].sort((a, b) => {
    // First sort by pinned status
    if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;

    // Then sort by updatedAt timestamp
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    // console.log('Sorted chats:', sortedChats);
  }

  return (
    <aside className="flex flex-col h-full">
      <div className="flex-none p-4 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            <span style={{
              background: 'linear-gradient(to right, rgb(186, 12, 47), rgb(212, 175, 55))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>DIN</span>{''}
            <span>DIN</span>
            <span style={{
              background: 'linear-gradient(to right, #00FFFF, #0099FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}> AI</span>
          </h2>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <FaBars className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-2 pb-[calc(72px+env(safe-area-inset-bottom))]">
        <nav className="space-y-4">
          <div className="space-y-1">
            {/* New Chat with dropdown indicator */}
            <div className="relative">
              <Link
                to="/mfuchatbot"
                className={`flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/mfuchatbot' && !currentChatId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <FaComments className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="font-medium truncate">New Chat</span>
                </div>
                {sortedChats.length > 0 && (
                  <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </Link>

              {/* Search Bar - only shown when more than 10 chats */}
              {sortedChats.length > 10 && (
                <div className="px-4 py-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-1.5 pl-8 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    />
                    <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {/* Chat History List */}
              {sortedChats.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {sortedChats.map((chat) => (
                    <div key={chat._id} className="group relative rounded-lg transition-all duration-200">
                      {editingChatId === chat._id ? (
                        <div className="flex-1 flex items-center p-2 md:p-3">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={renameState.newName}
                              onChange={(e) => setRenameState(prev => ({ ...prev, newName: e.target.value, error: null }))}
                              onKeyDown={handleRenameKeyDown}
                              className={`w-full px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border 
                                ${renameState.error ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} 
                                rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm`}
                              autoFocus
                              disabled={renameState.isLoading}
                              placeholder="Enter new name..."
                              maxLength={100}
                            />
                            {renameState.error && (
                              <div className="absolute -bottom-6 left-0 text-xs text-red-500">
                                {renameState.error}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleSaveEdit(chat._id)}
                              disabled={renameState.isLoading}
                              className={`p-1.5 rounded-lg transition-colors
                                ${renameState.isLoading
                                  ? 'bg-gray-300 cursor-not-allowed'
                                  : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                              title="Save"
                            >
                              {renameState.isLoading ? (
                                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={renameState.isLoading}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg group-hover:shadow-sm">
                          <Link
                            to={`/mfuchatbot?chat=${chat._id}`}
                            className={`flex-1 flex items-center p-2 md:p-3 text-gray-700 dark:text-gray-200 rounded-lg transition-all duration-200 text-sm
                              ${currentChatId === chat._id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                          >
                            <div className="flex flex-col min-w-0 w-full pr-10">
                              <div className="font-medium truncate max-w-full">
                                {chat.chatname || 'Untitled Chat'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">
                                {chat.name}
                              </div>
                            </div>
                          </Link>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-lg px-1.5 py-1 shadow-sm">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEdit(chat._id, chat.chatname);
                              }}
                              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="Edit chat name"
                            >
                              <FaEdit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(chat._id);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="Delete chat"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isStaff && (
            <>
              <Link
                to="/modelCreation"
                className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/modelCreation' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                onClick={onClose}
              >
                <FaAndroid className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-medium truncate">Build Model</span>
              </Link>

              <Link
                to="/training"
                className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/training' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
              >
                <FaBookOpen className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-medium truncate">Knowledge Base</span>
              </Link>
            </>
          )}

          {isSuperAdmin && (
            <>
              <Link
                to="/admin/create"
                className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/admin/create' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                onClick={onClose}
              >
                <FaUserPlus className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-medium truncate">Create Admin</span>
              </Link>
              
              <Link
                to="/admin/manage"
                className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/admin/manage' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                onClick={onClose}
              >
                <FaUsers className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-medium truncate">Manage Admins</span>
              </Link>
              
              <Link
                to="/departments/manage"
                className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/departments/manage' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                onClick={onClose}
              >
                <FaBuilding className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-medium truncate">Manage Departments</span>
              </Link>
              
              <Link
                to="/statistics"
                className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/statistics' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                onClick={onClose}
              >
                <FaChartBar className="w-5 h-5 mr-3" />
                <span className="font-medium">Statistics</span>
              </Link>
              
              <Link
                to="/system-prompt"
                className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
                  ${location.pathname === '/system-prompt' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                onClick={onClose}
              >
                <FaCog className="w-5 h-5 mr-3" />
                <span className="font-medium">Edit System Prompt</span>
              </Link>
            </>
          )}

          {/* Help link */}
          <Link
            to="/help"
            className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200
              ${location.pathname === '/help' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
            onClick={onClose}
          >
            <FaQuestionCircle className="w-5 h-5 mr-3" />
            <span className="font-medium">Help</span>
          </Link>
        </nav>
      </div>

      <div className="fixed bottom-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)] lg:w-64 z-40">
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 border border-gray-200 dark:border-gray-700"
          >
            <FaSignOutAlt className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="font-medium truncate">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
