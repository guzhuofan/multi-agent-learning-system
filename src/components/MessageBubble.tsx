import React, { useState, useRef, useEffect } from 'react';
import { Copy, GitBranch, Quote, MoreVertical } from 'lucide-react';
import type { Message } from '../store/slices/chatSlice';

interface MessageBubbleProps {
  message: Message;
  onCreateBranch?: (messageId: string, content: string) => void;
  onCopyMessage?: (content: string) => void;
  onQuoteMessage?: (messageId: string, content: string) => void;
  showBranchButton?: boolean;
  isHighlighted?: boolean;
  agentTopic?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onCreateBranch,
  onCopyMessage,
  onQuoteMessage,
  showBranchButton = true,
  isHighlighted = false,
  agentTopic = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isUser = message.role === 'user';
  const isBranchable = message.metadata?.branchable !== false;
  
  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleCreateBranch = async () => {
    if (onCreateBranch && !isCreatingBranch) {
      setIsCreatingBranch(true);
      try {
        // 传递消息ID而不是内容，让父组件处理分支创建逻辑
        await onCreateBranch(message.id, '');
      } finally {
        setIsCreatingBranch(false);
        setShowMenu(false);
      }
    }
  };
  
  const handleCopyMessage = () => {
    if (onCopyMessage) {
      onCopyMessage(message.content);
    }
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };
  
  const handleQuoteMessage = () => {
    if (onQuoteMessage) {
      onQuoteMessage(message.id, message.content);
    }
    setShowMenu(false);
  };
  
  return (
    <div 
      className={`relative group transition-all duration-200 ${
        isUser 
          ? 'flex justify-end mb-4' 
          : 'flex justify-start mb-4'
      } ${
        isHighlighted ? 'bg-blue-50 -mx-4 px-4 py-2 rounded-lg' : ''
      }`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* 消息气泡 */}
      <div 
        className={`relative max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-md' 
            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
        }`}
      >
        {/* 消息内容 */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>
        
        {/* 消息元信息 */}
        <div className={`flex items-center justify-between mt-2 text-xs ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <span>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          
          {/* 模型信息（仅AI消息） */}
          {!isUser && message.metadata?.model && (
            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              {message.metadata.model}
            </span>
          )}
        </div>
        
        {/* 分支指示器 */}
        {!isUser && isBranchable && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
            <div className="w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        )}
      </div>
      
      {/* 悬停操作菜单 */}
      {showMenu && (
        <div 
          ref={menuRef}
          className={`absolute z-10 ${
            isUser ? 'right-0 mr-2' : 'left-0 ml-2'
          } top-0 mt-1`}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {/* 复制消息 */}
            <button
              onClick={handleCopyMessage}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Copy size={14} />
              复制消息
            </button>
            
            {/* 引用消息 */}
            <button
              onClick={handleQuoteMessage}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Quote size={14} />
              引用回复
            </button>
            
            {/* 创建分支（仅AI消息且可分支） */}
            {!isUser && isBranchable && showBranchButton && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleCreateBranch}
                  disabled={isCreatingBranch}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                    isCreatingBranch 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-green-700 hover:bg-green-50'
                  }`}
                  title={`基于此回答创建新的分支Agent探讨相关话题`}
                >
                  <GitBranch size={14} className={isCreatingBranch ? 'animate-pulse' : ''} />
                  {isCreatingBranch ? '创建中...' : '创建分支'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
export type { Message, MessageBubbleProps };