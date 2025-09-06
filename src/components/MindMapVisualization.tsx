import React, { useState, useEffect, useRef } from 'react';
import { Target, GitBranch, Zap, Clock, MessageCircle } from 'lucide-react';

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

interface MindMapNode extends AgentNode {
  x: number;
  y: number;
  radius: number;
}

interface MindMapVisualizationProps {
  agentHierarchy: AgentNode[];
  currentAgentId: string;
  onSwitchAgent: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
  width?: number;
  height?: number;
  showLegend?: boolean;
}

const MindMapVisualization: React.FC<MindMapVisualizationProps> = ({
  agentHierarchy,
  currentAgentId,
  onSwitchAgent,
  onDeleteAgent,
  width = 800,
  height = 600,
  showLegend = true
}) => {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * 计算节点位置 - 使用改进的径向布局算法
   */
  const calculateNodePositions = (hierarchy: AgentNode[]): MindMapNode[] => {
    const centerX = width / 2;
    const centerY = height / 2;
    const mindMapNodes: MindMapNode[] = [];
    const processedNodes = new Set<string>();

    const processNode = (
      node: AgentNode, 
      x: number, 
      y: number, 
      level: number, 
      angle: number = 0, 
      radius: number = 0
    ) => {
      // 避免重复处理同一个节点
      if (processedNodes.has(node.id)) {
        return;
      }
      processedNodes.add(node.id);
      
      const nodeRadius = node.agentType === 'main' ? 35 : 25; // 稍微减小节点大小
      
      const mindMapNode: MindMapNode = {
        ...node,
        x,
        y,
        radius: nodeRadius
      };
      
      mindMapNodes.push(mindMapNode);

      // 处理子节点
      if (node.children && node.children.length > 0) {
        const childCount = node.children.length;
        
        // 根据子节点数量和画布大小动态调整布局
        if (childCount === 1) {
          // 单个子节点：直接向右或向下
          const childX = Math.min(width - 60, x + 80);
          const childY = y;
          processNode(node.children[0], childX, childY, level + 1, 0, 80);
        } else if (childCount <= 4) {
          // 少量子节点：使用扇形布局
          const baseRadius = Math.min(70, (width - 100) / 3);
          const angleRange = Math.PI; // 180度扇形
          const startAngle = angle - angleRange / 2;
          const angleStep = angleRange / Math.max(childCount - 1, 1);
          
          node.children.forEach((child, index) => {
            const childAngle = startAngle + index * angleStep;
            const childX = Math.max(40, Math.min(width - 40, x + Math.cos(childAngle) * baseRadius));
            const childY = Math.max(40, Math.min(height - 40, y + Math.sin(childAngle) * baseRadius));
            processNode(child, childX, childY, level + 1, childAngle, baseRadius);
          });
        } else {
          // 大量子节点：使用圆形布局
          const baseRadius = Math.min(60, (width - 100) / 4);
          const angleStep = (Math.PI * 2) / childCount;
          
          node.children.forEach((child, index) => {
            const childAngle = angle + index * angleStep;
            const childX = Math.max(40, Math.min(width - 40, x + Math.cos(childAngle) * baseRadius));
            const childY = Math.max(40, Math.min(height - 40, y + Math.sin(childAngle) * baseRadius));
            processNode(child, childX, childY, level + 1, childAngle, baseRadius);
          });
        }
      }
    };

    // 处理所有根节点
    if (hierarchy.length > 0) {
      // 找到主节点
      const mainNodes = hierarchy.filter(node => node.agentType === 'main');
      const branchNodes = hierarchy.filter(node => node.agentType === 'branch' && !node.parentId);
      
      if (mainNodes.length > 0) {
        // 处理主节点 - 放在中心偏左位置，为分支留出空间
        const mainNode = mainNodes[0];
        const mainX = mainNodes.length === 1 ? Math.max(60, centerX - 40) : centerX;
        processNode(mainNode, mainX, centerY, 0);
        
        // 处理其他主节点（如果有多个）
        mainNodes.slice(1).forEach((node, index) => {
          const angle = (index + 1) * (Math.PI * 2) / (mainNodes.length);
          const x = centerX + Math.cos(angle) * 100;
          const y = centerY + Math.sin(angle) * 100;
          processNode(node, x, y, 0, angle, 100);
        });
      }
      
      // 处理独立的分支节点
      branchNodes.forEach((node, index) => {
        const angle = (index * Math.PI * 2) / branchNodes.length;
        const x = centerX + Math.cos(angle) * 80;
        const y = centerY + Math.sin(angle) * 80;
        processNode(node, x, y, 1, angle, 80);
      });
    }

    return mindMapNodes;
  };

  // 当层级数据变化时重新计算节点位置
  useEffect(() => {
    const newNodes = calculateNodePositions(agentHierarchy);
    setNodes(newNodes);
  }, [agentHierarchy, width, height]);

  /**
   * 获取节点颜色
   */
  const getNodeColor = (node: MindMapNode) => {
    if (node.id === currentAgentId) {
      return {
        fill: '#3B82F6',
        stroke: '#1D4ED8',
        textColor: '#FFFFFF'
      };
    }
    
    if (node.agentType === 'main') {
      return {
        fill: '#10B981',
        stroke: '#059669',
        textColor: '#FFFFFF'
      };
    }
    
    switch (node.status) {
      case 'active':
        return {
          fill: '#F59E0B',
          stroke: '#D97706',
          textColor: '#FFFFFF'
        };
      case 'suspended':
        return {
          fill: '#6B7280',
          stroke: '#4B5563',
          textColor: '#FFFFFF'
        };
      case 'completed':
        return {
          fill: '#8B5CF6',
          stroke: '#7C3AED',
          textColor: '#FFFFFF'
        };
      default:
        return {
          fill: '#E5E7EB',
          stroke: '#9CA3AF',
          textColor: '#374151'
        };
    }
  };

  /**
   * 绘制连接线
   */
  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    nodes.forEach(node => {
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          // 计算连接点（节点边缘而不是中心）
          const dx = node.x - parent.x;
          const dy = node.y - parent.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const startX = parent.x + (dx / distance) * parent.radius;
          const startY = parent.y + (dy / distance) * parent.radius;
          const endX = node.x - (dx / distance) * node.radius;
          const endY = node.y - (dy / distance) * node.radius;
          
          connections.push(
            <line
              key={`connection-${parent.id}-${node.id}`}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray={node.agentType === 'branch' ? '5,5' : 'none'}
              className="transition-all duration-200"
            />
          );
        }
      }
    });
    
    return connections;
  };

  /**
   * 处理节点点击
   */
  const handleNodeClick = (nodeId: string) => {
    onSwitchAgent(nodeId);
    setSelectedNode(nodeId);
  };

  /**
   * 获取节点图标
   */
  const getNodeIcon = (node: MindMapNode) => {
    if (node.agentType === 'main') {
      return <Target size={16} />;
    }
    return <GitBranch size={14} />;
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* 背景网格 */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          
          {/* 渐变定义 */}
          <radialGradient id="nodeGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
          </radialGradient>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* 连接线 */}
        <g className="connections">
          {renderConnections()}
        </g>
        
        {/* 节点 */}
        <g className="nodes">
          {nodes.map(node => {
            const colors = getNodeColor(node);
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const scale = isHovered ? 1.1 : isSelected ? 1.05 : 1;
            
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.id)}
              >
                {/* 节点阴影 */}
                <circle
                  cx={2}
                  cy={2}
                  r={node.radius}
                  fill="rgba(0,0,0,0.1)"
                  className="transition-all duration-200"
                />
                
                {/* 节点主体 */}
                <circle
                  cx={0}
                  cy={0}
                  r={node.radius}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={node.id === currentAgentId ? 3 : 2}
                  className="transition-all duration-200"
                />
                
                {/* 节点渐变效果 */}
                <circle
                  cx={0}
                  cy={0}
                  r={node.radius - 2}
                  fill="url(#nodeGradient)"
                  className="pointer-events-none"
                />
                
                {/* 节点图标 */}
                <foreignObject
                  x={-8}
                  y={-8}
                  width={16}
                  height={16}
                  className="pointer-events-none"
                >
                  <div className="flex items-center justify-center w-full h-full" style={{ color: colors.textColor }}>
                    {getNodeIcon(node)}
                  </div>
                </foreignObject>
                
                {/* 活跃指示器 */}
                {node.id === currentAgentId && (
                  <circle
                    cx={0}
                    cy={0}
                    r={node.radius + 5}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    className="animate-spin"
                    style={{ animationDuration: '3s' }}
                  />
                )}
                
                {/* 消息计数 */}
                {node.messageCount && node.messageCount > 0 && (
                  <g transform={`translate(${node.radius - 8}, ${-node.radius + 8})`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={8}
                      fill="#EF4444"
                      stroke="white"
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="10"
                      fill="white"
                      fontWeight="bold"
                    >
                      {node.messageCount > 99 ? '99+' : node.messageCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* 悬停信息卡片 */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-10">
          {(() => {
            const node = nodes.find(n => n.id === hoveredNode);
            if (!node) return null;
            
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-blue-600">
                    {getNodeIcon(node)}
                  </div>
                  <h4 className="font-semibold text-gray-800 truncate">
                    {node.topic || (node.agentType === 'main' ? '主Agent' : '分支Agent')}
                  </h4>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={12} />
                    <span>{node.messageCount || 0} 条消息</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>深度: L{node.level}</span>
                  </div>
                  {node.lastActivity && (
                    <div className="text-xs text-gray-500">
                      最后活动: {new Date(node.lastActivity).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      
      {/* 图例 */}
      {showLegend && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <h5 className="font-semibold text-gray-800 mb-2 text-sm">图例</h5>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>主Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>分支Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-300"></div>
              <span>当前Agent</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMapVisualization;
export type { AgentNode, MindMapVisualizationProps };