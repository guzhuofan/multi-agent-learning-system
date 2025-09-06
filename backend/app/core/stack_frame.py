from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import uuid
from dataclasses import dataclass, field


@dataclass
class AgentStackFrame:
    """
    Agent栈帧类 - 栈帧式分支Agent架构的核心组件
    
    每个Agent维护独立的上下文栈帧，支持：
    - 独立的上下文空间
    - 智能上下文继承
    - 栈深度管理
    - 状态控制
    """
    
    agent_id: str
    parent_frame: Optional['AgentStackFrame'] = None
    context_data: Dict[str, Any] = field(default_factory=dict)
    inherited_context: Dict[str, Any] = field(default_factory=dict)
    stack_depth: int = 0
    status: str = "active"  # active, suspended, completed
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    frame_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    def __post_init__(self):
        """初始化后处理"""
        if self.parent_frame:
            self.stack_depth = self.parent_frame.stack_depth + 1
        
        # 验证栈深度限制（最多5层）
        if self.stack_depth > 5:
            raise ValueError(f"栈深度超过限制：{self.stack_depth} > 5")
    
    def inherit_context(self, mode: str = 'selective', topic: str = "") -> Dict[str, Any]:
        """
        智能继承父Agent上下文
        
        Args:
            mode: 继承模式 - selective/summary/full/none
            topic: 分支主题（用于相关性计算）
            
        Returns:
            继承的上下文数据
        """
        if not self.parent_frame:
            return {}
        
        parent_context = self.parent_frame.context_data
        parent_messages = parent_context.get('messages', [])
        
        if mode == 'none':
            return {}
        
        elif mode == 'full':
            # 完整继承父上下文
            self.inherited_context = {
                'inherited_messages': parent_messages,
                'inheritance_mode': 'full',
                'source_agent_id': self.parent_frame.agent_id,
                'message_count': len(parent_messages),
                'inherited_at': datetime.now().isoformat()
            }
        
        elif mode == 'selective':
            # 选择性继承（基于相关性选择3-5条对话）
            relevant_messages = self._select_relevant_messages(parent_messages, topic)
            self.inherited_context = {
                'inherited_messages': relevant_messages,
                'inheritance_mode': 'selective',
                'source_agent_id': self.parent_frame.agent_id,
                'message_count': len(relevant_messages),
                'selection_criteria': topic,
                'inherited_at': datetime.now().isoformat()
            }
        
        elif mode == 'summary':
            # 摘要继承
            summary = self._generate_context_summary(parent_messages, topic)
            self.inherited_context = {
                'context_summary': summary,
                'inheritance_mode': 'summary',
                'source_agent_id': self.parent_frame.agent_id,
                'original_message_count': len(parent_messages),
                'summary_topic': topic,
                'inherited_at': datetime.now().isoformat()
            }
        
        self.updated_at = datetime.now()
        return self.inherited_context
    
    def _select_relevant_messages(self, messages: List[Dict], topic: str) -> List[Dict]:
        """
        基于相关性选择消息
        
        Args:
            messages: 父Agent的消息列表
            topic: 分支主题
            
        Returns:
            选择的相关消息列表
        """
        if not messages or not topic:
            # 如果没有主题，返回最近的3条消息
            return messages[-3:] if len(messages) > 3 else messages
        
        # 计算每条消息的相关性得分
        scored_messages = []
        for msg in messages:
            content = msg.get('content', '')
            relevance_score = self._calculate_relevance(content, topic)
            scored_messages.append((msg, relevance_score))
        
        # 按相关性排序
        scored_messages.sort(key=lambda x: x[1], reverse=True)
        
        # 选择最相关的3-5条消息
        selected_count = min(5, max(3, len(scored_messages) // 2))
        selected_messages = [msg for msg, score in scored_messages[:selected_count] if score > 0.1]
        
        # 如果相关消息太少，补充最近的消息
        if len(selected_messages) < 2:
            recent_messages = messages[-3:] if len(messages) > 3 else messages
            selected_messages.extend(recent_messages)
            # 去重
            seen_ids = set()
            unique_messages = []
            for msg in selected_messages:
                msg_id = msg.get('id', msg.get('content', '')[:50])
                if msg_id not in seen_ids:
                    seen_ids.add(msg_id)
                    unique_messages.append(msg)
            selected_messages = unique_messages[:5]
        
        return selected_messages
    
    def _calculate_relevance(self, message_content: str, topic: str) -> float:
        """
        计算消息与主题的相关性
        
        Args:
            message_content: 消息内容
            topic: 主题
            
        Returns:
            相关性得分 (0-1)
        """
        if not message_content or not topic:
            return 0.0
        
        message_lower = message_content.lower()
        topic_lower = topic.lower()
        
        # 1. 关键词匹配得分
        topic_words = set(topic_lower.split())
        message_words = set(message_lower.split())
        
        if not topic_words:
            return 0.0
        
        # 计算词汇重叠度
        overlap = len(topic_words.intersection(message_words))
        keyword_score = overlap / len(topic_words)
        
        # 2. 语义包含得分
        semantic_score = 0.0
        for word in topic_words:
            if word in message_lower:
                semantic_score += 1.0
        semantic_score = semantic_score / len(topic_words)
        
        # 3. 长度权重（较长的消息可能包含更多信息）
        length_weight = min(1.0, len(message_content) / 100)
        
        # 综合评分
        final_score = (0.4 * keyword_score + 0.4 * semantic_score + 0.2 * length_weight)
        
        return min(1.0, final_score)
    
    def _generate_context_summary(self, messages: List[Dict], topic: str) -> str:
        """
        生成上下文摘要
        
        Args:
            messages: 消息列表
            topic: 分支主题
            
        Returns:
            上下文摘要字符串
        """
        if not messages:
            return f"开始探讨新主题：{topic}"
        
        # 分类消息
        user_messages = [msg for msg in messages if msg.get('role') == 'user']
        assistant_messages = [msg for msg in messages if msg.get('role') == 'assistant']
        
        summary_parts = []
        
        # 添加主题信息
        summary_parts.append(f"当前探讨主题：{topic}")
        
        # 用户问题摘要
        if user_messages:
            recent_questions = []
            for msg in user_messages[-3:]:
                content = msg.get('content', '')[:80]
                if content:
                    recent_questions.append(content)
            
            if recent_questions:
                summary_parts.append(f"主要问题：{' | '.join(recent_questions)}")
        
        # 助手回答要点
        if assistant_messages:
            key_points = []
            for msg in assistant_messages[-2:]:
                content = msg.get('content', '')[:100]
                if content:
                    key_points.append(content)
            
            if key_points:
                summary_parts.append(f"关键要点：{' | '.join(key_points)}")
        
        # 对话统计
        summary_parts.append(f"对话轮次：{len(messages)}")
        
        return " \n".join(summary_parts)
    
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        向栈帧添加消息
        
        Args:
            role: 消息角色 (user/assistant/system)
            content: 消息内容
            metadata: 消息元数据
            
        Returns:
            添加的消息对象
        """
        message = {
            'id': str(uuid.uuid4()),
            'role': role,
            'content': content,
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        # 确保context_data中有messages列表
        if 'messages' not in self.context_data:
            self.context_data['messages'] = []
        
        self.context_data['messages'].append(message)
        self.updated_at = datetime.now()
        
        return message
    
    def get_full_context(self) -> Dict[str, Any]:
        """
        获取完整的上下文（包括继承的上下文）
        
        Returns:
            完整的上下文数据
        """
        full_context = {
            'frame_id': self.frame_id,
            'agent_id': self.agent_id,
            'stack_depth': self.stack_depth,
            'status': self.status,
            'current_context': self.context_data,
            'inherited_context': self.inherited_context,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # 如果有父栈帧，添加父级信息
        if self.parent_frame:
            full_context['parent_agent_id'] = self.parent_frame.agent_id
            full_context['parent_frame_id'] = self.parent_frame.frame_id
        
        return full_context
    
    def suspend(self):
        """挂起栈帧"""
        self.status = "suspended"
        self.updated_at = datetime.now()
    
    def resume(self):
        """恢复栈帧"""
        self.status = "active"
        self.updated_at = datetime.now()
    
    def complete(self):
        """完成栈帧"""
        self.status = "completed"
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'frame_id': self.frame_id,
            'agent_id': self.agent_id,
            'parent_agent_id': self.parent_frame.agent_id if self.parent_frame else None,
            'context_data': self.context_data,
            'inherited_context': self.inherited_context,
            'stack_depth': self.stack_depth,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], parent_frame: Optional['AgentStackFrame'] = None) -> 'AgentStackFrame':
        """从字典创建栈帧对象"""
        frame = cls(
            agent_id=data['agent_id'],
            parent_frame=parent_frame,
            context_data=data.get('context_data', {}),
            inherited_context=data.get('inherited_context', {}),
            stack_depth=data.get('stack_depth', 0),
            status=data.get('status', 'active'),
            frame_id=data.get('frame_id', str(uuid.uuid4()))
        )
        
        # 设置时间戳
        if 'created_at' in data:
            if isinstance(data['created_at'], str):
                frame.created_at = datetime.fromisoformat(data['created_at'])
            else:
                frame.created_at = data['created_at']
        
        if 'updated_at' in data:
            if isinstance(data['updated_at'], str):
                frame.updated_at = datetime.fromisoformat(data['updated_at'])
            else:
                frame.updated_at = data['updated_at']
        
        return frame