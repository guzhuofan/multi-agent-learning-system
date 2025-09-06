/**
 * AgentSlice 单元测试
 * 
 * 测试覆盖：
 * - Agent的创建和添加
 * - Agent的切换和更新
 * - Agent状态管理
 * - 错误处理
 * 
 * @author Multi-Agent Learning System Team
 * @version 1.0.0
 */

import { configureStore } from '@reduxjs/toolkit';
import agentSlice, { 
  setCurrentAgent, 
  addAgent, 
  updateAgentStatus 
} from '../store/slices/agentSlice';
import { Agent } from '../types';

// 创建测试store
const createTestStore = () => {
  return configureStore({
    reducer: {
      agent: agentSlice,
    },
  });
};

// 测试用的Agent数据
const mockAgent: Agent = {
  id: 'test-agent-1',
  sessionId: 'test-session',
  agentType: 'main',
  topic: '测试主题',
  parentId: undefined,
  stackDepth: 0,
  contextData: {},
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z'
};

const mockBranchAgent: Agent = {
  id: 'test-branch-1',
  sessionId: 'test-session',
  agentType: 'branch',
  topic: '分支测试主题',
  parentId: 'test-agent-1',
  stackDepth: 1,
  contextData: {},
  status: 'active',
  createdAt: '2024-01-01T01:00:00.000Z'
};

describe('AgentSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = store.getState().agent;
      expect(state.currentAgentId).toBeNull();
      expect(state.agents).toEqual({});
    });
  });

  describe('addAgent', () => {
    it('应该能够添加新Agent', () => {
      store.dispatch(addAgent(mockAgent));
      
      const state = store.getState().agent;
      expect(state.agents[mockAgent.id]).toEqual(mockAgent);
    });

    it('应该能够添加多个Agent', () => {
      store.dispatch(addAgent(mockAgent));
      store.dispatch(addAgent(mockBranchAgent));
      
      const state = store.getState().agent;
      expect(Object.keys(state.agents)).toHaveLength(2);
      expect(state.agents[mockAgent.id]).toEqual(mockAgent);
      expect(state.agents[mockBranchAgent.id]).toEqual(mockBranchAgent);
    });
  });

  describe('setCurrentAgent', () => {
    it('应该能够设置当前Agent', () => {
      store.dispatch(addAgent(mockAgent));
      store.dispatch(setCurrentAgent(mockAgent.id));
      
      const state = store.getState().agent;
      expect(state.currentAgentId).toBe(mockAgent.id);
    });

    it('应该能够切换当前Agent', () => {
      store.dispatch(addAgent(mockAgent));
      store.dispatch(addAgent(mockBranchAgent));
      
      store.dispatch(setCurrentAgent(mockAgent.id));
      expect(store.getState().agent.currentAgentId).toBe(mockAgent.id);
      
      store.dispatch(setCurrentAgent(mockBranchAgent.id));
      expect(store.getState().agent.currentAgentId).toBe(mockBranchAgent.id);
    });
  });

  describe('updateAgentStatus', () => {
    it('应该能够更新Agent状态', () => {
      store.dispatch(addAgent(mockAgent));
      
      store.dispatch(updateAgentStatus({ agentId: mockAgent.id, status: 'suspended' }));
      
      const state = store.getState().agent;
      const updatedAgent = state.agents[mockAgent.id];
      
      expect(updatedAgent.status).toBe('suspended');
    });

    it('不应该更新不存在的Agent', () => {
      store.dispatch(updateAgentStatus({ agentId: 'non-existent', status: 'suspended' }));
      
      const state = store.getState().agent;
      expect(state.agents['non-existent']).toBeUndefined();
    });
  });



  describe('Agent层级关系', () => {
    it('应该正确处理主Agent和分支Agent的关系', () => {
      store.dispatch(addAgent(mockAgent));
      store.dispatch(addAgent(mockBranchAgent));
      
      const state = store.getState().agent;
      const mainAgent = state.agents[mockAgent.id];
      const branchAgent = state.agents[mockBranchAgent.id];
      
      expect(mainAgent.agentType).toBe('main');
      expect(mainAgent.stackDepth).toBe(0);
      expect(mainAgent.parentId).toBeUndefined();
      
      expect(branchAgent.agentType).toBe('branch');
      expect(branchAgent.stackDepth).toBe(1);
      expect(branchAgent.parentId).toBe(mockAgent.id);
    });
  });
});