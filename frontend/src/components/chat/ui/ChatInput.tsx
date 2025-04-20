import React, { useRef, useEffect } from 'react';
import { RiFileAddFill, RiCloseLine } from 'react-icons/ri';
import { MdEdit } from "react-icons/md";
import FileIcon from './FileIcon';
import ModelSelector from './ModelSelector';
import TokenUsageDisplay from './TokenUsageDisplay';
import { Message, Model, Usage } from '../utils/types';

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  selectedImages: File[];
  selectedFiles: File[];
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: (index: number) => void;
  handleRemoveFile: (index: number) => void;
  isImageGenerationMode: boolean;
  setIsImageGenerationMode: (mode: boolean) => void;
  models: Model[];
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  isLoading: boolean;
  canSubmit: () => boolean;
  usage: Usage | null;
  isMobile: boolean;
  editingMessage?: Message | null;
  handleCancelGeneration?: (e: React.MouseEvent) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  handleSubmit,
  handleKeyDown,
  handlePaste,
  selectedImages,
  selectedFiles,
  handleFileSelect,
  handleRemoveImage,
  handleRemoveFile,
  isImageGenerationMode,
  setIsImageGenerationMode,
  models,
  selectedModel,
  setSelectedModel,
  isLoading,
  canSubmit,
  usage,
  editingMessage,
  handleCancelGeneration
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    autoResize();
  }, [inputMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const lineHeight = 24;
      const maxLines = 5;
      const maxHeight = lineHeight * maxLines;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (isLoading && handleCancelGeneration) {
      handleCancelGeneration(e);
    } else {
      handleSubmit(e as any);
    }
  };
  
  return (

      <form onSubmit={handleSubmit} className="p-2 md:p-4 w-full">
        <div className="flex flex-col gap-2 w-full max-w-[95%] lg:max-w-[85%] mx-auto">
          {/* Edit mode indicator */}
          {editingMessage && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-800 rounded-md text-sm">
              <MdEdit className="h-4 w-4" />
              <span>Editing message</span>
            </div>
          )}
      
          {/* Message input area */}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="flex-1 min-w-0 p-2 text-sm md:text-base rounded-2xl border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none
                scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 
                scrollbar-track-transparent hover:scrollbar-thumb-gray-400 
                dark:hover:scrollbar-thumb-gray-500 scrollbar-thumb-rounded-full"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(209 213 219) transparent',
                minHeight: '44px',
                maxHeight: '150px'
              }}
              placeholder={
                selectedImages.length > 0 
                  ? "Please describe or ask about these images..." 
                  : "Type a message..."
              }
              rows={1}
              autoComplete="off"
              spellCheck="false"
              data-verify="false"
            />
            
            <button
              type={isLoading ? "button" : "submit"}
              onClick={isLoading ? handleButtonClick : undefined}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                isLoading ? 'bg-red-500 hover:bg-red-600 text-white' :
                canSubmit() ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }`}
              disabled={!isLoading && !canSubmit()}
              data-verify="false"
            >
              {isLoading ? (
                <div className="flex items-center justify-center w-6 h-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Controls and options */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            {/* Left side controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <ModelSelector 
                models={models}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
              />
              
              {/* ซ่อนปุ่ม Image Gen */}
              {false && (
                <button
                  type="button"
                  onClick={() => setIsImageGenerationMode(!isImageGenerationMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors
                    ${isImageGenerationMode 
                      ? 'border-purple-400 dark:border-purple-500 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' 
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs whitespace-nowrap">
                    {isImageGenerationMode ? 'Image Gen: ON' : 'Image Gen: OFF'}
                  </span>
                </button>
              )}

              {/* แสดงปุ่มแนบไฟล์เสมอ (ไม่ขึ้นกับ isImageGenerationMode) */}
              <>
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ppt,.pptx"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  className="px-3 py-1.5 flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  onClick={() => {
                    document.getElementById('file-upload')?.click();
                  }}
                >
                  <RiFileAddFill className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 hidden md:inline">Attach File</span>
                </button>
              </>

              {usage && <TokenUsageDisplay usage={usage} />}
            </div>
          </div>

          {/* Combined Attached Files Preview */}
          {(selectedImages.length > 0 || selectedFiles.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="w-full text-xs text-gray-500 dark:text-gray-400 mb-1">
                Attached Files ({selectedImages.length + selectedFiles.length})
              </div>
              
              {/* Image previews */}
              {selectedImages.map((image, index) => (
                <div key={`img-${index}`} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    <RiCloseLine />
                  </button>
                </div>
              ))}
              
              {/* Document previews */}
              {selectedFiles.map((file, index) => (
                <div key={`doc-${index}`} className="relative">
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <FileIcon fileName={file.name} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 rounded-b-lg">
                    <div className="px-1 py-0.5 text-white text-[8px] truncate">
                      {file.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    <RiCloseLine />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
  );
};

export default ChatInput;