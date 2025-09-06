import React, { useState, useRef, useEffect } from 'react';
import { Settings, GitBranch, Copy, AlertCircle } from 'lucide-react';
import { Agent, Message, AgentNode, SessionStats } from '../types';
import MessageBubble from './MessageBubble';
import BranchTreePanel from './BranchTreePanel';
import LoadingSpinner from './LoadingSpinner';

interface ChatInterfaceProps {
  currentAgent: Agent;
  messages: Message[];
  agentHierarchy: AgentNode[];
  sessionStats?: SessionStats;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onCreateBranch: (messageId: string, topic: string) => void;
  onSwitchAgent: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
  onCopyMessage?: (content: string) => void;
  onQuoteMessage?: (content: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentAgent,
  messages,
  agentHierarchy,
  sessionStats,
  isLoading,
  onSendMessage,
  onCreateBranch,
  onSwitchAgent,
  onDeleteAgent,
  onCopyMessage,
  onQuoteMessage
}) => {
  // 🔍 调试信息：输出messages prop的详细信息
  console.log('🔍 ChatInterface 调试信息:');
  console.log('📨 messages prop:', messages);
  console.log('📊 messages 长度:', messages?.length || 0);
  console.log('🎯 currentAgent:', currentAgent);
  console.log('🆔 currentAgent.id:', currentAgent?.id);
  console.log('📋 messages 数组详情:', messages?.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content?.substring(0, 50) + '...',
    agentId: msg.agentId,
    timestamp: msg.timestamp
  })));
  const [inputValue, setInputValue] = useState('');
  const [showBranchPanel, setShowBranchPanel] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [branchTopic, setBranchTopic] = useState('');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  // const [branchCreationSuccess, setBranchCreationSuccess] = useState(false); // 暂时注释，未使用
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);
  
  const handleSendMessage = async () => {
    if (inputValue.trim() && !isLoading) {
      const messageContent = inputValue.trim();
      setInputValue('');
      setError(null);
      
      try {
        await onSendMessage(messageContent);
      } catch (error: unknown) {
        console.error('发送消息失败:', error);
        setError(error instanceof Error ? error.message : '发送消息失败，请重试');
      }
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleCreateBranch = (messageId: string) => {
    setSelectedMessageId(messageId);
    setBranchTopic(''); // 清空之前的输入
    setShowBranchModal(true);
  };
  
  const handleConfirmBranch = async () => {
    if (selectedMessageId && branchTopic.trim() && !isCreatingBranch) {
      setIsCreatingBranch(true);
      try {
        await onCreateBranch(selectedMessageId, branchTopic.trim());
        // setBranchCreationSuccess(true); // 暂时注释，未使用
        
        // 显示成功反馈
        setTimeout(() => {
          setShowBranchModal(false);
          setBranchTopic('');
          setSelectedMessageId(null);
          // setBranchCreationSuccess(false); // 暂时注释，未使用
          setIsCreatingBranch(false);
        }, 1500);
      } catch (error) {
        console.error('创建分支失败:', error);
        setIsCreatingBranch(false);
      }
    }
  };
  
  const handleCancelBranch = () => {
    setShowBranchModal(false);
    setBranchTopic('');
    setSelectedMessageId(null);
  };
  
  const handleCopyMessage = (content: string) => {
    if (onCopyMessage) {
      onCopyMessage(content);
    } else {
      navigator.clipboard.writeText(content);
    }
  };
  
  const handleQuoteMessage = (content: string) => {
    if (onQuoteMessage) {
      onQuoteMessage(content);
    } else {
      const quotedText = `> ${content.replace(/\n/g, '\n> ')}\n\n`;
      setInputValue(prev => prev + quotedText);
    }
  };
  
  const isMainAgent = currentAgent?.agentType === 'main';
  
  return (
    <div className="chat-container bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Agent信息显示 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={`
                p-1.5 rounded transition-colors
                ${currentAgent?.agentType === 'main' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
              `}>
                {currentAgent?.agentType === 'main' ? '🎯' : '🌿'}
              </div>
              <div>
                <div className="font-medium text-gray-900 truncate">
                  {currentAgent?.topic || '多Agent学习助手'}
                </div>
                <div className="text-sm text-gray-500">
                  {currentAgent?.agentType === 'main' ? '主Agent' : `分支Agent (深度: ${currentAgent?.stackDepth})`}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 会话统计 */}
          {sessionStats && (
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 mr-4">
              <span>消息: {messages?.length || 0}</span>
              <span>深度: L{currentAgent?.parentId ? '1+' : '0'}</span>
            </div>
          )}
          
          {/* Agent设置按钮 */}
          <button 
            onClick={() => setShowAgentMenu(!showAgentMenu)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 relative group"
            title="Agent设置"
          >
            <Settings size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            {showAgentMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                <div className="py-1">
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Settings size={14} />
                    Agent设置
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Copy size={14} />
                    导出对话
                  </button>
                </div>
              </div>
            )}
          </button>
          
          {/* 分支树按钮 */}
          <button 
            onClick={() => setShowBranchPanel(true)}
            className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 relative group"
            title="查看学习路径"
          >
            <GitBranch size={18} className="group-hover:scale-110 transition-transform duration-200" />
            {(agentHierarchy?.length || 0) > 1 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
                {agentHierarchy?.length || 0}
              </div>
            )}
          </button>
        </div>
      </div>
      
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-gray-50/30">
        {(() => {
          // 🔍 调试信息：消息渲染条件检查
          const messagesLength = messages?.length || 0;
          console.log('🔍 消息渲染条件检查:');
          console.log('📊 messagesLength:', messagesLength);
          console.log('❓ 是否显示空状态:', messagesLength === 0);
          console.log('❓ 是否显示消息列表:', messagesLength > 0);
          
          if (messagesLength === 0) {
            console.log('✅ 渲染空状态界面');
            return (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4">
                  {isMainAgent ? '🎯' : '🌿'}
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  {isMainAgent ? '开始你的学习之旅' : '深入探索特定话题'}
                </h2>
                <p className="text-center max-w-md text-gray-400">
                  {isMainAgent 
                    ? '与AI助手开始对话，在学习过程中可以随时创建分支来深入探讨感兴趣的话题。'
                    : '在这个分支中专注探讨特定话题，不会影响主线学习进程。'
                  }
                </p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">💡 提问</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">🔍 探索</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">🌿 分支</span>
                </div>
              </div>
            );
          } else {
            console.log('✅ 渲染消息列表，消息数量:', messagesLength);
            console.log('📋 准备渲染的消息:', messages?.map(msg => `${msg.id} (${msg.role})`));
            return (messages || []).map((message, index) => {
              console.log(`🔍 渲染消息 ${index + 1}/${messagesLength}:`, {
                id: message.id,
                role: message.role,
                content: message.content?.substring(0, 30) + '...',
                agentId: message.agentId
              });
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCreateBranch={handleCreateBranch}
                  onCopyMessage={handleCopyMessage}
                  onQuoteMessage={handleQuoteMessage}
                  showBranchButton={!isLoading && message.role === 'assistant'}
                  isHighlighted={highlightedMessageId === message.id}
                  agentTopic={currentAgent?.topic || ''}
                />
              );
            });
          }
        })()}
        
        {/* 加载动画 */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm animate-pulse">
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" text="AI正在思考..." />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-600 hover:text-red-800 underline mt-1"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-4 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isMainAgent ? "💭 开始学习对话..." : "🌿 在分支中深入探讨..."}
              className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" text="发送中..." />
            ) : (
              '发送 ✨'
            )}
          </button>
        </div>
        
        {/* 输入提示 */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>按 Enter 发送，Shift + Enter 换行，Ctrl+Enter快速发送</span>
          <span>{inputValue.length}/2000</span>
        </div>
      </div>
      
      {/* 分支树面板 */}
      <BranchTreePanel
        agentHierarchy={agentHierarchy || []}
        currentAgentId={currentAgent?.id || ''}
        onSwitchAgent={onSwitchAgent}
        onDeleteAgent={onDeleteAgent}
        sessionStats={sessionStats}
        onClose={() => setShowBranchPanel(false)}
        isVisible={showBranchPanel}
      />
      
      {/* 创建分支模态框 */}
      {showBranchModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={handleCancelBranch} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-96 z-50">
            <h3 className="text-lg font-semibold mb-4">创建分支Agent</h3>
            <p className="text-gray-600 mb-4 text-sm">
              为这个分支设置一个主题，AI将专注于深入探讨这个话题。
            </p>
            <input
              type="text"
              value={branchTopic}
              onChange={(e) => setBranchTopic(e.target.value)}
              placeholder="例如：Transformer注意力机制详解"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agent-main focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelBranch}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={handleConfirmBranch}
                disabled={!branchTopic.trim()}
                className="px-6 py-2 bg-agent-branch text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                创建分支
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatInterface;
export type { Agent, ChatInterfaceProps };