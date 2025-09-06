/**
 * AgentSlice - 多Agent学习系统的核心状态管理
 * 
 * 功能职责：
 * - 管理所有Agent的创建、更新和删除
 * - 维护Agent层级关系和栈帧结构
 * - 处理Agent切换和会话管理
 * - 支持分支Agent的创建和上下文继承
 * 
 * 核心概念：
 * - 栈帧式架构：每个Agent都有明确的栈深度和父子关系
 * - 上下文继承：分支Agent继承父Agent的对话上下文
 * - 无污染设计：分支探索不影响主线对话
 * 
 * @author Multi-Agent Learning System Team
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// 类型定义
export interface Agent {
  id: string;
  sessionId: string;
  parentId?: string;
  agentType: 'main' | 'branch';
  topic: string;
  contextData: {
    inheritedContext?: any;
    systemPrompt?: string;
    temperature?: number;
  };
  stackDepth: number;
  status: 'active' | 'suspended' | 'completed';
  createdAt: string;
}

export interface AgentNode {
  id: string;
  parentId?: string;
  agentType: 'main' | 'branch';
  topic: string;
  level: number;
  children?: AgentNode[];
}

/**
 * Agent状态接口 - Redux状态结构
 * 
 * @interface AgentState
 * @property {string | null} currentSessionId - 当前会话ID
 * @property {string | null} currentAgentId - 当前激活的Agent ID
 * @property {Record<string, Agent>} agents - Agent字典，以ID为键，Agent对象为值
 * @property {AgentNode[]} agentHierarchy - Agent层级结构
 * @property {Record<string, any>} activeFrames - 栈帧管理
 * @property {object} loading - 加载状态
 * @property {string | null} error - 错误信息
 */
interface AgentState {
  // 当前会话
  currentSessionId: string | null;
  // 当前活跃的Agent
  currentAgentId: string | null;
  // 所有Agent实例
  agents: Record<string, Agent>;
  // Agent层级结构
  agentHierarchy: AgentNode[];
  // 栈帧管理
  activeFrames: Record<string, any>;
  // 加载状态
  loading: {
    createAgent: boolean;
    switchAgent: boolean;
  };
  // 错误信息
  error: string | null;
}

/**
 * 初始状态 - Agent管理的默认状态
 * 
 * 特点：
 * - 无当前Agent（等待用户交互或自动初始化）
 * - 空的Agent字典
 * - 系统启动后会自动创建主Agent
 */
const initialState: AgentState = {
  currentSessionId: null,
  currentAgentId: null,
  agents: {},
  agentHierarchy: [],
  activeFrames: {},
  loading: {
    createAgent: false,
    switchAgent: false,
  },
  error: null,
};

