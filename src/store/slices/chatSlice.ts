/**
 * ChatSlice - 多Agent学习系统的消息管理模块
 * 
 * 功能职责：
 * - 管理所有Agent的消息历史
 * - 处理用户消息和AI回复的存储
 * - 支持消息的增删改查操作
 * - 维护消息的时间顺序和完整性
 * 
 * 设计特点：
 * - 按Agent ID分组存储消息，实现消息隔离
 * - 支持实时消息添加和历史回溯
 * - 消息不可变性，确保历史记录的完整性
 * - 高效的消息检索和渲染支持
 * 
 * @author Multi-Agent Learning System Team
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// 类型定义
export interface Message {
  id: string;
  agentId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    branchable?: boolean;
    tokens?: number;
    model?: string;
  };
}

export interface Conversation {
  id: string;
  agentId: string;
  messages: Message[];
  startedAt: string;
  lastActivity: string;
}

/**
 * 聊天状态接口 - Redux状态结构
 * 
 * @interface ChatState
 * @property {Record<string, Message[]>} messagesByAgent - 按Agent ID分组的消息字典
 *   - 键：Agent ID
 *   - 值：该Agent的消息数组，按时间顺序排列
 */
interface ChatState {
  // 当前对话
  currentConversationId: string | null;
  // 所有对话
  conversations: Record<string, Conversation>;
  // Agent对应的消息
  messagesByAgent: Record<string, Message[]>;
  // 发送状态
  sending: boolean;
  // 错误信息
  error: string | null;
}

/**
 * 初始状态 - 聊天管理的默认状态
 * 
 * 特点：
 * - 空的消息字典，等待Agent创建后填充
 * - 每个新Agent会自动在此字典中创建对应的消息数组
 */
const initialState: ChatState = {
  currentConversationId: null,
  conversations: {},
  messagesByAgent: {},
  sending: false,
  error: null,
};

// 异步thunks
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (params: { agentId: string; content: string }) => {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error('发送消息失败');
    }
    
    return response.json();
  }
);

export const loadConversation = createAsyncThunk(
  'chat/loadConversation',
  async (agentId: string) => {
    const response = await fetch(`/api/chat/conversation/${agentId}`);
    
    if (!response.ok) {
      throw new Error('加载对话失败');
    }
    
    return response.json();
  }
);

