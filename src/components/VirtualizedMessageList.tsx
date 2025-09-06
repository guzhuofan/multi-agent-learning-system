import React from 'react';
// import { FixedSizeList as List } from 'react-window';
import MessageBubble from './MessageBubble';
import type { Message } from '../store/slices/chatSlice';

interface VirtualizedMessageListProps {
  messages: Message[];
  onCreateBranch?: (messageId: string, topic: string) => void;
  onCopyMessage?: (content: string) => void;
  onQuoteMessage?: (content: string) => void;
  isLoading?: boolean;
  currentAgentTopic?: string;
  highlightedMessageId?: string;
}



// const MessageItem: React.FC<MessageItemProps> = ({ index, style, data }) => { // 暂时注释，未使用
//   const {
//     messages,
//     onCreateBranch,
//     onCopyMessage,
//     onQuoteMessage,
//     currentAgentTopic,
//     highlightedMessageId
//   } = data;
//   
//   const message = messages[index];
//   
//   const handleCreateBranch = useCallback((messageId: string) => {
//     if (onCreateBranch) {
//       const topic = `关于 "${message.content.slice(0, 30)}..." 的深入探讨`;
//       onCreateBranch(messageId, topic);
//     }
//   }, [message.content, onCreateBranch]);
//   
//   const handleCopyMessage = useCallback((content: string) => {
//     if (onCopyMessage) {
//       onCopyMessage(content);
//     } else {
//       navigator.clipboard.writeText(content);
//     }
//   }, [onCopyMessage]);
//   
//   const handleQuoteMessage = useCallback((content: string) => {
//     if (onQuoteMessage) {
//       onQuoteMessage(content);
//     }
//   }, [onQuoteMessage]);
//   
//   return (
//     <div style={style} className="px-6 py-3">
//       <MessageBubble
//         message={message}
//         onCreateBranch={handleCreateBranch}
//         onCopyMessage={handleCopyMessage}
//         onQuoteMessage={handleQuoteMessage}
//         showBranchButton={message.role === 'assistant'}
//         isHighlighted={highlightedMessageId === message.id}
//         agentTopic={currentAgentTopic || ''}
//       />
//     </div>
//   );
// }; // 暂时注释，未使用

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  onCreateBranch,
  onCopyMessage,
  onQuoteMessage,
  isLoading,
  currentAgentTopic,
  highlightedMessageId
}) => {
  // const itemData = useMemo(() => ({ // 暂时注释，未使用
  //   messages,
  //   onCreateBranch,
  //   onCopyMessage,
  //   onQuoteMessage,
  //   currentAgentTopic,
  //   highlightedMessageId
  // }), [
  //   messages,
  //   onCreateBranch,
  //   onCopyMessage,
  //   onQuoteMessage,
  //   currentAgentTopic,
  //   highlightedMessageId
  // ]);
  
  // 动态计算消息高度（简化版本，实际可以更精确）
  // const getItemSize = useCallback((index: number) => { // 暂时注释，未使用
  //   const message = messages[index];
  //   const baseHeight = 80; // 基础高度
  //   const contentLines = Math.ceil(message.content.length / 50); // 估算行数
  //   return Math.max(baseHeight, contentLines * 20 + 60);
  // }, [messages]);
  
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-xl font-semibold mb-2">开始你的学习之旅</h2>
        <p className="text-center max-w-md text-gray-400">
          与AI助手开始对话，在学习过程中可以随时创建分支来深入探讨感兴趣的话题。
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">💡 提问</span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">🔍 探索</span>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">🌿 分支</span>
        </div>
      </div>
    );
  }
  
  // 临时禁用虚拟滚动，直接渲染所有消息
  return (
    <div className="flex-1 overflow-y-auto" style={{ height: 600 }}>
      {messages.map((message) => (
        <div key={message.id} style={{ height: 120 }}>
          <MessageBubble
            message={message}
            onCreateBranch={(messageId) => {
              if (onCreateBranch) {
                const topic = `关于 "${message.content.slice(0, 30)}..." 的深入探讨`;
                onCreateBranch(messageId, topic);
              }
            }}
            onCopyMessage={onCopyMessage || ((content) => navigator.clipboard.writeText(content))}
            onQuoteMessage={onQuoteMessage}
            showBranchButton={message.role === 'assistant'}
            isHighlighted={highlightedMessageId === message.id}
            agentTopic={currentAgentTopic || ''}
          />
        </div>
      ))}
      
      {/* 加载动画 */}
      {isLoading && (
        <div className="flex justify-start p-6">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <div className="loading-dots">
                <div className="loading-dot" style={{ animationDelay: '0ms' }} />
                <div className="loading-dot" style={{ animationDelay: '150ms' }} />
                <div className="loading-dot" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-500 ml-2">AI正在思考...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualizedMessageList;