import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, Database, Zap } from 'lucide-react';

interface PerformanceStats {
  memoryUsage: number;
  renderTime: number;
  agentCount: number;
  messageCount: number;
  fps: number;
  lastUpdate: number;
}

interface PerformanceMonitorProps {
  agentCount: number;
  messageCount: number;
  onOptimize?: () => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  agentCount,
  messageCount,
  onOptimize
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    memoryUsage: 0,
    renderTime: 0,
    agentCount: 0,
    messageCount: 0,
    fps: 60,
    lastUpdate: Date.now()
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);
  
  // 性能监控
  const updatePerformanceStats = useCallback(() => {
    const now = Date.now();
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    
    const newStats: PerformanceStats = {
      memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0,
      renderTime: performance.now(),
      agentCount,
      messageCount,
      fps: 1000 / (now - stats.lastUpdate),
      lastUpdate: now
    };
    
    setStats(newStats);
    
    // 更新性能历史（保留最近20个数据点）
    setPerformanceHistory(prev => {
      const updated = [...prev, newStats.memoryUsage];
      return updated.slice(-20);
    });
  }, [agentCount, messageCount, stats.lastUpdate]);
  
  useEffect(() => {
    const interval = setInterval(updatePerformanceStats, 1000);
    return () => clearInterval(interval);
  }, [updatePerformanceStats]);
  
  // 性能评级
  const getPerformanceGrade = () => {
    const { memoryUsage, fps } = stats;
    
    if (memoryUsage > 100 || fps < 30) return { grade: 'Poor', color: 'text-red-500', bg: 'bg-red-50' };
    if (memoryUsage > 50 || fps < 45) return { grade: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-50' };
    return { grade: 'Good', color: 'text-green-500', bg: 'bg-green-50' };
  };
  
  const performanceGrade = getPerformanceGrade();
  
  // 性能优化建议
  const getOptimizationSuggestions = () => {
    const suggestions = [];
    
    if (stats.memoryUsage > 80) {
      suggestions.push('内存使用过高，建议清理旧消息');
    }
    
    if (stats.messageCount > 100) {
      suggestions.push('消息数量较多，建议启用虚拟滚动');
    }
    
    if (stats.agentCount > 20) {
      suggestions.push('Agent数量较多，建议清理不活跃的Agent');
    }
    
    return suggestions;
  };
  
  const suggestions = getOptimizationSuggestions();
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 性能指示器 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-200
          ${performanceGrade.bg} ${performanceGrade.color} border border-current/20
          hover:shadow-xl transform hover:scale-105
        `}
        title="点击查看详细性能信息"
      >
        <Activity className="w-4 h-4" />
        <span className="text-sm font-medium">{performanceGrade.grade}</span>
        <span className="text-xs opacity-75">{stats.memoryUsage.toFixed(1)}MB</span>
      </button>
      
      {/* 详细性能面板 */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">性能监控</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          {/* 性能指标 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Database className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-xs text-gray-500">内存使用</div>
                <div className="font-medium">{stats.memoryUsage.toFixed(1)} MB</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Zap className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-xs text-gray-500">FPS</div>
                <div className="font-medium">{Math.round(stats.fps)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Activity className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-xs text-gray-500">Agent数量</div>
                <div className="font-medium">{stats.agentCount}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-xs text-gray-500">消息数量</div>
                <div className="font-medium">{stats.messageCount}</div>
              </div>
            </div>
          </div>
          
          {/* 内存使用趋势图 */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">内存使用趋势</div>
            <div className="h-16 bg-gray-50 rounded p-2 flex items-end justify-between">
              {performanceHistory.map((usage, index) => (
                <div
                  key={index}
                  className="bg-blue-500 rounded-sm w-2 transition-all duration-300"
                  style={{
                    height: `${Math.max(4, (usage / 100) * 100)}%`,
                    opacity: 0.3 + (index / performanceHistory.length) * 0.7
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* 优化建议 */}
          {suggestions.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">优化建议</div>
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    💡 {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 优化操作 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                // 强制垃圾回收（如果浏览器支持）
                if ((window as Window & { gc?: () => void }).gc) {
                  (window as Window & { gc?: () => void }).gc();
                }
                updatePerformanceStats();
              }}
              className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
            >
              刷新统计
            </button>
            
            {onOptimize && (
              <button
                onClick={onOptimize}
                className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
              >
                性能优化
              </button>
            )}
          </div>
          
          {/* 性能等级说明 */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div className="flex justify-between">
                <span className="text-green-600">Good: &lt;50MB, &gt;45FPS</span>
                <span className="text-yellow-600">Fair: &lt;100MB, &gt;30FPS</span>
                <span className="text-red-600">Poor: &gt;100MB, &lt;30FPS</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;