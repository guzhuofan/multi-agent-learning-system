import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setCurrentAgent, addAgent } from '../store/slices/agentSlice';
import { 
  ChevronDown, 
  Plus, 
  Bot, 
  GitBranch, 
  Home, 
  Search,
  Clock,
  MessageCircle,
  Zap,
  Pause,
  CheckCircle,
  X,
  Edit2,
  Check,
  Trash2,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Agent } from '../types';

interface AgentWithStats extends Agent {
  messageCount?: number;
  lastActivity?: string;
}

interface AgentItemProps {
  agent: AgentWithStats;
  currentAgent: Agent | null;
  onSelect: (agent: Agent) => void;
  onRename?: (agentId: string, newName: string) => void;
  onDelete?: (agentId: string) => void;
  getAgentIcon: (agentType: string, stackDepth: number) => React.ReactNode;
  getAgentTypeLabel: (agentType: string, stackDepth: number) => string;
  getStatusIcon: (status?: string) => React.ReactNode;
  isRecent?: boolean;
  level?: number;
}

const AgentItem: React.FC<AgentItemProps> = ({
  agent,
  currentAgent,
  onSelect,
  onRename,
  onDelete,
  getAgentIcon,
  getAgentTypeLabel,
  getStatusIcon,
  isRecent = false,
  level = 0
}) => {
  const isActive = currentAgent?.id === agent.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(agent.topic);
  
  const handleRename = () => {
    if (editName.trim() && editName.trim() !== agent.topic) {
      onRename?.(agent.id, editName.trim());
    }
    setIsEditing(false);
    setEditName(agent.topic);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(agent.topic);
  };
  
  if (isEditing) {
    return (
      <div className={`
        w-full flex items-center space-x-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-md
      `}>
        <div className={`
          flex-shrink-0 p-1.5 rounded transition-colors
          ${agent.agentType === 'main' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
        `}>
          {getAgentIcon(agent.agentType, agent.stackDepth)}
        </div>
        
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              } else if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
            onBlur={handleRename}
          />
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={handleRename}
            className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
            title="确认重命名"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="取消"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`
      w-full flex items-center space-x-3 py-2.5 hover:bg-gray-50 transition-colors group
      ${isActive ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
      ${isRecent ? 'bg-yellow-50/50' : ''}
    `} style={{ paddingLeft: `${12 + level * 20}px` }}>
      {/* 层级指示器 */}
      {level > 0 && (
        <div className="flex items-center space-x-1 text-gray-400">
          {Array.from({ length: level }).map((_, i) => (
            <div key={i} className="w-3 h-px bg-gray-300" />
          ))}
          <ChevronRight className="w-3 h-3" />
        </div>
      )}
      
      <button
        onClick={() => onSelect(agent)}
        className="flex-1 flex items-center space-x-3 text-left"
      >
        <div className={`
          flex-shrink-0 p-1.5 rounded transition-colors
          ${agent.agentType === 'main' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
          ${isActive ? 'bg-blue-200 text-blue-800' : ''}
        `}>
          {getAgentIcon(agent.agentType, agent.stackDepth)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-gray-900 truncate">
              {agent.topic}
            </div>
            {getStatusIcon(agent.status)}
            {isRecent && (
              <Clock className="w-3 h-3 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{getAgentTypeLabel(agent.agentType, agent.stackDepth)}</span>
            {agent.messageCount !== undefined && (
              <span>• {agent.messageCount} 消息</span>
            )}
            {agent.lastActivity && (
              <span>• {new Date(agent.lastActivity).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </button>
      
      <div className="flex items-center space-x-1">
        {/* 重命名按钮 - 仅对主Agent显示 */}
        {agent.agentType === 'main' && onRename && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-all"
            title="重命名主Agent"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
        
        {/* 删除按钮 */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(agent.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-all"
            title={`删除${agent.agentType === 'main' ? '主Agent' : '分支Agent'}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        
        {isActive && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

interface AgentSwitcherProps {
  onCreateBranch?: (messageId: string, topic: string) => void;
  onCreateMainAgent?: (topic: string) => void;
  onRenameAgent?: (agentId: string, newName: string) => void;
  onDeleteAgent?: (agentId: string) => void;
}

// 删除确认对话框组件
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  agent: Agent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  agent,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0 p-2 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              确认删除{agent.agentType === 'main' ? '主Agent' : '分支Agent'}
            </h3>
            <p className="text-sm text-gray-500">
              此操作不可撤销
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            您即将删除 <span className="font-semibold">"{agent.topic}"</span>
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">删除将包括：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>该Agent的所有聊天记录</li>
                  {agent.agentType === 'main' && <li>所有子分支Agent及其数据</li>}
                  <li>相关的上下文和配置信息</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};

const AgentSwitcher: React.FC<AgentSwitcherProps> = ({ onCreateBranch, onCreateMainAgent, onRenameAgent, onDeleteAgent }) => {
  const dispatch = useDispatch();
  const { currentAgentId, agents } = useSelector((state: RootState) => state.agent);
  const currentAgent = currentAgentId ? agents[currentAgentId] : null;
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAgentTopic, setNewAgentTopic] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentAgents, setRecentAgents] = useState<string[]>([]);
  const [createType, setCreateType] = useState<'main' | 'branch'>('branch');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  /**
   * 验证Agent ID是否在后端存在
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

  const handleAgentSelect = async (agent: Agent) => {
    // 验证Agent ID是否有效
    const isValidAgent = await validateAgentId(agent.id);
    if (!isValidAgent) {
      console.error('选择的Agent ID在后端不存在:', agent.id);
      
      // 尝试重新获取所有Agent并同步状态
      try {
        const response = await fetch('http://localhost:8000/api/v1/agents/');
        if (response.ok) {
          const agentsData = await response.json();
          console.log('重新获取的Agent列表:', agentsData);
          
          // 查找匹配的Agent或使用第一个可用的Agent
          const validAgent = agentsData.find((a: any) => a.id === agent.id) || agentsData[0];
          if (validAgent) {
            const syncedAgent: Agent = {
              id: validAgent.id,
              sessionId: validAgent.session_id,
              agentType: validAgent.agent_type,
              topic: validAgent.topic,
              parentId: validAgent.parent_id,
              stackDepth: validAgent.stack_depth,
              contextData: validAgent.context_data,
              status: validAgent.status,
              createdAt: validAgent.created_at
            };
            
            dispatch(addAgent(syncedAgent));
            dispatch(setCurrentAgent(syncedAgent.id));
            
            console.log('已同步并切换到有效的Agent:', syncedAgent.id);
          }
        }
      } catch (syncError) {
        console.error('同步Agent状态失败:', syncError);
      }
      
      setIsOpen(false);
      setSearchTerm('');
      return;
    }
    
    dispatch(setCurrentAgent(agent.id));
    
    // 更新最近使用的Agent列表
    setRecentAgents(prev => {
      const filtered = prev.filter(id => id !== agent.id);
      return [agent.id, ...filtered].slice(0, 5);
    });
    
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateAgent = () => {
    if (!newAgentTopic.trim()) {
      console.log('❌ 创建Agent失败：主题为空');
      return;
    }
    
    console.log('🚀 开始创建新主Agent:', newAgentTopic.trim());
    console.log('📋 onCreateMainAgent回调函数:', typeof onCreateMainAgent);
    
    // 只创建新主Agent
    if (onCreateMainAgent) {
      console.log('✅ 调用onCreateMainAgent回调');
      onCreateMainAgent(newAgentTopic.trim());
    } else {
      console.error('❌ onCreateMainAgent回调函数未提供');
    }
    
    setShowCreateForm(false);
    setNewAgentTopic('');
    setCreateType('main');
    setIsOpen(false);
    
    console.log('🔄 AgentSwitcher状态已重置');
  };

  const handleDeleteAgent = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) {
      console.log('❌ 删除失败：没有选中的Agent');
      return;
    }
    
    console.log('🗑️ 开始删除Agent:', agentToDelete.id, agentToDelete.topic);
    console.log('📋 onDeleteAgent回调函数:', typeof onDeleteAgent);
    
    try {
      // 调用父组件传入的删除处理函数
      if (onDeleteAgent) {
        console.log('✅ 调用onDeleteAgent回调');
        await onDeleteAgent(agentToDelete.id);
        console.log('✅ 删除成功:', agentToDelete.id);
      } else {
        console.error('❌ onDeleteAgent回调函数未提供');
      }
      
    } catch (error) {
      console.error('❌ 删除Agent失败:', error);
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setShowDeleteDialog(false);
      setAgentToDelete(null);
      console.log('🔄 删除对话框已关闭');
    }
  };

  const cancelDeleteAgent = () => {
    setShowDeleteDialog(false);
    setAgentToDelete(null);
  };

  const getAgentIcon = (agentType: string, stackDepth: number) => {
    if (agentType === 'main') {
      return <Home className="w-4 h-4" />;
    }
    return <GitBranch className="w-4 h-4" />;
  };

  const getAgentTypeLabel = (agentType: string, stackDepth: number) => {
    if (agentType === 'main') {
      return '主Agent';
    }
    return `分支Agent (L${stackDepth})`;
  };
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return <Zap className="w-3 h-3 text-green-500" />;
      case 'suspended': return <Pause className="w-3 h-3 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-3 h-3 text-gray-500" />;
      default: return <MessageCircle className="w-3 h-3 text-blue-500" />;
    }
  };
  
  // 构建Agent树状结构
  const buildAgentTree = () => {
    const agentList = Object.values(agents);
    
    // 使用Map去重，确保每个Agent只显示一次
    const uniqueAgentsMap = new Map();
    agentList.forEach(agent => {
      if (!uniqueAgentsMap.has(agent.id)) {
        uniqueAgentsMap.set(agent.id, agent);
      }
    });
    
    const allAgents = Array.from(uniqueAgentsMap.values());
    
    // 过滤搜索结果
    const filteredAgents = allAgents.filter(agent => 
      !searchTerm || 
      agent.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 构建树状结构
    const agentMap = new Map(filteredAgents.map(agent => [agent.id, agent]));
    const tree: Array<{ agent: Agent; children: any[]; level: number }> = [];
    
    // 递归构建子树
    const buildSubtree = (parentId: string | null, level: number = 0): any[] => {
      return filteredAgents
        .filter(agent => agent.parentId === parentId)
        .sort((a, b) => {
          // 优先显示最近使用的
          const aRecentIndex = recentAgents.indexOf(a.id);
          const bRecentIndex = recentAgents.indexOf(b.id);
          
          if (aRecentIndex !== -1 && bRecentIndex !== -1) {
            return aRecentIndex - bRecentIndex;
          }
          if (aRecentIndex !== -1) return -1;
          if (bRecentIndex !== -1) return 1;
          
          // 按创建时间排序
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })
        .map(agent => ({
          agent,
          children: buildSubtree(agent.id, level + 1),
          level
        }));
    };
    
    // 首先获取所有主Agent
    const mainAgents = buildSubtree(null, 0);
    
    return mainAgents;
  };
  
  // 将树状结构扁平化为渲染列表
  const flattenTree = (tree: any[]): Array<{ agent: Agent; level: number }> => {
    const result: Array<{ agent: Agent; level: number }> = [];
    
    const traverse = (nodes: any[]) => {
      nodes.forEach(node => {
        result.push({ agent: node.agent, level: node.level });
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(tree);
    return result;
  };
  
  const agentTree = buildAgentTree();
  const flattenedAgents = flattenTree(agentTree);

  return (
    <div className="relative">
      {/* 当前Agent显示 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-md">
            {currentAgent ? getAgentIcon(currentAgent.agentType, currentAgent.stackDepth) : <Bot className="w-4 h-4" />}
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-gray-900 truncate">
              {currentAgent?.topic || '选择Agent'}
            </div>
            <div className="text-sm text-gray-500">
              {currentAgent ? getAgentTypeLabel(currentAgent.agentType, currentAgent.stackDepth) : '未选择'}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[500px] overflow-hidden flex flex-col"
        >
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索Agent... (Ctrl+K)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Agent列表 */}
          <div className="flex-1 overflow-y-auto" style={{maxHeight: '300px'}}>
            {flattenedAgents.length === 0 ? (
              <div className="px-3 py-8 text-sm text-gray-500 text-center">
                {searchTerm ? '未找到匹配的Agent' : '暂无Agent'}
              </div>
            ) : (
              <div className="py-1">
                {flattenedAgents.map(({ agent, level }) => (
                  <AgentItem 
                    key={agent.id}
                    agent={agent as AgentWithStats}
                    currentAgent={currentAgent}
                    onSelect={handleAgentSelect}
                    onRename={onRenameAgent}
                    onDelete={(agentId: string) => {
                      const agentToDelete = agents[agentId];
                      if (agentToDelete) {
                        handleDeleteAgent(agentToDelete);
                      }
                    }}
                    getAgentIcon={getAgentIcon}
                    getAgentTypeLabel={getAgentTypeLabel}
                    getStatusIcon={getStatusIcon}
                    level={level}
                    isRecent={recentAgents.includes(agent.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-200" />

          {/* 创建新Agent */}
          <div className="py-1">
            {!showCreateForm ? (
              <>
                {/* 创建新主Agent */}
                <button
                  onClick={() => {
                    setShowCreateForm(true);
                    setCreateType('main');
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-green-600"
                >
                  <div className="flex-shrink-0 p-1.5 bg-green-100 rounded">
                    <Home className="w-3 h-3" />
                  </div>
                  <span className="font-medium">创建新主Agent</span>
                </button>
              </>
            ) : (
              <div className="p-3 border-t border-gray-100">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      主Agent名称
                    </label>
                    <input
                      type="text"
                      value={newAgentTopic}
                      onChange={(e) => setNewAgentTopic(e.target.value)}
                      placeholder="输入主Agent的名称..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateAgent();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowCreateForm(false);
                          setNewAgentTopic('');
                        }
                      }}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateAgent}
                      disabled={!newAgentTopic.trim()}
                      className="flex-1 px-3 py-1.5 text-white text-sm font-medium rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors bg-green-600 hover:bg-green-700"
                    >
                      创建主Agent
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewAgentTopic('');
                        setCreateType('main');
                      }}
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        agent={agentToDelete}
        onConfirm={confirmDeleteAgent}
        onCancel={cancelDeleteAgent}
      />
    </div>
  );
};

export default AgentSwitcher;