/**
 * 类型定义统一导出文件
 * 
 * 集中管理所有类型定义，确保类型一致性
 * 
 * @author Multi-Agent Learning System Team
 * @version 1.0.0
 */

// 从各个slice导出类型
export type { Agent, AgentNode } from '../store/slices/agentSlice';
export type { Message, Conversation } from '../store/slices/chatSlice';

// 通用类型定义
export interface SessionStats {
  totalMessages: number;
  totalAgents: number;
  activeAgents: number;
  maxDepth: number;
  startTime: string;
  lastActivity: string;
}

// UI组件相关类型
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}