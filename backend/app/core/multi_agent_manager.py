from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import json
import uuid
import asyncio
from dataclasses import dataclass

from app.core.stack_frame import AgentStackFrame
from app.core.database import db_manager
from app.models.agent import AgentHierarchyNode


@dataclass
class AgentSwitchContext:
    """Agent切换上下文"""
    from_agent_id: str
    to_agent_id: str
    switch_time: datetime
    reason: str = ""


class MultiAgentManager:
    """
    多Agent管理器 - 栈帧式分支Agent架构的核心管理类
    
    功能：
    - 管理Agent栈帧的创建、切换、销毁
    - 实现智能上下文继承
    - 维护Agent层级关系
    - 提供Agent导航和状态管理
    """
    
    def __init__(self):
        self.active_frames: Dict[str, AgentStackFrame] = {}
        self.agent_hierarchy: Dict[str, List[str]] = {}  # parent_id -> [child_ids]
        self.switch_history: List[AgentSwitchContext] = []
        self.max_stack_depth = 5
        self.max_active_agents = 10
    
    async def create_main_agent(self, session_id: str, topic: str, config: Optional[Dict] = None) -> str:
        """
        创建主线Agent
        
        Args:
            session_id: 会话ID
            topic: Agent主题
            config: Agent配置
            
        Returns:
            创建的Agent ID
        """
        agent_id = str(uuid.uuid4())
        current_time = datetime.now().isoformat()
        
        # 创建Agent记录
        agent_query = """
            INSERT INTO agents (id, session_id, parent_id, agent_type, topic, context_data, stack_depth, status, created_at)
            VALUES (?, ?, NULL, 'main', ?, ?, 0, 'active', ?)
        """
        
        context_data = config or {}
        await db_manager.execute_insert(
            agent_query,
            (agent_id, session_id, topic, json.dumps(context_data), current_time)
        )
        
        # 创建栈帧
        main_frame = AgentStackFrame(
            agent_id=agent_id,
            parent_frame=None,
            context_data={'messages': [], 'config': context_data},
            stack_depth=0
        )
        
        # 创建栈帧记录
        await self._create_stack_frame_record(main_frame)
        
        # 缓存到内存
        self.active_frames[agent_id] = main_frame
        
        return agent_id
    
    async def create_branch_agent(
        self, 
        parent_agent_id: str, 
        topic: str, 
        message_id: str,
        inheritance_mode: str = 'selective'
    ) -> str:
        """
        创建分支Agent
        
        Args:
            parent_agent_id: 父Agent ID
            topic: 分支主题
            message_id: 触发分支的消息ID
            inheritance_mode: 上下文继承模式
            
        Returns:
            创建的分支Agent ID
        """
        # 验证父Agent存在
        parent_frame = await self._get_or_load_frame(parent_agent_id)
        if not parent_frame:
            raise ValueError(f"父Agent {parent_agent_id} 不存在")
        
        # 检查栈深度限制
        if parent_frame.stack_depth >= self.max_stack_depth:
            raise ValueError(f"栈深度超过限制：{parent_frame.stack_depth + 1} > {self.max_stack_depth}")
        
        # 检查活跃Agent数量限制
        if len(self.active_frames) >= self.max_active_agents:
            # 自动挂起最老的非主线Agent
            await self._suspend_oldest_branch_agent()
        
        # 获取父Agent信息
        parent_agent_query = "SELECT session_id FROM agents WHERE id = ?"
        parent_row = await db_manager.execute_one(parent_agent_query, (parent_agent_id,))
        if not parent_row:
            raise ValueError(f"父Agent {parent_agent_id} 数据不存在")
        
        session_id = parent_row[0]
        branch_agent_id = str(uuid.uuid4())
        current_time = datetime.now().isoformat()
        
        # 创建分支Agent记录
        branch_query = """
            INSERT INTO agents (id, session_id, parent_id, agent_type, topic, context_data, stack_depth, status, created_at)
            VALUES (?, ?, ?, 'branch', ?, ?, ?, 'active', ?)
        """
        
        context_data = {'branch_from_message': message_id, 'inheritance_mode': inheritance_mode}
        await db_manager.execute_insert(
            branch_query,
            (branch_agent_id, session_id, parent_agent_id, topic, json.dumps(context_data), parent_frame.stack_depth + 1, current_time)
        )
        
        # 创建分支栈帧
        branch_frame = AgentStackFrame(
            agent_id=branch_agent_id,
            parent_frame=parent_frame,
            context_data={'messages': [], 'config': context_data},
            stack_depth=parent_frame.stack_depth + 1
        )
        
        # 执行上下文继承
        inherited_context = branch_frame.inherit_context(inheritance_mode, topic)
        
        # 创建栈帧记录
        await self._create_stack_frame_record(branch_frame)
        
        # 缓存到内存
        self.active_frames[branch_agent_id] = branch_frame
        
        # 更新层级关系
        if parent_agent_id not in self.agent_hierarchy:
            self.agent_hierarchy[parent_agent_id] = []
        self.agent_hierarchy[parent_agent_id].append(branch_agent_id)
        
        return branch_agent_id
    
    async def switch_agent(self, from_agent_id: str, to_agent_id: str, reason: str = "") -> bool:
        """
        切换Agent
        
        Args:
            from_agent_id: 源Agent ID
            to_agent_id: 目标Agent ID
            reason: 切换原因
            
        Returns:
            切换是否成功
        """
        # 验证目标Agent存在
        target_frame = await self._get_or_load_frame(to_agent_id)
        if not target_frame:
            raise ValueError(f"目标Agent {to_agent_id} 不存在")
        
        # 如果源Agent存在，挂起它
        if from_agent_id and from_agent_id in self.active_frames:
            source_frame = self.active_frames[from_agent_id]
            source_frame.suspend()
            await self._update_stack_frame_record(source_frame)
        
        # 激活目标Agent
        target_frame.resume()
        await self._update_stack_frame_record(target_frame)
        
        # 记录切换历史
        switch_context = AgentSwitchContext(
            from_agent_id=from_agent_id or "",
            to_agent_id=to_agent_id,
            switch_time=datetime.now(),
            reason=reason
        )
        self.switch_history.append(switch_context)
        
        # 限制历史记录长度
        if len(self.switch_history) > 100:
            self.switch_history = self.switch_history[-50:]
        
        return True
    
    async def get_agent_context(self, agent_id: str) -> Dict[str, Any]:
        """
        获取Agent的完整上下文
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Agent上下文数据
        """
        frame = await self._get_or_load_frame(agent_id)
        if not frame:
            raise ValueError(f"Agent {agent_id} 不存在")
        
        return frame.get_full_context()
    
    async def add_message_to_agent(self, agent_id: str, role: str, content: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        向Agent添加消息
        
        Args:
            agent_id: Agent ID
            role: 消息角色
            content: 消息内容
            metadata: 消息元数据
            
        Returns:
            添加的消息对象
        """
        frame = await self._get_or_load_frame(agent_id)
        if not frame:
            raise ValueError(f"Agent {agent_id} 不存在")
        
        # 添加消息到栈帧
        message = frame.add_message(role, content, metadata)
        
        # 更新栈帧记录
        await self._update_stack_frame_record(frame)
        
        # 同时保存到消息表
        message_query = """
            INSERT INTO messages (id, agent_id, role, content, metadata, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        
        await db_manager.execute_insert(
            message_query,
            (message['id'], agent_id, role, content, json.dumps(metadata or {}), message['timestamp'])
        )
        
        return message
    
    async def get_session_hierarchy(self, session_id: str) -> List[AgentHierarchyNode]:
        """
        获取会话的Agent层级结构
        
        Args:
            session_id: 会话ID
            
        Returns:
            Agent层级节点列表
        """
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
    
    async def delete_agent_branch(self, agent_id: str, recursive: bool = True) -> int:
        """
        删除Agent分支
        
        Args:
            agent_id: Agent ID
            recursive: 是否递归删除子Agent
            
        Returns:
            删除的Agent数量
        """
        deleted_count = 0
        
        if recursive:
            # 递归删除子Agent
            children_query = "SELECT id FROM agents WHERE parent_id = ?"
            children_rows = await db_manager.execute_query(children_query, (agent_id,))
            
            for child_row in children_rows:
                child_count = await self.delete_agent_branch(child_row[0], True)
                deleted_count += child_count
        
        # 删除Agent的消息
        await db_manager.execute_update("DELETE FROM messages WHERE agent_id = ?", (agent_id,))
        
        # 删除Agent的栈帧
        await db_manager.execute_update("DELETE FROM agent_stack_frames WHERE agent_id = ?", (agent_id,))
        
        # 删除Agent
        await db_manager.execute_update("DELETE FROM agents WHERE id = ?", (agent_id,))
        
        # 从内存缓存中移除
        if agent_id in self.active_frames:
            del self.active_frames[agent_id]
        
        # 更新层级关系
        for parent_id, children in self.agent_hierarchy.items():
            if agent_id in children:
                children.remove(agent_id)
        
        if agent_id in self.agent_hierarchy:
            del self.agent_hierarchy[agent_id]
        
        deleted_count += 1
        return deleted_count
    
    async def get_switch_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        获取Agent切换历史
        
        Args:
            limit: 返回记录数量限制
            
        Returns:
            切换历史记录列表
        """
        history = self.switch_history[-limit:] if limit > 0 else self.switch_history
        
        return [
            {
                'from_agent_id': ctx.from_agent_id,
                'to_agent_id': ctx.to_agent_id,
                'switch_time': ctx.switch_time.isoformat(),
                'reason': ctx.reason
            }
            for ctx in history
        ]
    
    async def get_active_agents(self) -> List[str]:
        """
        获取当前活跃的Agent列表
        
        Returns:
            活跃Agent ID列表
        """
        return [
            agent_id for agent_id, frame in self.active_frames.items()
            if frame.status == 'active'
        ]
    
    async def _get_or_load_frame(self, agent_id: str) -> Optional[AgentStackFrame]:
        """
        获取或加载Agent栈帧
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Agent栈帧对象
        """
        # 先从内存缓存获取
        if agent_id in self.active_frames:
            return self.active_frames[agent_id]
        
        # 从数据库加载
        frame_query = """
            SELECT sf.*, a.parent_id
            FROM agent_stack_frames sf
            JOIN agents a ON sf.agent_id = a.id
            WHERE sf.agent_id = ?
            ORDER BY sf.created_at DESC
            LIMIT 1
        """
        
        frame_row = await db_manager.execute_one(frame_query, (agent_id,))
        if not frame_row:
            return None
        
        # 重建栈帧对象
        parent_frame = None
        parent_agent_id = frame_row[8]  # a.parent_id
        
        if parent_agent_id:
            parent_frame = await self._get_or_load_frame(parent_agent_id)
        
        frame_data = {
            'frame_id': frame_row[0],
            'agent_id': frame_row[1],
            'context_data': json.loads(frame_row[2]) if frame_row[2] else {},
            'inherited_context': json.loads(frame_row[3]) if frame_row[3] else {},
            'stack_depth': frame_row[4],
            'status': frame_row[5],
            'created_at': frame_row[6],
            'updated_at': frame_row[7]
        }
        
        frame = AgentStackFrame.from_dict(frame_data, parent_frame)
        
        # 缓存到内存
        self.active_frames[agent_id] = frame
        
        return frame
    
    async def _create_stack_frame_record(self, frame: AgentStackFrame):
        """
        创建栈帧数据库记录
        
        Args:
            frame: 栈帧对象
        """
        query = """
            INSERT INTO agent_stack_frames (id, agent_id, context_data, inherited_context, stack_depth, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        await db_manager.execute_insert(
            query,
            (
                frame.frame_id,
                frame.agent_id,
                json.dumps(frame.context_data),
                json.dumps(frame.inherited_context),
                frame.stack_depth,
                frame.status,
                frame.created_at.isoformat(),
                frame.updated_at.isoformat()
            )
        )
    
    async def _update_stack_frame_record(self, frame: AgentStackFrame):
        """
        更新栈帧数据库记录
        
        Args:
            frame: 栈帧对象
        """
        query = """
            UPDATE agent_stack_frames 
            SET context_data = ?, inherited_context = ?, status = ?, updated_at = ?
            WHERE agent_id = ?
        """
        
        await db_manager.execute_update(
            query,
            (
                json.dumps(frame.context_data),
                json.dumps(frame.inherited_context),
                frame.status,
                frame.updated_at.isoformat(),
                frame.agent_id
            )
        )
    
    async def _suspend_oldest_branch_agent(self):
        """
        挂起最老的分支Agent
        """
        branch_agents = [
            (agent_id, frame) for agent_id, frame in self.active_frames.items()
            if frame.stack_depth > 0 and frame.status == 'active'
        ]
        
        if branch_agents:
            # 按创建时间排序，挂起最老的
            branch_agents.sort(key=lambda x: x[1].created_at)
            oldest_agent_id, oldest_frame = branch_agents[0]
            
            oldest_frame.suspend()
            await self._update_stack_frame_record(oldest_frame)
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """
        获取内存使用统计
        
        Returns:
            内存统计信息
        """
        active_count = len([f for f in self.active_frames.values() if f.status == 'active'])
        suspended_count = len([f for f in self.active_frames.values() if f.status == 'suspended'])
        
        return {
            'total_frames': len(self.active_frames),
            'active_frames': active_count,
            'suspended_frames': suspended_count,
            'switch_history_count': len(self.switch_history),
            'hierarchy_nodes': len(self.agent_hierarchy)
        }


# 全局实例
multi_agent_manager = MultiAgentManager()