/**
 * Chat Slice - Redux Toolkit切片定义
 * 
 * 包含所有消息相关的状态管理逻辑：
 * - 用户消息添加：处理用户输入的消息
 * - AI消息添加：处理AI回复的消息
 * - 消息清理：支持清空特定Agent的消息历史
 * - 消息查询：高效检索和过滤消息
 */
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /**
     * 添加用户消息
     * 
     * @param state - 当前聊天状态
     * @param action - 包含Agent ID和消息内容的action
     * 
     * 功能：
     * - 为指定Agent创建新的用户消息
     * - 自动生成唯一消息ID和时间戳（如果未提供）
     * - 如果Agent的消息数组不存在，自动创建
     * - 保持消息的时间顺序
     */
    addUserMessage: (state, action: PayloadAction<{ 
      agentId: string; 
      content: string; 
      messageId?: string; 
      timestamp?: string 
    }>) => {
      const { agentId, content, messageId, timestamp } = action.payload;
      
      // 确保Agent的消息数组存在
      if (!state.messagesByAgent[agentId]) {
        state.messagesByAgent[agentId] = [];
      }
      
      // 创建用户消息对象
      const message: Message = {
        id: messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        role: 'user',
        content,
        timestamp: timestamp || new Date().toISOString(),
      };
      
      // 检查消息是否已存在（避免重复添加）
      const existingMessage = state.messagesByAgent[agentId].find(msg => msg.id === message.id);
      if (!existingMessage) {
        // 添加到对应Agent的消息数组末尾
        state.messagesByAgent[agentId].push(message);
      }
    },
    
    /**
     * 添加AI助手消息
     * 
     * @param state - 当前聊天状态
     * @param action - 包含完整Message对象的action
     * 
     * 功能：
     * - 添加AI生成的回复消息
     * - 支持预构建的Message对象
     * - 自动维护Agent消息数组
     * - 用于处理异步AI回复
     * - 避免重复添加相同消息
     */
    addAssistantMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      
      // 确保Agent的消息数组存在
      if (!state.messagesByAgent[message.agentId]) {
        state.messagesByAgent[message.agentId] = [];
      }
      
      // 检查消息是否已存在（避免重复添加）
      const existingMessage = state.messagesByAgent[message.agentId].find(msg => msg.id === message.id);
      if (!existingMessage) {
        // 添加AI消息到对应Agent的消息数组
        state.messagesByAgent[message.agentId].push(message);
      }
    },
    
    // 更新消息
    updateMessage: (state, action: PayloadAction<{ messageId: string; updates: Partial<Message> }>) => {
      const { messageId, updates } = action.payload;
      
      // 在所有Agent的消息中查找并更新
      Object.values(state.messagesByAgent).forEach(messages => {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
          messages[messageIndex] = { ...messages[messageIndex], ...updates };
        }
      });
    },
    
    // 设置当前对话
    setCurrentConversation: (state, action: PayloadAction<string>) => {
      state.currentConversationId = action.payload;
    },
    
    /**
     * 清空指定Agent的消息历史
     * 
     * @param state - 当前聊天状态
     * @param action - 包含Agent ID的action
     * 
     * 用途：
     * - 用户主动清空对话历史
     * - 重置Agent状态
     * - 性能优化时清理过多的历史消息
     * - 隐私保护需求
     */
    clearAgentMessages: (state, action: PayloadAction<string>) => {
      const agentId = action.payload;
      delete state.messagesByAgent[agentId];
    },
    
    /**
     * 删除指定消息
     * 
     * @param state - 当前聊天状态
     * @param action - 包含消息ID的action
     * 
     * 功能：
     * - 从消息历史中移除特定消息
     * - 支持用户撤回或管理员删除
     * - 保持消息数组的连续性
     */
    deleteMessage: (state, action: PayloadAction<{ agentId: string; messageId: string }>) => {
      const { agentId, messageId } = action.payload;
      if (state.messagesByAgent[agentId]) {
        state.messagesByAgent[agentId] = state.messagesByAgent[agentId].filter(
          message => message.id !== messageId
        );
      }
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    
    // 重置聊天状态
    resetChatState: (state) => {
      Object.assign(state, initialState);
    },
  },
  
  extraReducers: (builder) => {
    // 发送消息
    builder
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        const { assistantMessage } = action.payload;
        
        // 添加助手回复
        if (!state.messagesByAgent[assistantMessage.agentId]) {
          state.messagesByAgent[assistantMessage.agentId] = [];
        }
        state.messagesByAgent[assistantMessage.agentId].push(assistantMessage);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.error.message || '发送消息失败';
      })
      
      // 加载对话
      .addCase(loadConversation.pending, (state) => {
        state.error = null;
      })
      .addCase(loadConversation.fulfilled, (state, action) => {
        const { agentId, messages } = action.payload;
        state.messagesByAgent[agentId] = messages;
      })
      .addCase(loadConversation.rejected, (state, action) => {
        state.error = action.error.message || '加载对话失败';
      });
  },
});

export const {
  addUserMessage,
  addAssistantMessage,
  updateMessage,
  setCurrentConversation,
  clearAgentMessages,
  clearError,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;

// Selectors
export const selectMessagesByAgent = (agentId: string) => (state: { chat: ChatState }) => {
  return state.chat.messagesByAgent[agentId] || [];
};

export const selectCurrentMessages = (state: { chat: ChatState; agent: { currentAgentId: string | null } }) => {
  const { currentAgentId } = state.agent;
  if (!currentAgentId) return [];
  return state.chat.messagesByAgent[currentAgentId] || [];
};

export const selectChatSending = (state: { chat: ChatState }) => state.chat.sending;

export const selectChatError = (state: { chat: ChatState }) => state.chat.error;

export const selectAllConversations = (state: { chat: ChatState }) => state.chat.conversations;