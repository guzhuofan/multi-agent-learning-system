import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.core.database import db_manager
from app.models.agent import AgentHierarchyNode


class AgentManager:
    """Agent管理器 - 实现栈帧式Agent架构的核心逻辑"""
    
    def __init__(self):
        self.active_frames: Dict[str, Any] = {}
    
    async def create_stack_frame(self, agent_id: str, context_data: Dict, inherited_context: Dict) -> str:
        """创建Agent栈帧"""
        frame_id = str(uuid.uuid4())
        current_time = datetime.now().isoformat()
        
        # 获取Agent信息以确定栈深度
        agent_row = await db_manager.execute_one(
            "SELECT stack_depth FROM agents WHERE id = ?",
            (agent_id,)
        )
        
        stack_depth = agent_row[0] if agent_row else 0
        
        query = """
            INSERT INTO agent_stack_frames (id, agent_id, context_data, inherited_context, stack_depth, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
        """
        
        await db_manager.execute_insert(
            query,
            (
                frame_id,
                agent_id,
                json.dumps(context_data),
                json.dumps(inherited_context),
                stack_depth,
                current_time,
                current_time
            )
        )
        
        # 缓存到内存中
        self.active_frames[agent_id] = {
            "frame_id": frame_id,
            "context_data": context_data,
            "inherited_context": inherited_context,
            "stack_depth": stack_depth,
            "status": "active"
        }
        
        return frame_id
    
    async def generate_inherited_context(
        self, 
        parent_agent_id: str, 
        inheritance_mode: str, 
        message_id: str
    ) -> Dict[str, Any]:
        """生成继承的上下文"""
        
        if inheritance_mode == "none":
            return {}
        
        # 获取父Agent的消息历史
        messages_query = """
            SELECT role, content, timestamp FROM messages 
            WHERE agent_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 20
        """
        
        rows = await db_manager.execute_query(messages_query, (parent_agent_id,))
        
        if not rows:
            return {}
        
        messages = []
        for row in reversed(rows):  # 按时间顺序排列
            messages.append({
                "role": row[0],
                "content": row[1],
                "timestamp": row[2]
            })
        
        if inheritance_mode == "full":
            return {
                "inherited_messages": messages,
                "inheritance_mode": "full",
                "source_agent_id": parent_agent_id,
                "message_count": len(messages)
            }
        
        elif inheritance_mode == "selective":
            # 选择最相关的消息（这里简化为最近的5条）
            selected_messages = messages[-5:] if len(messages) > 5 else messages
            return {
                "inherited_messages": selected_messages,
                "inheritance_mode": "selective",
                "source_agent_id": parent_agent_id,
                "message_count": len(selected_messages)
            }
        
        elif inheritance_mode == "summary":
            # 生成摘要（这里简化处理）
            summary = self._generate_context_summary(messages)
            return {
                "context_summary": summary,
                "inheritance_mode": "summary",
                "source_agent_id": parent_agent_id,
                "original_message_count": len(messages)
            }
        
        return {}
    
    def _generate_context_summary(self, messages: List[Dict]) -> str:
        """生成上下文摘要（简化版本）"""
        if not messages:
            return "无对话历史"
        
        # 提取关键信息
        user_messages = [msg for msg in messages if msg["role"] == "user"]
        assistant_messages = [msg for msg in messages if msg["role"] == "assistant"]
        
        summary_parts = []
        
        if user_messages:
            # 获取最近的用户问题
            recent_questions = [msg["content"][:100] for msg in user_messages[-3:]]
            summary_parts.append(f"最近讨论的问题: {'; '.join(recent_questions)}")
        
        if assistant_messages:
            # 获取关键回答片段
            recent_answers = [msg["content"][:100] for msg in assistant_messages[-2:]]
            summary_parts.append(f"相关回答要点: {'; '.join(recent_answers)}")
        
        summary_parts.append(f"对话轮次: {len(messages)}")
        
        return " | ".join(summary_parts)
    
    async def build_agent_hierarchy(self, root_agent_id: str) -> AgentHierarchyNode:
        """构建Agent层级结构"""
        
        # 获取根Agent信息
        root_query = "SELECT * FROM agents WHERE id = ?"
        root_row = await db_manager.execute_one(root_query, (root_agent_id,))
        
        if not root_row:
            raise ValueError(f"Agent {root_agent_id} 不存在")
        
        # 递归构建层级结构
        return await self._build_hierarchy_recursive(root_row)
    
    async def _build_hierarchy_recursive(self, agent_row) -> AgentHierarchyNode:
        """递归构建层级结构"""
        agent_id = agent_row[0]
        
        # 创建当前节点
        node = AgentHierarchyNode(
            id=agent_id,
            parent_id=agent_row[2],
            agent_type=agent_row[3],
            topic=agent_row[4],
            level=agent_row[6],
            status=agent_row[7],
            children=[]
        )
        
        # 获取子Agent
        children_query = "SELECT * FROM agents WHERE parent_id = ? ORDER BY created_at"
        children_rows = await db_manager.execute_query(children_query, (agent_id,))
        
        # 递归构建子节点
        for child_row in children_rows:
            child_node = await self._build_hierarchy_recursive(child_row)
            node.children.append(child_node)
        
        return node
    
    async def delete_agent_recursive(self, agent_id: str):
        """递归删除Agent及其所有子Agent"""
        
        # 获取所有子Agent
        children_query = "SELECT id FROM agents WHERE parent_id = ?"
        children_rows = await db_manager.execute_query(children_query, (agent_id,))
        
        # 递归删除子Agent
        for child_row in children_rows:
            await self.delete_agent_recursive(child_row[0])
        
        # 删除当前Agent的消息
        await db_manager.execute_update(
            "DELETE FROM messages WHERE agent_id = ?",
            (agent_id,)
        )
        
        # 删除当前Agent的栈帧
        await db_manager.execute_update(
            "DELETE FROM agent_stack_frames WHERE agent_id = ?",
            (agent_id,)
        )
        
        # 删除当前Agent
        await db_manager.execute_update(
            "DELETE FROM agents WHERE id = ?",
            (agent_id,)
        )
        
        # 从内存缓存中移除
        if agent_id in self.active_frames:
            del self.active_frames[agent_id]
    
    async def suspend_agent_frame(self, agent_id: str):
        """挂起Agent栈帧"""
        await db_manager.execute_update(
            "UPDATE agent_stack_frames SET status = 'suspended', updated_at = ? WHERE agent_id = ?",
            (datetime.now().isoformat(), agent_id)
        )
        
        if agent_id in self.active_frames:
            self.active_frames[agent_id]["status"] = "suspended"
    
    async def resume_agent_frame(self, agent_id: str):
        """恢复Agent栈帧"""
        await db_manager.execute_update(
            "UPDATE agent_stack_frames SET status = 'active', updated_at = ? WHERE agent_id = ?",
            (datetime.now().isoformat(), agent_id)
        )
        
        if agent_id in self.active_frames:
            self.active_frames[agent_id]["status"] = "active"
    
    async def get_agent_context(self, agent_id: str) -> Dict[str, Any]:
        """获取Agent的完整上下文"""
        
        # 先从内存缓存获取
        if agent_id in self.active_frames:
            return self.active_frames[agent_id]
        
        # 从数据库获取
        frame_query = """
            SELECT context_data, inherited_context, stack_depth, status 
            FROM agent_stack_frames 
            WHERE agent_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        
        frame_row = await db_manager.execute_one(frame_query, (agent_id,))
        
        if not frame_row:
            return {}
        
        context = {
            "context_data": json.loads(frame_row[0]) if frame_row[0] else {},
            "inherited_context": json.loads(frame_row[1]) if frame_row[1] else {},
            "stack_depth": frame_row[2],
            "status": frame_row[3]
        }
        
        # 缓存到内存
        self.active_frames[agent_id] = context
        
        return context
    
    async def update_agent_context(self, agent_id: str, context_data: Dict[str, Any]):
        """更新Agent上下文"""
        current_time = datetime.now().isoformat()
        
        # 更新数据库
        await db_manager.execute_update(
            "UPDATE agent_stack_frames SET context_data = ?, updated_at = ? WHERE agent_id = ?",
            (json.dumps(context_data), current_time, agent_id)
        )
        
        # 更新内存缓存
        if agent_id in self.active_frames:
            self.active_frames[agent_id]["context_data"] = context_data
    
    def calculate_message_relevance(self, message: str, branch_topic: str) -> float:
        """计算消息与分支话题的相关性（简化版本）"""
        # 简单的关键词匹配
        message_lower = message.lower()
        topic_lower = branch_topic.lower()
        
        # 计算关键词重叠度
        topic_words = set(topic_lower.split())
        message_words = set(message_lower.split())
        
        if not topic_words:
            return 0.0
        
        overlap = len(topic_words.intersection(message_words))
        keyword_score = overlap / len(topic_words)
        
        # 简单的语义相似度（基于包含关系）
        semantic_score = 0.0
        for word in topic_words:
            if word in message_lower:
                semantic_score += 1.0
        
        semantic_score = semantic_score / len(topic_words) if topic_words else 0.0
        
        # 综合评分
        return 0.6 * semantic_score + 0.4 * keyword_score
    
    async def get_session_hierarchy(self, session_id: str) -> List[AgentHierarchyNode]:
        """获取会话的完整Agent层级结构"""
        
        # 获取会话中的所有Agent
        agents_query = "SELECT * FROM agents WHERE session_id = ? ORDER BY stack_depth, created_at"
        agent_rows = await db_manager.execute_query(agents_query, (session_id,))
        
        if not agent_rows:
            return []
        
        # 构建Agent字典
        agents_dict = {}
        root_agents = []
        
        for row in agent_rows:
            node = AgentHierarchyNode(
                id=row[0],
                parent_id=row[2],
                agent_type=row[3],
                topic=row[4],
                level=row[6],
                status=row[7],
                children=[]
            )
            
            agents_dict[node.id] = node
            
            # 如果没有父Agent，则为根Agent
            if not node.parent_id:
                root_agents.append(node)
        
        # 建立父子关系
        for agent in agents_dict.values():
            if agent.parent_id and agent.parent_id in agents_dict:
                agents_dict[agent.parent_id].children.append(agent)
        
        return root_agents