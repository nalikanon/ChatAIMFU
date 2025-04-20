import React, { useState, useEffect, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../utils/types';
import FileIcon from './FileIcon';
import { formatFileSize } from '../utils/formatters';
import { MdEdit } from 'react-icons/md';

interface MessageContentProps {
  message: Message;
}

const MessageContent: React.FC<MessageContentProps> = memo(({ message }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [contentKey, setContentKey] = useState<number>(0);
  
  // Force component to re-render when message.content changes
  useEffect(() => {
    // Re-render when content changes
    setContentKey(prevKey => prevKey + 1);
  }, [message.content]);

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Handle file open in new tab
  const handleFileOpen = (file: any) => {
    if (!file || !file.data || !file.mediaType) {
      alert("File data is missing or corrupted");
      return;
    }
    
    try {
      window.open(`data:${file.mediaType};base64,${file.data}`, '_blank');
    } catch (error) {
      alert("Unable to open file. The file might be corrupted.");
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const [, language = '', code = ''] = part.match(/```(\w*)\n?([\s\S]*?)```/) || [];
        return (
          <div key={index} className="my-2 relative">
            <div className="flex justify-between items-center bg-[#1E1E1E] text-white text-xs px-4 py-2 rounded-t">
              <span>{language || 'plaintext'}</span>
              <button
                onClick={() => copyToClipboard(code.trim(), index)}
                className="text-gray-400 hover:text-white"
              >
                {copiedIndex === index ? 'Copied!' : 'Copy code'}
              </button>
            </div>
            <SyntaxHighlighter
              language={language || 'plaintext'}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
            >
              {code.trim()}
            </SyntaxHighlighter>
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3" key={`message-content-${contentKey}`}>
      <div className="whitespace-pre-wrap">
        {renderContent(message.content)}
        {message.isEdited && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 italic">
            <MdEdit className="h-3 w-3" />
            <span>(Edited)</span>
          </div>
        )}
      </div>
      
      {message.images && message.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {message.images.map((image, idx) => (
            image && image.data && image.mediaType ? (
              <img
                key={idx}
                src={`data:${image.mediaType};base64,${image.data}`}
                alt={`Attached image ${idx + 1}`}
                className="max-h-60 rounded-lg cursor-pointer"
                onClick={() => window.open(`data:${image.mediaType};base64,${image.data}`, '_blank')}
              />
            ) : null
          ))}
        </div>
      )}
      
      {message.files && message.files.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {message.files.map((file, idx) => (
            file && file.name ? (
              <div 
                key={idx}
                className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                onClick={() => handleFileOpen(file)}
              >
                <FileIcon type={file.mediaType} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</span>
                </div>
              </div>
            ) : null
          ))}
        </div>
      )}
  
      {message.role === 'assistant' && message.content.includes('data:image/') && (
        <div className="mt-2">
          <img 
            src={message.content.match(/data:image\/[^;]+;base64,[^"]+/)?.[0] || ''}
            alt="Generated image"
            className="max-h-96 mx-auto rounded-lg"
          />
        </div>
      )}
    </div>
  );
});

export default MessageContent; 