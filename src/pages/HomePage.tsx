/**
 * HomePage - 多Agent学习系统主页面组件
 * 
 * 功能特性：
 * - 栈帧式分支Agent架构的核心实现
 * - 完整的用户交互界面（聊天、分支创建、Agent切换）
 * - 性能监控和优化功能
 * - 用户引导和快捷键支持
 * - 响应式设计和错误处理
 * 
 * @author Multi-Agent Learning System Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setCurrentAgent, addAgent, removeAgent } from '../store/slices/agentSlice';
import { addUserMessage, addAssistantMessage } from '../store/slices/chatSlice';
import ChatInterface from '../components/ChatInterface';
import BranchTreePanel from '../components/BranchTreePanel';
import AgentSwitcher from '../components/AgentSwitcher';
import PerformanceMonitor from '../components/PerformanceMonitor';
import UserGuide from '../components/UserGuide';
import { TreePine, Settings, Menu, X, HelpCircle, Plus } from 'lucide-react';
import type { Message } from '../store/slices/chatSlice';
import type { Agent } from '../store/slices/agentSlice';

/**
 * HomePage组件 - 多Agent学习系统的主界面
 * 
 * 状态管理：
 * - Redux状态：Agent管理、消息历史、UI状态
 * - 本地状态：界面显示控制、用户交互状态
 * 
 * 核心功能：
 * - 主Agent自动初始化
 * - 分支Agent创建和管理
 * - 消息发送和AI回复模拟
 * - 性能测试和监控
 * - 用户引导和快捷键
 */