// 异步thunks
export const createMainAgent = createAsyncThunk(
  'agent/createMainAgent',
  async (params: { sessionId: string; topic: string }) => {
    // 这里将调用API创建主Agent
    const response = await fetch('/api/agents/main', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const createBranchAgent = createAsyncThunk(
  'agent/createBranchAgent',
  async (params: { parentId: string; topic: string; messageId: string }) => {
    // 这里将调用API创建分支Agent
    const response = await fetch('/api/agents/branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const switchAgent = createAsyncThunk(
  'agent/switchAgent',
  async (agentId: string) => {
    // 这里将调用API切换Agent
    const response = await fetch(`/api/agents/${agentId}/activate`, {
      method: 'POST',
    });
    return response.json();
  }
);

/**
 * Agent Slice - Redux Toolkit切片定义
 * 
 * 包含所有Agent相关的状态管理逻辑：
 * - 同步reducers：处理即时状态更新
 * - 异步thunks：处理需要副作用的操作
 * - 不可变更新：使用Immer确保状态不可变性
 */
const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    /**
     * 设置当前会话
     * 
     * @param state - 当前Agent状态
     * @param action - 包含会话ID的action
     */
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    
    /**
     * 设置当前激活的Agent
     * 
     * @param state - 当前Agent状态
     * @param action - 包含Agent ID的action
     * 
     * 用途：
     * - 用户点击Agent切换
     * - 系统自动切换到新创建的Agent
     * - 恢复上次会话的Agent状态
     */
    setCurrentAgent: (state, action: PayloadAction<string>) => {
      state.currentAgentId = action.payload;
    },
    
    /**
     * 添加新Agent到状态中
     * 
     * @param state - 当前Agent状态
     * @param action - 包含完整Agent对象的action
     * 
     * 功能：
     * - 将新Agent添加到agents字典
     * - 支持主Agent和分支Agent的添加
     * - 自动维护Agent的唯一性（通过ID）
     * - 更新层级结构
     */
    addAgent: (state, action: PayloadAction<Agent>) => {
      const agent = action.payload;
      state.agents[agent.id] = agent;
      
      // 更新层级结构
      const node: AgentNode = {
        id: agent.id,
        parentId: agent.parentId,
        agentType: agent.agentType,
        topic: agent.topic,
        level: agent.stackDepth,
        children: [],
      };
      
      if (agent.agentType === 'main') {
        state.agentHierarchy.push(node);
      } else {
        // 找到父节点并添加子节点
        const addToParent = (nodes: AgentNode[]): boolean => {
          for (const n of nodes) {
            if (n.id === agent.parentId) {
              if (!n.children) n.children = [];
              n.children.push(node);
              return true;
            }
            if (n.children && addToParent(n.children)) {
              return true;
            }
          }
          return false;
        };
        addToParent(state.agentHierarchy);
      }
    },
    
    /**
     * 更新Agent状态
     * 
     * @param state - 当前Agent状态
     * @param action - 包含Agent ID和状态的action
     * 
     * 用途：
     * - 更新Agent的status等属性
     * - 修改Agent的配置信息
     */
    updateAgentStatus: (state, action: PayloadAction<{ agentId: string; status: Agent['status'] }>) => {
      const { agentId, status } = action.payload;
      if (state.agents[agentId]) {
        state.agents[agentId].status = status;
      }
    },

    /**
     * 删除Agent
     * 
     * @param state - 当前Agent状态
     * @param action - 包含要删除的Agent ID的action
     * 
     * 功能：
     * - 从agents字典中删除指定Agent
     * - 从层级结构中移除对应节点
     * - 递归删除所有子Agent
     */
    removeAgent: (state, action: PayloadAction<string>) => {
      const agentId = action.payload;
      
      // 递归删除层级结构中的节点
      const removeFromHierarchy = (nodes: AgentNode[], targetId: string): AgentNode[] => {
        return nodes.filter(node => {
          if (node.id === targetId) {
            return false; // 删除匹配的节点
          }
          if (node.children) {
            node.children = removeFromHierarchy(node.children, targetId);
          }
          return true;
        });
      };
      
      // 递归收集所有要删除的Agent ID（包括子Agent）
      const collectAgentIds = (nodes: AgentNode[], targetId: string): string[] => {
        const idsToDelete: string[] = [];
        
        const traverse = (nodeList: AgentNode[]) => {
          nodeList.forEach(node => {
            if (node.id === targetId) {
              idsToDelete.push(node.id);
              if (node.children) {
                const collectChildren = (children: AgentNode[]) => {
                  children.forEach(child => {
                    idsToDelete.push(child.id);
                    if (child.children) {
                      collectChildren(child.children);
                    }
                  });
                };
                collectChildren(node.children);
              }
            } else if (node.children) {
              traverse(node.children);
            }
          });
        };
        
        traverse(nodes);
        return idsToDelete;
      };
      
      // 收集所有要删除的Agent ID
      const agentIdsToDelete = collectAgentIds(state.agentHierarchy, agentId);
      
      // 从agents字典中删除所有相关Agent
      agentIdsToDelete.forEach(id => {
        delete state.agents[id];
      });
      
      // 从层级结构中删除节点
      state.agentHierarchy = removeFromHierarchy(state.agentHierarchy, agentId);
      
      // 如果删除的是当前Agent，清空currentAgentId
      if (state.currentAgentId === agentId || agentIdsToDelete.includes(state.currentAgentId || '')) {
        state.currentAgentId = null;
      }
    },
    
    /**
     * 清除错误信息
     * 
     * @param state - 当前Agent状态
     */
    clearError: (state) => {
      state.error = null;
    },
    
    /**
     * 重置Agent状态
     * 
     * @param state - 当前Agent状态
     * 
     * 功能：
     * - 重置所有状态到初始值
     * - 用于用户登出或系统重启
     */
    resetAgentState: (state) => {
      Object.assign(state, initialState);
    },
  },
  
  extraReducers: (builder) => {
    // 创建主Agent
    builder
      .addCase(createMainAgent.pending, (state) => {
        state.loading.createAgent = true;
        state.error = null;
      })
      .addCase(createMainAgent.fulfilled, (state, action) => {
        state.loading.createAgent = false;
        const agent = action.payload;
        state.agents[agent.id] = agent;
        state.currentAgentId = agent.id;
        
        // 添加到层级结构
        const node: AgentNode = {
          id: agent.id,
          agentType: agent.agentType,
          topic: agent.topic,
          level: 0,
          children: [],
        };
        state.agentHierarchy.push(node);
      })
      .addCase(createMainAgent.rejected, (state, action) => {
        state.loading.createAgent = false;
        state.error = action.error.message || '创建主Agent失败';
      })
      
      // 创建分支Agent
      .addCase(createBranchAgent.pending, (state) => {
        state.loading.createAgent = true;
        state.error = null;
      })
      .addCase(createBranchAgent.fulfilled, (state, action) => {
        state.loading.createAgent = false;
        const agent = action.payload;
        state.agents[agent.id] = agent;
        state.currentAgentId = agent.id;
        
        // 添加到层级结构
        const node: AgentNode = {
          id: agent.id,
          parentId: agent.parentId,
          agentType: agent.agentType,
          topic: agent.topic,
          level: agent.stackDepth,
          children: [],
        };
        
        // 找到父节点并添加
        const addToParent = (nodes: AgentNode[]): boolean => {
          for (const n of nodes) {
            if (n.id === agent.parentId) {
              if (!n.children) n.children = [];
              n.children.push(node);
              return true;
            }
            if (n.children && addToParent(n.children)) {
              return true;
            }
          }
          return false;
        };
        addToParent(state.agentHierarchy);
      })
      .addCase(createBranchAgent.rejected, (state, action) => {
        state.loading.createAgent = false;
        state.error = action.error.message || '创建分支Agent失败';
      })
      
      // 切换Agent
      .addCase(switchAgent.pending, (state) => {
        state.loading.switchAgent = true;
        state.error = null;
      })
      .addCase(switchAgent.fulfilled, (state, action) => {
        state.loading.switchAgent = false;
        state.currentAgentId = action.payload.agentId;
      })
      .addCase(switchAgent.rejected, (state, action) => {
        state.loading.switchAgent = false;
        state.error = action.error.message || '切换Agent失败';
      });
  },
});

export const {
  setCurrentSession,
  setCurrentAgent,
  addAgent,
  updateAgentStatus,
  removeAgent,
  clearError,
  resetAgentState,
} = agentSlice.actions;

export default agentSlice.reducer;

// Selectors
export const selectCurrentAgent = (state: { agent: AgentState }) => {
  const { currentAgentId, agents } = state.agent;
  return currentAgentId ? agents[currentAgentId] : null;
};

export const selectAgentHierarchy = (state: { agent: AgentState }) => state.agent.agentHierarchy;

export const selectAgentLoading = (state: { agent: AgentState }) => state.agent.loading;

export const selectAgentError = (state: { agent: AgentState }) => state.agent.error;