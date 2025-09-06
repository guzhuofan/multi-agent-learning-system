import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Target, GitBranch, X, Trash2, Grid3x3, List } from 'lucide-react';
import MindMapVisualization from './MindMapVisualization';

interface AgentNode {
  id: string;
  parentId?: string;
  agentType: 'main' | 'branch';
  topic: string;
  level: number;
  status?: 'active' | 'suspended' | 'completed';
  messageCount?: number;
  lastActivity?: string;
  children?: AgentNode[];
}

interface BranchTreePanelProps {
  agentHierarchy: AgentNode[];
  currentAgentId: string;
  onSwitchAgent: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
  onClose: () => void;
  isVisible: boolean;
  sessionStats?: {
    totalAgents: number;
    activeAgents: number;
    maxDepth: number;
  };
}

const TreeNode: React.FC<{
  node: AgentNode;
  currentAgentId: string;
  onSwitchAgent: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
  level: number;
}> = ({ node, currentAgentId, onSwitchAgent, onDeleteAgent, level }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isActive = node.id === currentAgentId;
  const isMain = node.agentType === 'main';
  const hasChildren = node.children && node.children.length > 0;
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'suspended': return 'text-yellow-600';
      case 'completed': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return '●';
      case 'suspended': return '⏸';
      case 'completed': return '✓';
      default: return '○';
    }
  };
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteAgent && !isDeleting) {
      // 对于主Agent，需要用户确认
      if (isMain) {
        const confirmed = window.confirm(
          '确定要删除主Agent吗？这将删除整个对话会话及其所有分支Agent。'
        );
        if (!confirmed) {
          return;
        }
      }
      
      setIsDeleting(true);
      try {
        await onDeleteAgent(node.id);
        console.log('删除Agent成功:', node.id);
      } catch (error) {
        console.error('删除Agent失败:', error);
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <div className="relative">
      {/* 连接线 */}
      {level > 0 && (
        <div className="absolute left-0 top-0 w-full h-6">
          <div 
            className="absolute border-l-2 border-gray-300"
            style={{ 
              left: `${(level - 1) * 24 + 12}px`,
              height: '24px'
            }}
          />
          <div 
            className="absolute border-b-2 border-gray-300"
            style={{ 
              left: `${(level - 1) * 24 + 12}px`,
              top: '12px',
              width: '12px'
            }}
          />
        </div>
      )}
      
      {/* 节点内容 */}
      <div 
        className={`relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 group ${
          isActive 
            ? 'bg-blue-100 border-2 border-blue-300 shadow-sm' 
            : 'hover:bg-gray-50 border-2 border-transparent'
        }`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => onSwitchAgent(node.id)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren && (
          <button
            onClick={handleToggleExpand}
            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-600" />
            ) : (
              <ChevronRight size={14} className="text-gray-600" />
            )}
          </button>
        )}
        
        {/* Agent图标 */}
        <div className="flex-shrink-0">
          {isMain ? (
            <Target size={16} className="text-blue-600" />
          ) : (
            <GitBranch size={16} className="text-green-600" />
          )}
        </div>
        
        {/* 状态指示器 */}
        <span className={`text-xs ${getStatusColor(node.status)}`}>
          {getStatusIcon(node.status)}
        </span>
        
        {/* 节点信息 */}
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm truncate ${
            isActive ? 'text-blue-900' : 'text-gray-900'
          }`}>
            {node.topic || (isMain ? '主线学习' : '分支探索')}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{isMain ? 'Main' : `L${level}`}</span>
            {node.messageCount !== undefined && (
              <span>• {node.messageCount} 消息</span>
            )}
            {node.lastActivity && (
              <span>• {new Date(node.lastActivity).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className={`flex-shrink-0 flex items-center gap-1 transition-opacity duration-200 ${
          showActions || isDeleting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`p-1 rounded transition-colors ${
              isDeleting 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-red-500 hover:bg-red-50 hover:text-red-700'
            }`}
            title={isDeleting ? '删除中...' : (isMain ? '删除主Agent' : '删除分支')}
          >
            {isDeleting ? (
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
        
        {/* 活跃指示器 */}
        {isActive && (
          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
      
      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children!.map(child => (
            <TreeNode 
              key={child.id}
              node={child}
              currentAgentId={currentAgentId}
              onSwitchAgent={onSwitchAgent}
              onDeleteAgent={onDeleteAgent}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const BranchTreePanel: React.FC<BranchTreePanelProps> = ({ 
  agentHierarchy, 
  currentAgentId, 
  onSwitchAgent, 
  onDeleteAgent,
  sessionStats,
  onClose,
  isVisible 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'mindmap'>('tree');
  
  if (!isVisible) return null;
  
  // 计算统计信息
  const totalAgents = agentHierarchy?.reduce((count, node) => {
    const countNode = (n: AgentNode): number => {
      return 1 + (n.children?.reduce((sum, child) => sum + countNode(child), 0) || 0);
    };
    return count + countNode(node);
  }, 0) || 0;
  
  const activeAgents = agentHierarchy?.reduce((count, node) => {
    const countActiveNode = (n: AgentNode): number => {
      const isActive = n.status === 'active' ? 1 : 0;
      return isActive + (n.children?.reduce((sum, child) => sum + countActiveNode(child), 0) || 0);
    };
    return count + countActiveNode(node);
  }, 0) || 0;
  
  // 过滤节点
  const filterNode = (node: AgentNode): AgentNode | null => {
    const matchesSearch = !searchTerm || 
      node.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || node.status === filterStatus;
    
    if (!matchesSearch && !matchesStatus) {
      return null;
    }
    
    const filteredChildren = node.children?.map(filterNode).filter(Boolean) as AgentNode[] || [];
    
    return {
      ...node,
      children: filteredChildren
    };
  };
  
  const filteredTree = agentHierarchy?.map(filterNode).filter(Boolean) as AgentNode[] || [];
  
  return (
    <>
      {/* 面板内容 */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col h-full animate-fade-in z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <GitBranch size={20} className="text-blue-600" />
            学习路径
          </h3>
          <div className="flex items-center gap-2">
            {/* 视图切换按钮 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="树形视图"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('mindmap')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'mindmap'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="思维导图视图"
              >
                <Grid3x3 size={16} />
              </button>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{totalAgents}</div>
              <div className="text-gray-600">总Agent数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{activeAgents}</div>
              <div className="text-gray-600">活跃Agent</div>
            </div>
          </div>
          {sessionStats && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>总Agent: {sessionStats.totalAgents}</span>
                <span>最大深度: {sessionStats.maxDepth}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 搜索和过滤 */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索Agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            {['all', 'active', 'suspended', 'completed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? '全部' : 
                 status === 'active' ? '活跃' :
                 status === 'suspended' ? '暂停' : '完成'}
              </button>
            ))}
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'tree' ? (
            /* 树形结构 */
            <div className="h-full overflow-y-auto p-4">
              {filteredTree.length > 0 ? (
                <div className="space-y-2">
                  {filteredTree.map(node => (
                    <TreeNode 
                      key={node.id}
                      node={node}
                      currentAgentId={currentAgentId}
                      onSwitchAgent={onSwitchAgent}
                      onDeleteAgent={onDeleteAgent}
                      level={0}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-gray-500 text-sm">未找到匹配的Agent</p>
                </div>
              )}
            </div>
          ) : (
            /* 思维导图视图 - 按主Agent分组显示 */
            <div className="h-full overflow-y-auto">
              {(() => {
                // 按主Agent分组
                const mainAgents = filteredTree.filter(node => node.agentType === 'main');
                
                if (mainAgents.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-2xl mb-2">🌳</div>
                      <p className="text-gray-500 text-sm">暂无主Agent</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-4 p-4">
                    {mainAgents.map((mainAgent, index) => (
                      <div key={mainAgent.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* 主Agent标题 */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Target size={16} className="text-blue-600" />
                            <h4 className="font-medium text-gray-800 truncate">
                              {mainAgent.topic || `主Agent ${index + 1}`}
                            </h4>
                            {mainAgent.id === currentAgentId && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            )}
                          </div>
                        </div>
                        
                        {/* 该主Agent的思维导图 */}
                        <div className="h-64">
                          <MindMapVisualization
                            agentHierarchy={[mainAgent]}
                            currentAgentId={currentAgentId}
                            onSwitchAgent={onSwitchAgent}
                            onDeleteAgent={onDeleteAgent}
                            width={288}
                            height={256}
                            showLegend={false}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        
        {/* 图例 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Target size={12} className="text-blue-600" />
              <span className="text-gray-600">主线</span>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch size={12} className="text-green-600" />
              <span className="text-gray-600">分支</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">●</span>
              <span className="text-gray-600">活跃</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⏸</span>
              <span className="text-gray-600">暂停</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BranchTreePanel;
export type { AgentNode, BranchTreePanelProps };