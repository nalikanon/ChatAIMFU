import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import WelcomeMessage from '../chat/ui/WelcomeMessage';
import ChatBubble from '../chat/ui/ChatBubble';
import ChatInput from '../chat/ui/ChatInput';
import ScrollToBottomButton from '../chat/ui/ScrollToBottomButton';
import { useChatStore } from '../chat/store/chatStore';
import { useModelStore } from '../chat/store/modelStore';
import { useUIStore } from '../chat/store/uiStore';
import { isValidObjectId } from '../chat/utils/formatters';
import useScrollManager from '../../hooks/useScrollManager';

const MFUChatbot: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Using useScrollManager hook for scroll management
  const {
    messagesEndRef,
    chatContainerRef,
    isNearBottom,
    messageCount: _messageCount,
    setMessageCount,
    handleScrollToBottom
  } = useScrollManager();
  
  // Chat state from Zustand
  const {
    messages,
    currentChatId,
    selectedImages,
    selectedFiles,
    editingMessage,
    setCurrentChatId,
    initWebSocket,
    loadChatHistory,
    handleSubmit,
    handleKeyDown,
    handlePaste,
    handleContinueClick,
    handleCancelGeneration,
    handleEditMessage,
    handleRegenerateMessage,
    handleFileSelect,
    handleRemoveImage,
    handleRemoveFile,
    canSubmit
  } = useChatStore();
  
  // UI state from Zustand
  const {
    isLoading,
    isImageGenerationMode,
    isMobile,
    inputMessage,
    setInputMessage,
    setIsImageGenerationMode,
  } = useUIStore();
  
  // Model state from Zustand
  const {
    models,
    selectedModel,
    usage,
    setSelectedModel,
    fetchUsage,
    fetchModels
  } = useModelStore();
  
  // Update message count when messages change
  useEffect(() => {
    setMessageCount(messages.length);
  }, [messages, setMessageCount]);
  
  // Initialize WebSocket when component mounts
  useEffect(() => {
    initWebSocket();
  }, [initWebSocket]);
  
  // Fetch models when component mounts
  useEffect(() => {
    console.log('Fetching models...');
    fetchModels();
  }, [fetchModels]);
  
  // Only update URL when response is complete - not during streaming
  useEffect(() => {
    const handleChatUpdated = (event: CustomEvent) => {
      const { chatId, complete } = event.detail || {};
      // Only update URL when response is complete
      if (chatId && complete) {
        navigate(`/mfuchatbot?chat=${chatId}`, { replace: true });
      } else if (chatId && chatId !== currentChatId) {
        // Just update the internal state without navigation
        setCurrentChatId(chatId);
      }
    };
    
    // Handle the early URL updates from WebSocket messages
    const handleChatUrlUpdated = (event: CustomEvent) => {
      const { chatId, early } = event.detail || {};
      if (chatId && early && chatId !== currentChatId) {
        console.log('URL updated early for chatId:', chatId);
        setCurrentChatId(chatId);
      }
    };
    
    window.addEventListener('chatUpdated', handleChatUpdated as EventListener);
    window.addEventListener('chatUrlUpdated', handleChatUrlUpdated as EventListener);
    
    return () => {
      window.removeEventListener('chatUpdated', handleChatUpdated as EventListener);
      window.removeEventListener('chatUrlUpdated', handleChatUrlUpdated as EventListener);
    };
  }, [currentChatId, setCurrentChatId, navigate]);
  
  // Load chat history from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const chatId = urlParams.get('chat');
    
    if (chatId && isValidObjectId(chatId)) {
      console.log('Loading chat history for:', chatId);
      loadChatHistory(chatId);
      setCurrentChatId(chatId);
    } else {
      // Reset chat when navigating to /mfuchatbot without chat ID
      console.log('No valid chat ID found');
      useChatStore.getState().resetChat();
    }
  }, [location.search, loadChatHistory, setCurrentChatId]);
  
  // Fetch usage data when component mounts
  useEffect(() => {
    fetchUsage();
    
    // Update token data when there's a new message or response
    const handleUpdateUsage = () => {
      fetchUsage();
    };
    
    window.addEventListener('chatMessageReceived', handleUpdateUsage);
    window.addEventListener('chatUpdated', handleUpdateUsage);
    
    return () => {
      window.removeEventListener('chatMessageReceived', handleUpdateUsage);
      window.removeEventListener('chatUpdated', handleUpdateUsage);
    };
  }, [fetchUsage]);
  
  return (
    <div className="flex flex-col h-full relative">
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 pb-32 overscroll-contain scroll-smooth"
        ref={chatContainerRef}
        id="chat-messages"
        data-testid="chat-messages-container"
      >
        {messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => {
              // Check if this is the latest assistant message
              const isLastAssistantMessage = (() => {
                // Start searching from the latest message
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].role === 'assistant' && i === index) {
                    return true;
                  } else if (messages[i].role === 'assistant') {
                    return false;
                  }
                }
                return false;
              })();

              return (
                <ChatBubble 
                  key={message.id}
                  message={message}
                  isLastMessage={index === messages.length - 1}
                  isLoading={isLoading}
                  onContinueClick={handleContinueClick}
                  onCancelClick={handleCancelGeneration}
                  onEditClick={handleEditMessage}
                  onRegenerateClick={handleRegenerateMessage}
                  selectedModel={selectedModel}
                  messageIndex={index}
                  isLastAssistantMessage={isLastAssistantMessage}
                />
              );
            })}
            <div 
              ref={messagesEndRef} 
              id="chat-bottom-anchor"
              data-testid="chat-bottom-anchor"
              className="h-2 w-full my-2"
            />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        {/* Show scroll to bottom button when there are messages and user is not at the bottom */}
        {messages.length > 0 && (
          <div className="relative w-full max-w-[95%] lg:max-w-[85%] mx-auto h-0">
            <ScrollToBottomButton 
              isNearBottom={isNearBottom}
              onClick={handleScrollToBottom}
            />
          </div>
        )}
        
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          handlePaste={handlePaste}
          selectedImages={selectedImages}
          selectedFiles={selectedFiles}
          handleFileSelect={handleFileSelect}
          handleRemoveImage={handleRemoveImage}
          handleRemoveFile={handleRemoveFile}
          isImageGenerationMode={isImageGenerationMode}
          setIsImageGenerationMode={setIsImageGenerationMode}
          models={models}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isLoading={isLoading}
          canSubmit={canSubmit}
          usage={usage}
          isMobile={isMobile}
          editingMessage={editingMessage}
          handleCancelGeneration={handleCancelGeneration}
        />
      </div>
      
    </div>
  );
};

export default MFUChatbot;