const HomePage: React.FC = () => {
  const dispatch = useDispatch();
  
  // Redux状态选择器
  const { currentAgentId, agents } = useSelector((state: RootState) => state.agent);
  const { messagesByAgent } = useSelector((state: RootState) => state.chat);
  
  const currentAgent = currentAgentId ? agents[currentAgentId] : null;
  
  // 本地UI状态
  const [showBranchTree, setShowBranchTree] = useState(false);
  // const [showSettings, setShowSettings] = useState(false); // 暂时注释，未使用
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);

  /**
   * 同步Agent状态 - 确保前端Redux store与后端数据库一致
   */
  const syncAgentState = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/agents/');
      if (response.ok) {
        const agentsData = await response.json();
        console.log('同步Agent状态，后端Agent列表:', agentsData);
        
        // 处理后端返回的数据格式
        let agentsList: Array<{
          id: string;
          session_id: string;
          agent_type: string;
          topic: string;
          parent_id?: string;
          stack_depth: number;
          context_data: Record<string, unknown>;
          status: string;
          created_at: string;
        }> = [];
        if (Array.isArray(agentsData)) {
          agentsList = agentsData;
        } else if (agentsData && Array.isArray(agentsData.agents)) {
          agentsList = agentsData.agents;
        } else {
          console.log('后端返回的数据格式不正确:', agentsData);
          return null;
        }
        
        if (agentsList.length === 0) {
          console.log('后端没有Agent数据');
          return null;
        }
        
        // 清空现有Agent状态并重新加载
        const syncedAgents: Record<string, Agent> = {};
        agentsList.forEach((agentData) => {
          const agent: Agent = {
            id: agentData.id,
            sessionId: agentData.session_id,
            agentType: agentData.agent_type,
            topic: agentData.topic,
            parentId: agentData.parent_id,
            stackDepth: agentData.stack_depth,
            contextData: agentData.context_data,
            status: agentData.status,
            createdAt: agentData.created_at
          };
          syncedAgents[agent.id] = agent;
          dispatch(addAgent(agent));
        });
        
        // 如果当前Agent不存在或无效，切换到第一个可用的Agent
        if (!currentAgent || !syncedAgents[currentAgent.id]) {
          const mainAgent = agentsList.find((a) => a.agent_type === 'main');
          if (mainAgent) {
            dispatch(setCurrentAgent(mainAgent.id));
            await loadAgentMessages(mainAgent.id);
            console.log('✅ 同步后切换到主Agent:', mainAgent.id);
          } else if (agentsList.length > 0) {
            dispatch(setCurrentAgent(agentsList[0].id));
            await loadAgentMessages(agentsList[0].id);
            console.log('✅ 同步后切换到第一个Agent:', agentsList[0].id);
          }
        }
        
        return syncedAgents;
      }
    } catch (error) {
      console.error('同步Agent状态失败:', error);
    }
    return null;
  };

  /**
   * 主Agent初始化逻辑
   * 
   * 功能：
   * - 检查是否已存在Agent
   * - 如果没有Agent，创建新的会话和主Agent
   * - 支持离线模式（API失败时创建临时Agent）
   * - 防止重复创建主Agent
   */
  useEffect(() => {
    let isInitializing = false; // 防止重复初始化的标志
    
    const initializeMainAgent = async () => {
      // 防止重复初始化
      if (isInitializing) {
        console.log('⚠️ 正在初始化中，跳过重复调用');
        return;
      }
      
      try {
        isInitializing = true;
        console.log('🚀 开始初始化主Agent...');
        
        // 首先尝试同步现有Agent状态
        const syncedAgents = await syncAgentState();
        
        if (syncedAgents && Object.keys(syncedAgents).length > 0) {
          console.log('✅ 发现并同步现有Agent:', Object.keys(syncedAgents));
          return;
        }
        
        // 如果没有现有Agent，创建新的主Agent
        console.log('📝 没有现有Agent，创建新的主Agent...');
        
        // 1. 创建会话
        const sessionResponse = await fetch('http://localhost:8000/api/v1/sessions/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: '多Agent学习会话',
            description: '智能学习助手会话'
          }),
        });
        
        if (!sessionResponse.ok) {
          throw new Error(`创建会话失败: ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        console.log('✅ 会话创建成功:', sessionData);
        
        // 2. 创建主Agent
        const agentResponse = await fetch('http://localhost:8000/api/v1/agents/main', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionData.id,
            agent_type: 'main',
            topic: '多Agent学习助手',
            context_data: {}
          }),
        });
        
        if (!agentResponse.ok) {
          throw new Error(`创建主Agent失败: ${agentResponse.status}`);
        }
        
        const agentData = await agentResponse.json();
        console.log('✅ 主Agent创建成功:', agentData);
        
        // 3. 添加到Redux store
        const mainAgent: Agent = {
          id: agentData.id,
          sessionId: agentData.session_id,
          agentType: agentData.agent_type,
          topic: agentData.topic,
          parentId: agentData.parent_id,
          stackDepth: agentData.stack_depth,
          contextData: agentData.context_data,
          status: agentData.status,
          createdAt: agentData.created_at
        };
        
        dispatch(addAgent(mainAgent));
        dispatch(setCurrentAgent(mainAgent.id));
        
        // 4. 加载历史消息
        await loadAgentMessages(mainAgent.id);
        
        console.log('✅ 主Agent初始化完成:', mainAgent);
        
      } catch (error) {
        console.error('❌ 主Agent初始化失败:', error);
        
        // 创建临时Agent（离线模式）
        const tempAgent: Agent = {
          id: `temp-main-${Date.now()}`,
          sessionId: `temp-session-${Date.now()}`,
          agentType: 'main',
          topic: '多Agent学习助手（离线模式）',
          parentId: undefined,
          stackDepth: 0,
          contextData: {},
          status: 'active',
          createdAt: new Date().toISOString()
        };
        
        dispatch(addAgent(tempAgent));
        dispatch(setCurrentAgent(tempAgent.id));
        
        console.log('⚠️ 创建临时Agent（离线模式）:', tempAgent);
      } finally {
        isInitializing = false;
      }
    };
    
    initializeMainAgent();
  }, [dispatch]); // 移除agents和currentAgent依赖，避免无限循环



  /**
   * 验证Agent ID是否在后端存在
   * 
   * @param agentId - 要验证的Agent ID
   * @returns Promise<boolean> - Agent是否存在
   */
  const validateAgentId = async (agentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/agents/${agentId}`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('验证Agent ID失败:', error);
      return false;
    }
  };

  /**
   * 加载Agent的历史消息
   * 
   * @param agentId - Agent ID
   */
  const loadAgentMessages = async (agentId: string) => {
    console.log(`🔄 开始加载Agent ${agentId} 的历史消息`);
    
    // 特殊调试：宪法式AI agent
    if (agentId === 'e407f16b-662e-4ee1-8485-bd7e17fbcb9b') {
      console.log('🏛️ 正在加载宪法式AI agent的消息...');
      console.log('🏛️ API URL:', `http://localhost:8000/api/v1/chat/conversation/${agentId}`);
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/chat/conversation/${agentId}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`📨 从后端获取到 ${data.messages.length} 条历史消息:`, data.messages);
        
        // 检查Redux中是否已有消息，避免重复添加
        const existingMessages = messagesByAgent[agentId] || [];
        console.log(`🔍 Redux中已有 ${existingMessages.length} 条消息`);
        const existingMessageIds = new Set(existingMessages.map(msg => msg.id));
        
        // 将历史消息添加到Redux store（去重）
        data.messages.forEach((msg: { id: string; agent_id: string; role: string; content: string; timestamp: string; metadata?: Record<string, unknown> }, index: number) => {
          // 跳过已存在的消息
          if (existingMessageIds.has(msg.id)) {
            console.log(`⏭️ 跳过已存在的消息: ${msg.id}`);
            return;
          }
          
          const message = {
            id: msg.id,
            agentId: msg.agent_id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata || {}
          };
          
          console.log(`📝 处理消息 ${index + 1}/${data.messages.length}:`, {
            id: msg.id,
            role: msg.role,
            content: msg.content.substring(0, 50) + '...',
            agentId: msg.agent_id
          });
          
          if (msg.role === 'user') {
            dispatch(addUserMessage({ agentId: msg.agent_id, content: msg.content, messageId: msg.id, timestamp: msg.timestamp }));
          } else {
            dispatch(addAssistantMessage(message));
          }
        });
        
        console.log(`✅ Agent ${agentId} 历史消息加载完成`);
      } else {
        console.error(`❌ 获取历史消息失败: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 加载Agent历史消息失败:', error);
    }
  };

  /**
   * 处理Agent切换
   * 
   * @param agentId - 要切换到的Agent ID
   */
  const handleSwitchAgent = async (agentId: string) => {
    console.log('🔄 切换到Agent:', agentId);
    
    // 特殊调试：宪法式AI agent
    if (agentId === 'e407f16b-662e-4ee1-8485-bd7e17fbcb9b') {
      console.log('🏛️ 检测到宪法式AI agent切换，开始详细调试...');
      console.log('🏛️ 宪法式AI Agent ID:', agentId);
      console.log('🏛️ 当前Redux状态 - agents:', agents);
      console.log('🏛️ 当前Redux状态 - messagesByAgent:', messagesByAgent);
      console.log('🏛️ 当前Redux状态 - currentAgent:', currentAgent);
    }
    
    // 切换当前Agent
    dispatch(setCurrentAgent(agentId));
    console.log('✅ Redux currentAgent已更新为:', agentId);
    
    // 检查是否已经加载了该Agent的消息
    const existingMessages = messagesByAgent[agentId];
    console.log(`🔍 检查Agent ${agentId} 的现有消息:`, {
      exists: !!existingMessages,
      count: existingMessages?.length || 0,
      messages: existingMessages
    });
    
    // 总是尝试加载消息，确保数据是最新的
    console.log('📥 正在从后端获取Agent消息...');
    await loadAgentMessages(agentId);
    console.log('✅ Agent消息加载完成');
  };

  /**
   * 处理消息发送
   * 
   * @param content - 用户输入的消息内容
   * 
   * 流程：
   * 1. 验证当前Agent是否存在
   * 2. 验证Agent ID在后端是否有效
   * 3. 立即添加用户消息到Redux store
   * 4. 调用后端API获取AI回复
   * 5. 添加AI回复消息到对应Agent的消息历史
   */
  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentAgent) {
      console.error('当前没有选中的Agent');
      return;
    }

    // 验证Agent ID是否在后端存在
    const isValidAgent = await validateAgentId(currentAgent.id);
    if (!isValidAgent) {
      console.error('当前Agent ID在后端不存在:', currentAgent.id);
      
      // 尝试重新获取所有Agent并同步状态
      try {
        const response = await fetch('http://localhost:8000/api/v1/agents/');
        if (response.ok) {
          const agentsData = await response.json();
          console.log('重新获取的Agent列表:', agentsData);
          
          // 如果有可用的Agent，切换到第一个
          if (agentsData.length > 0) {
            const firstAgent = agentsData[0];
            const syncedAgent: Agent = {
              id: firstAgent.id,
              sessionId: firstAgent.session_id,
              agentType: firstAgent.agent_type,
              topic: firstAgent.topic,
              parentId: firstAgent.parent_id,
              stackDepth: firstAgent.stack_depth,
              contextData: firstAgent.context_data,
              status: firstAgent.status,
              createdAt: firstAgent.created_at
            };
            
            dispatch(addAgent(syncedAgent));
            dispatch(setCurrentAgent(syncedAgent.id));
            
            console.log('已切换到有效的Agent:', syncedAgent.id);
            
            // 显示提示消息
            const syncMessage: Message = {
              id: `msg-${Date.now()}-sync`,
              agentId: syncedAgent.id,
              role: 'assistant',
              content: '检测到Agent状态不同步，已自动切换到有效的Agent。请重新发送您的消息。',
              timestamp: new Date().toISOString(),
              metadata: { branchable: false }
            };
            
            dispatch(addAssistantMessage(syncMessage));
            return;
          }
        }
      } catch (syncError) {
        console.error('同步Agent状态失败:', syncError);
      }
      
      // 如果同步失败，显示错误消息
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        agentId: currentAgent.id,
        role: 'assistant',
        content: '当前Agent状态异常，请刷新页面或重新创建Agent。',
        timestamp: new Date().toISOString(),
        metadata: { branchable: false }
      };
      
      dispatch(addAssistantMessage(errorMessage));
      return;
    }

    // 添加用户消息到当前Agent的消息历史
    dispatch(addUserMessage({ agentId: currentAgent.id, content }));

    try {
      // 调用后端API获取AI回复
      const response = await fetch('http://localhost:8000/api/v1/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          agent_id: currentAgent.id,
          context_mode: 'auto' // 使用自动上下文模式
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 添加AI回复消息
      const aiMessage: Message = {
        id: data.assistant_message.id,
        agentId: currentAgent.id,
        role: 'assistant',
        content: data.assistant_message.content,
        timestamp: data.assistant_message.timestamp,
        metadata: data.assistant_message.metadata
      };
      
      dispatch(addAssistantMessage(aiMessage));
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 发送失败时显示错误消息
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        agentId: currentAgent.id,
        role: 'assistant',
        content: `抱歉，发送消息时出现错误：${error instanceof Error ? error.message : '未知错误'}。请检查网络连接或稍后重试。`,
        timestamp: new Date().toISOString(),
        metadata: { branchable: false }
      };
      
      dispatch(addAssistantMessage(errorMessage));
    }
  }, [currentAgent, dispatch, validateAgentId, addAgent, setCurrentAgent, addAssistantMessage, addUserMessage]);

  /**
   * 处理分支创建
   * 
   * @param messageId - 基于的消息ID
   * @param topic - 分支主题
   * 
   * 流程：
   * 1. 调用后端API创建分支Agent
   * 2. 将新Agent添加到Redux store
   * 3. 自动切换到新创建的分支Agent
   * 4. 继承父Agent的上下文
   */
  const handleCreateBranch = async (messageId: string, topic: string) => {
    if (!currentAgent) return;

    try {
      // 调用后端API创建分支Agent
      const response = await fetch('http://localhost:8000/api/v1/agents/branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_agent_id: currentAgent.id,
          topic: topic,
          message_id: messageId,
          inheritance_mode: 'selective' // 选择性继承上下文
        }),
      });

      if (!response.ok) {
        throw new Error(`创建分支失败: ${response.status}`);
      }

      const branchData = await response.json();
      
      // 创建新的分支Agent对象
      const branchAgent: Agent = {
        id: branchData.id,
        sessionId: branchData.session_id,
        agentType: branchData.agent_type,
        topic: branchData.topic,
        parentId: branchData.parent_id,
        stackDepth: branchData.stack_depth,
        contextData: branchData.context_data,
        status: branchData.status,
        createdAt: branchData.created_at
      };
      
      // 添加到Redux store
      dispatch(addAgent(branchAgent));
      
      // 自动切换到新创建的分支Agent
      dispatch(setCurrentAgent(branchAgent.id));
      
      console.log('✅ 分支Agent创建成功:', branchAgent);
      
    } catch (error) {
      console.error('创建分支失败:', error);
      
      // 如果API调用失败，创建本地临时分支Agent
      const tempBranchAgent: Agent = {
        id: `temp-branch-${Date.now()}`,
        sessionId: currentAgent.sessionId,
        agentType: 'branch',
        topic: topic,
        parentId: currentAgent.id,
        stackDepth: (currentAgent.stackDepth || 0) + 1,
        contextData: {},
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      dispatch(addAgent(tempBranchAgent));
      dispatch(setCurrentAgent(tempBranchAgent.id));
      
      console.log('⚠️ 创建临时分支Agent（离线模式）:', tempBranchAgent);
    }
  };

  /**
   * 创建新的主Agent
   * 
   * 功能：
   * - 创建新的会话和主Agent
   * - 切换到新创建的主Agent
   * - 支持自定义主Agent名称
   */
  const handleCreateNewMainAgent = useCallback(async (topic: string) => {
    console.log('🚀 HomePage: 开始创建新主Agent:', topic);
    
    try {
      // 1. 创建新会话
      console.log('📝 创建新会话...');
      const sessionResponse = await fetch('http://localhost:8000/api/v1/sessions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${topic} - ${new Date().toLocaleString()}`,
          description: `${topic}学习对话会话`
        }),
      });
      
      if (!sessionResponse.ok) {
        throw new Error(`创建会话失败: ${sessionResponse.status}`);
      }
      
      const sessionData = await sessionResponse.json();
      console.log('✅ 会话创建成功:', sessionData.id);
      
      // 2. 创建新的主Agent
      console.log('🤖 创建新主Agent...');
      const agentResponse = await fetch('http://localhost:8000/api/v1/agents/main', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionData.id,
          agent_type: 'main',
          topic: topic,
          context_data: {}
        }),
      });
      
      if (!agentResponse.ok) {
        throw new Error(`创建主Agent失败: ${agentResponse.status}`);
      }
      
      const agentData = await agentResponse.json();
      console.log('✅ 后端Agent创建成功:', agentData);
      
      const newMainAgent: Agent = {
        id: agentData.id,
        sessionId: agentData.session_id,
        agentType: agentData.agent_type,
        topic: agentData.topic,
        parentId: agentData.parent_id,
        stackDepth: agentData.stack_depth,
        contextData: agentData.context_data,
        status: agentData.status,
        createdAt: agentData.created_at
      };
      
      // 4. 添加到Redux store并切换
      console.log('🔄 添加Agent到Redux store...');
      dispatch(addAgent(newMainAgent));
      console.log('🔄 切换到新Agent...');
      dispatch(setCurrentAgent(newMainAgent.id));
      
      console.log('✅ 新主Agent创建成功:', newMainAgent);
      console.log('📊 当前Redux状态 - agents数量:', Object.keys(agents).length + 1);
      
    } catch (error) {
      console.error('创建新主Agent失败:', error);
      
      // 如果API调用失败，创建本地临时主Agent
      const tempMainAgent: Agent = {
        id: `temp-main-${Date.now()}`,
        sessionId: `temp-session-${Date.now()}`,
        agentType: 'main',
        topic: `${topic}（离线模式）`,
        parentId: undefined,
        stackDepth: 0,
        contextData: {},
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      dispatch(addAgent(tempMainAgent));
      dispatch(setCurrentAgent(tempMainAgent.id));
      
      console.log('⚠️ 创建临时主Agent（离线模式）:', tempMainAgent);
    }
  }, [dispatch, agents]);

  /**
   * 重命名Agent
   * 
   * @param agentId - Agent ID
   * @param newName - 新名称
   */
  const handleRenameAgent = async (agentId: string, newName: string) => {
    try {
      // 尝试更新后端
      const response = await fetch(`http://localhost:8000/api/v1/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: newName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename agent');
      }

      // 更新Redux store中的Agent
      const agent = agents[agentId];
      if (agent) {
        const updatedAgent = { ...agent, topic: newName };
        dispatch(addAgent(updatedAgent));
      }
      
    } catch (error) {
      console.error('Error renaming agent:', error);
      
      // 离线模式：直接更新本地状态
      const agent = agents[agentId];
      if (agent) {
        const updatedAgent = { ...agent, topic: newName };
        dispatch(addAgent(updatedAgent));
      }
    }
  };

  /**
   * 删除Agent
   * 
   * @param agentId - 要删除的Agent ID
   */
  const handleDeleteAgent = useCallback(async (agentId: string) => {
    console.log('🗑️ HomePage: 开始删除Agent:', agentId);
    
    try {
      const agent = agents[agentId];
      if (!agent) {
        console.error('❌ Agent not found:', agentId);
        return;
      }

      console.log('📋 要删除的Agent信息:', agent);
      const isMainAgent = agent.agentType === 'main';
      const url = `http://localhost:8000/api/v1/agents/${agentId}${isMainAgent ? '?force=true' : ''}`;
      console.log('🌐 删除API URL:', url);
      
      // 调用后端删除API
      console.log('📡 调用后端删除API...');
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ 后端删除结果:', result);

      // 从Redux store中移除Agent（包括所有子Agent）
      console.log('🔄 从Redux store中移除Agent...');
      dispatch(removeAgent(agentId));
      console.log('✅ Redux状态已更新');
      
      // 如果删除的是当前Agent，需要切换到其他Agent
      if (currentAgent?.id === agentId) {
        console.log('🔄 删除的是当前Agent，需要切换...');
        const remainingAgents = Object.values(agents).filter(a => a.id !== agentId);
        console.log('📊 剩余Agent数量:', remainingAgents.length);
        
        if (remainingAgents.length > 0) {
          // 切换到第一个可用的Agent
          console.log('🔄 切换到第一个可用Agent:', remainingAgents[0].id);
          dispatch(setCurrentAgent(remainingAgents[0].id));
          // 加载新Agent的消息
          await loadAgentMessages(remainingAgents[0].id);
        } else {
          // 如果没有其他Agent，创建一个新的主Agent
          console.log('🆕 没有其他Agent，创建新的主Agent...');
          // 直接调用函数而不是通过useCallback引用，避免循环依赖
          try {
            const sessionResponse = await fetch('http://localhost:8000/api/v1/sessions/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: `多Agent学习助手 - ${new Date().toLocaleString()}`,
                description: '多Agent学习助手学习对话会话'
              }),
            });
            
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              const agentResponse = await fetch('http://localhost:8000/api/v1/agents/main', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  session_id: sessionData.id,
                  agent_type: 'main',
                  topic: '多Agent学习助手',
                  context_data: {}
                }),
              });
              
              if (agentResponse.ok) {
                const agentData = await agentResponse.json();
                const newMainAgent: Agent = {
                  id: agentData.id,
                  sessionId: agentData.session_id,
                  agentType: agentData.agent_type,
                  topic: agentData.topic,
                  parentId: agentData.parent_id,
                  stackDepth: agentData.stack_depth,
                  contextData: agentData.context_data,
                  status: agentData.status,
                  createdAt: agentData.created_at
                };
                
                dispatch(addAgent(newMainAgent));
                dispatch(setCurrentAgent(newMainAgent.id));
                console.log('✅ 创建新主Agent成功:', newMainAgent.id);
              }
            }
          } catch (createError) {
            console.error('创建新主Agent失败:', createError);
          }
        }
      }
      
      console.log('✅ Agent删除成功:', agentId);
      
    } catch (error) {
      console.error('Error deleting agent:', error);
      // 可以在这里添加用户提示
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [currentAgent, dispatch, loadAgentMessages, agents]);

  /**
   * 创建新的主对话（保留原有功能）
   * 
   * 功能：
   * - 创建新的会话和主Agent
   * - 切换到新创建的主Agent
   * - 清空当前界面状态
   */
  const handleCreateNewConversation = async () => {
    try {
      // 1. 创建新会话
      const sessionResponse = await fetch('http://localhost:8000/api/v1/sessions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `新对话 - ${new Date().toLocaleString()}`,
          description: '新的学习对话会话'
        }),
      });
      
      if (!sessionResponse.ok) {
        throw new Error(`创建会话失败: ${sessionResponse.status}`);
      }
      
      const sessionData = await sessionResponse.json();
      
      // 2. 创建新的主Agent
      const agentResponse = await fetch('http://localhost:8000/api/v1/agents/main', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionData.id,
          agent_type: 'main',
          topic: '新的学习助手',
          context_data: {}
        }),
      });
      
      if (!agentResponse.ok) {
        throw new Error(`创建主Agent失败: ${agentResponse.status}`);
      }
      
      const agentData = await agentResponse.json();
      
      // 3. 创建新的主Agent对象
      const newMainAgent: Agent = {
        id: agentData.id,
        sessionId: agentData.session_id,
        agentType: agentData.agent_type,
        topic: agentData.topic,
        parentId: agentData.parent_id,
        stackDepth: agentData.stack_depth,
        contextData: agentData.context_data,
        status: agentData.status,
        createdAt: agentData.created_at
      };
      
      // 4. 添加到Redux store并切换
      dispatch(addAgent(newMainAgent));
      dispatch(setCurrentAgent(newMainAgent.id));
      
      // 5. 关闭侧边栏
      setSidebarOpen(false);
      
      console.log('✅ 新对话创建成功:', newMainAgent);
      
    } catch (error) {
      console.error('创建新对话失败:', error);
      
      // 如果API调用失败，创建本地临时主Agent
      const tempMainAgent: Agent = {
        id: `temp-main-${Date.now()}`,
        sessionId: `temp-session-${Date.now()}`,
        agentType: 'main',
        topic: '新的学习助手（离线模式）',
        parentId: undefined,
        stackDepth: 0,
        contextData: {},
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      dispatch(addAgent(tempMainAgent));
      dispatch(setCurrentAgent(tempMainAgent.id));
      setSidebarOpen(false);
      
      console.log('⚠️ 创建临时新对话（离线模式）:', tempMainAgent);
    }
  };

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter: 发送消息
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const messageInput = document.querySelector('textarea[placeholder*="消息"]') as HTMLTextAreaElement;
        if (messageInput && messageInput.value.trim()) {
          handleSendMessage(messageInput.value.trim());
          messageInput.value = '';
        }
      }
      // Ctrl/Cmd + B: 切换侧边栏
      else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      // Ctrl/Cmd + T: 切换分支树
      else if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setShowBranchTree(prev => !prev);
      }
      // Ctrl/Cmd + ?: 显示快捷键帮助
      else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSendMessage]);

  // 性能测试：创建大量测试数据
  const createTestData = () => {
    const testAgents = [];
    const testMessages = [];
    
    // 创建多个分支Agent进行压力测试
    for (let i = 1; i <= 10; i++) {
      const branchAgent: Agent = {
        id: `test-branch-${i}`,
        sessionId: 'test-session',
        agentType: 'branch',
        topic: `测试分支 ${i} - 性能压力测试`,
        parentId: 'main-agent',
        stackDepth: 1,
        contextData: {},
        status: 'active',
        createdAt: new Date(Date.now() - i * 60000).toISOString()
      };
      testAgents.push(branchAgent);
      
      // 为每个Agent创建多条测试消息
      for (let j = 1; j <= 20; j++) {
        const userMsg: Message = {
          id: `test-msg-${i}-${j}-user`,
          agentId: branchAgent.id,
          role: 'user',
          content: `测试消息 ${j} - 用户输入内容，用于测试长对话历史的渲染性能和滚动性能。`,
          timestamp: new Date(Date.now() - (20-j) * 30000).toISOString()
        };
        
        const aiMsg: Message = {
          id: `test-msg-${i}-${j}-ai`,
          agentId: branchAgent.id,
          role: 'assistant',
          content: `测试回复 ${j} - 这是AI助手的回复内容，包含了详细的解释和说明。\n\n**测试要点：**\n- 渲染性能测试\n- 内存使用监控\n- 滚动流畅度\n- 组件更新效率\n\n这条消息用于测试大量消息时的系统性能表现。`,
          timestamp: new Date(Date.now() - (20-j) * 30000 + 15000).toISOString()
        };
        
        testMessages.push(userMsg, aiMsg);
      }
    }
    
    // 批量添加测试数据
    testAgents.forEach(agent => {
      dispatch(addAgent(agent));
    });
    
    testMessages.forEach(message => {
      dispatch(addAssistantMessage(message));
    });
    
    console.log(`✅ 性能测试数据创建完成：${testAgents.length} 个Agent，${testMessages.length} 条消息`);
   };
   
   // 性能优化函数
   const handlePerformanceOptimization = () => {
     // 清理超过100条消息的Agent历史
     Object.entries(messagesByAgent).forEach(([agentId, messages]) => {
       if (messages.length > 100) {
         // 保留最近50条消息
         const recentMessages = messages.slice(-50);
         // 这里应该dispatch一个清理action，暂时用console提示
         console.log(`🧹 Agent ${agentId} 消息已优化：${messages.length} → ${recentMessages.length}`);
       }
     });
     
     // 强制垃圾回收（如果浏览器支持）
     if ((window as { gc?: () => void }).gc) {
       (window as { gc?: () => void }).gc();
       console.log('🗑️ 已执行垃圾回收');
     }
     
     console.log('⚡ 性能优化完成');
   };
   
   // 用户引导完成处理
   const handleGuideComplete = () => {
     localStorage.setItem('multi-agent-visited', 'true');
     setShowUserGuide(false);
   };
   
   // 手动显示用户引导
   const handleShowGuide = () => {
     setShowUserGuide(true);
   };

  // 获取当前Agent的消息
  const currentMessages = currentAgent ? (messagesByAgent[currentAgent.id] || []) : [];
  
  // 特殊调试：宪法式AI agent
  if (currentAgent?.id === 'e407f16b-662e-4ee1-8485-bd7e17fbcb9b') {
    console.log('🏛️ 宪法式AI currentMessages 计算:');
    console.log('🏛️ currentAgent:', currentAgent);
    console.log('🏛️ messagesByAgent[宪法式AI]:', messagesByAgent[currentAgent.id]);
    console.log('🏛️ currentMessages:', currentMessages);
    console.log('🏛️ currentMessages.length:', currentMessages.length);
    console.log('🏛️ messagesByAgent 全部keys:', Object.keys(messagesByAgent));
    console.log('🏛️ 是否存在该key:', currentAgent.id in messagesByAgent);
  }
  
  // 添加调试日志
  console.log('🎯 当前消息计算:', {
    currentAgentId: currentAgent?.id,
    messagesByAgentKeys: Object.keys(messagesByAgent),
    currentMessagesCount: currentMessages.length,
    currentMessages: currentMessages,
    allMessagesByAgent: messagesByAgent
  });
  
  // 🔍 调试信息：currentMessages计算过程
  console.log('🔍 HomePage currentMessages 调试信息:');
  console.log('🎯 currentAgent:', currentAgent);
  console.log('🆔 currentAgent?.id:', currentAgent?.id);
  console.log('📚 messagesByAgent 全部数据:', messagesByAgent);
  console.log('🔑 messagesByAgent 的所有 keys:', Object.keys(messagesByAgent));
  console.log('📨 currentMessages (计算结果):', currentMessages);
  console.log('📊 currentMessages 长度:', currentMessages.length);
  
  if (currentAgent?.id) {
    console.log(`🔍 Agent ${currentAgent.id} 的消息:`, messagesByAgent[currentAgent.id]);
    console.log(`❓ messagesByAgent 中是否存在 ${currentAgent.id}:`, currentAgent.id in messagesByAgent);
  }

  /**
   * 构建Agent层级结构树
   * 
   * @returns AgentNode[] - 构建好的Agent树状结构
   */
  const buildAgentHierarchy = (): AgentNode[] => {
    const agentList = Object.values(agents);
    const agentMap = new Map();
    const rootNodes: AgentNode[] = [];

    // 转换Agent为AgentNode格式
    agentList.forEach(agent => {
      const messages = messagesByAgent[agent.id] || [];
      const agentNode = {
        id: agent.id,
        parentId: agent.parentId,
        agentType: agent.agentType,
        topic: agent.topic,
        level: agent.stackDepth || 0,
        status: agent.status,
        messageCount: messages.length,
        lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp : agent.createdAt,
        children: []
      };
      agentMap.set(agent.id, agentNode);
    });

    // 构建父子关系
    agentMap.forEach(node => {
      if (node.parentId && agentMap.has(node.parentId)) {
        const parent = agentMap.get(node.parentId);
        parent.children.push(node);
      } else {
        // 没有父节点的是根节点
        rootNodes.push(node);
      }
    });

    // 递归排序子节点（按创建时间）
    const sortChildren = (nodes: AgentNode[]) => {
      nodes.sort((a, b) => new Date(a.lastActivity || '').getTime() - new Date(b.lastActivity || '').getTime());
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootNodes);
    return rootNodes;
  };

  const agentHierarchy = buildAgentHierarchy();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* 侧边栏头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">学习会话</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCreateNewConversation}
                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                title="新建对话"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Agent切换器 */}
          <div className="p-4 border-b border-gray-200">
            <AgentSwitcher 
              onCreateBranch={handleCreateBranch}
              onCreateMainAgent={handleCreateNewMainAgent}
              onRenameAgent={handleRenameAgent}
              onDeleteAgent={handleDeleteAgent}
            />
          </div>

          {/* 会话历史 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-500 mb-3">最近会话</div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="font-medium text-blue-900">当前会话</div>
                <div className="text-sm text-blue-700 mt-1">
                  {currentAgent?.topic || '多Agent学习助手'}
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  {currentMessages.length} 条消息
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏底部 */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center w-full p-2 text-left text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4 mr-3" />
              设置
            </button>
            
            {/* 性能测试按钮 */}
            <button
              onClick={createTestData}
              className="flex items-center w-full p-2 text-left text-orange-600 hover:bg-orange-50 rounded-md transition-colors text-sm"
              title="创建测试数据进行性能压力测试"
            >
              <span className="w-4 h-4 mr-3 text-center">⚡</span>
              性能测试
            </button>
            
            {/* 性能监控信息 */}
            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              <div>Agents: {Object.keys(agents).length}</div>
              <div>Messages: {Object.values(messagesByAgent).reduce((total, msgs) => total + msgs.length, 0)}</div>
              <div>Memory: {((performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize / 1024 / 1024 || 0).toFixed(1)}MB</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* 顶部导航栏 */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  {currentAgent?.topic || '多Agent学习系统'}
                </h1>
                <div className="text-sm text-gray-500">
                  {currentAgent?.agentType === 'main' ? '主Agent' : `分支Agent (深度: ${currentAgent?.stackDepth})`}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBranchTree(!showBranchTree)}
                className={`
                  p-2 rounded-md transition-colors
                  ${showBranchTree 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
                title="分支树视图 (Ctrl+T)"
              >
                <TreePine className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleShowGuide}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                title="用户指南 (Ctrl+/)"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* 聊天区域 */}
        <div className="flex-1 flex">
          {/* 主聊天界面 */}
          <div className={`flex-1 flex flex-col ${showBranchTree ? 'lg:mr-80' : ''}`}>
            <ChatInterface
              messages={currentMessages as Message[]}
              onSendMessage={handleSendMessage}
              currentAgent={currentAgent}
              agentHierarchy={agentHierarchy}
              isLoading={false}
              onCreateBranch={handleCreateBranch}
              onSwitchAgent={handleSwitchAgent}
            />
          </div>

          {/* 分支树面板 */}
          {showBranchTree && (
            <div className="hidden lg:block">
              <BranchTreePanel 
                agentHierarchy={agentHierarchy}
                currentAgentId={currentAgent?.id || ''}
                onSwitchAgent={(agentId) => {
                  handleSwitchAgent(agentId);
                  setShowBranchTree(false);
                }}
                onDeleteAgent={handleDeleteAgent}
                isVisible={showBranchTree}
                onClose={() => setShowBranchTree(false)} 
              />
            </div>
          )}
        </div>
      </div>

      {/* 移动端分支树覆盖层 */}
      {showBranchTree && (
        <div className="lg:hidden">
          <BranchTreePanel 
            agentHierarchy={agentHierarchy}
            currentAgentId={currentAgent?.id || ''}
            onSwitchAgent={(agentId) => {
              handleSwitchAgent(agentId);
              setShowBranchTree(false);
            }}
            onDeleteAgent={handleDeleteAgent}
            isVisible={showBranchTree}
            onClose={() => setShowBranchTree(false)} 
          />
        </div>
      )}

      {/* 侧边栏遮罩 */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* 性能监控组件 */}
      <PerformanceMonitor
        agentCount={Object.keys(agents).length}
        messageCount={Object.values(messagesByAgent).reduce((total, msgs) => total + msgs.length, 0)}
        onOptimize={handlePerformanceOptimization}
      />
      
      {/* 快捷键帮助弹窗 */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">快捷键帮助</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>发送消息</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + Enter</kbd>
              </div>
              <div className="flex justify-between">
                <span>切换侧边栏</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + B</kbd>
              </div>
              <div className="flex justify-between">
                <span>切换分支树</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + T</kbd>
              </div>
              <div className="flex justify-between">
                <span>显示帮助</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + /</kbd>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-700">
              💡 提示：新用户建议先创建一个分支Agent来体验多Agent对话功能！
            </div>
          </div>
        </div>
      )}
      
      {/* 用户引导 */}
      {showUserGuide && (
        <UserGuide
          onClose={() => setShowUserGuide(false)}
          onComplete={handleGuideComplete}
        />
      )}
    </div>
  );
};

export default HomePage;