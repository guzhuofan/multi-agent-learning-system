from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
import json
from datetime import datetime

from app.core.database import get_db, db_manager
from app.models.agent import (
    AgentCreate, AgentResponse, AgentUpdate, BranchCreateRequest,
    AgentSwitchRequest, AgentHierarchyNode, AgentStackFrameCreate
)
from app.services.agent_manager import AgentManager
from app.core.multi_agent_manager import multi_agent_manager
from app.services.context_processor import context_processor

router = APIRouter()
agent_manager = AgentManager()


@router.post("/main", response_model=AgentResponse)
async def create_main_agent(agent_data: AgentCreate):
    """创建主线Agent"""
    if agent_data.agent_type != "main":
        raise HTTPException(status_code=400, detail="此端点仅用于创建主线Agent")
    
    # 检查会话是否存在
    session_check = await db_manager.execute_one(
        "SELECT id FROM sessions WHERE id = ?", 
        (agent_data.session_id,)
    )
    if not session_check:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    # 检查会话中是否已有主Agent
    existing_main = await db_manager.execute_one(
        "SELECT id FROM agents WHERE session_id = ? AND agent_type = 'main'",
        (agent_data.session_id,)
    )
    if existing_main:
        raise HTTPException(status_code=400, detail="会话中已存在主Agent")
    
    try:
        # 使用新的MultiAgentManager创建主Agent
        agent_id = await multi_agent_manager.create_main_agent(
            session_id=agent_data.session_id,
            topic=agent_data.topic,
            config=agent_data.context_data
        )
        
        # 获取创建的Agent信息
        agent_row = await db_manager.execute_one(
            "SELECT * FROM agents WHERE id = ?",
            (agent_id,)
        )
        
        return AgentResponse(
            id=agent_row[0],
            session_id=agent_row[1],
            parent_id=agent_row[2],
            agent_type=agent_row[3],
            topic=agent_row[4],
            context_data=json.loads(agent_row[5]) if agent_row[5] else {},
            stack_depth=agent_row[6],
            status=agent_row[7],
            created_at=agent_row[8]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建主Agent失败: {str(e)}")


@router.post("/branch", response_model=AgentResponse)
async def create_branch_agent(branch_data: BranchCreateRequest):
    """创建分支Agent"""
    
    # 验证父Agent存在
    parent_agent = await db_manager.execute_one(
        "SELECT * FROM agents WHERE id = ?",
        (branch_data.parent_agent_id,)
    )
    
    if not parent_agent:
        raise HTTPException(status_code=404, detail="父Agent不存在")
    
    try:
        # 使用新的MultiAgentManager创建分支Agent
        branch_agent_id = await multi_agent_manager.create_branch_agent(
            parent_agent_id=branch_data.parent_agent_id,
            topic=branch_data.topic,
            message_id=branch_data.message_id,
            inheritance_mode=branch_data.inheritance_mode
        )
        
        # 获取创建的分支Agent信息
        agent_row = await db_manager.execute_one(
            "SELECT * FROM agents WHERE id = ?",
            (branch_agent_id,)
        )
        
        return AgentResponse(
            id=agent_row[0],
            session_id=agent_row[1],
            parent_id=agent_row[2],
            agent_type=agent_row[3],
            topic=agent_row[4],
            context_data=json.loads(agent_row[5]) if agent_row[5] else {},
            stack_depth=agent_row[6],
            status=agent_row[7],
            created_at=agent_row[8]
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建分支Agent失败: {str(e)}")


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """获取Agent详情"""
    query = "SELECT * FROM agents WHERE id = ?"
    
    try:
        row = await db_manager.execute_one(query, (agent_id,))
        
        if not row:
            raise HTTPException(status_code=404, detail="Agent不存在")
        
        return AgentResponse(
            id=row[0],
            session_id=row[1],
            parent_id=row[2],
            agent_type=row[3],
            topic=row[4],
            context_data=json.loads(row[5]) if row[5] else {},
            stack_depth=row[6],
            status=row[7],
            created_at=row[8]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取Agent失败: {str(e)}")


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent_update: AgentUpdate):
    """更新Agent"""
    # 首先检查Agent是否存在
    existing_agent = await get_agent(agent_id)
    
    # 构建更新字段
    update_fields = []
    params = []
    
    if agent_update.topic is not None:
        update_fields.append("topic = ?")
        params.append(agent_update.topic)
    
    if agent_update.context_data is not None:
        update_fields.append("context_data = ?")
        params.append(json.dumps(agent_update.context_data))
    
    if agent_update.status is not None:
        update_fields.append("status = ?")
        params.append(agent_update.status)
    
    if not update_fields:
        return existing_agent
    
    params.append(agent_id)
    query = f"UPDATE agents SET {', '.join(update_fields)} WHERE id = ?"
    
    try:
        await db_manager.execute_update(query, tuple(params))
        return await get_agent(agent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新Agent失败: {str(e)}")


@router.post("/switch", response_model=dict)
async def switch_agent(switch_data: AgentSwitchRequest):
    """切换Agent（栈帧式切换）"""
    try:
        # 使用MultiAgentManager进行智能切换
        success = await multi_agent_manager.switch_agent(
            from_agent_id="",  # 当前活跃的Agent ID，这里简化处理
            to_agent_id=switch_data.agent_id,
            reason="用户主动切换"
        )
        
        if success:
            # 获取切换后的Agent上下文
            context = await multi_agent_manager.get_agent_context(switch_data.agent_id)
            
            return {
                "message": "Agent切换成功",
                "agent_id": switch_data.agent_id,
                "status": "active",
                "context": context
            }
        else:
            raise HTTPException(status_code=400, detail="Agent切换失败")
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"切换Agent失败: {str(e)}")


@router.post("/{agent_id}/activate")
async def activate_agent(agent_id: str):
    """激活Agent（兼容旧接口）"""
    # 检查Agent是否存在
    agent = await get_agent(agent_id)
    
    try:
        # 使用新的切换机制
        success = await multi_agent_manager.switch_agent(
            from_agent_id="",
            to_agent_id=agent_id,
            reason="激活Agent"
        )
        
        return {
            "message": "Agent激活成功",
            "agent_id": agent_id,
            "status": "active"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"激活Agent失败: {str(e)}")


@router.post("/{agent_id}/suspend")
async def suspend_agent(agent_id: str):
    """挂起Agent"""
    # 检查Agent是否存在
    agent = await get_agent(agent_id)
    
    try:
        # 更新Agent状态为挂起
        await db_manager.execute_update(
            "UPDATE agents SET status = 'suspended' WHERE id = ?",
            (agent_id,)
        )
        
        return {
            "message": "Agent挂起成功",
            "agent_id": agent_id,
            "status": "suspended"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"挂起Agent失败: {str(e)}")


@router.get("/{agent_id}/children")
async def get_agent_children(agent_id: str):
    """获取Agent的子Agent列表"""
    # 检查Agent是否存在
    await get_agent(agent_id)
    
    query = "SELECT * FROM agents WHERE parent_id = ? ORDER BY created_at"
    
    try:
        rows = await db_manager.execute_query(query, (agent_id,))
        children = []
        
        for row in rows:
            children.append(AgentResponse(
                id=row[0],
                session_id=row[1],
                parent_id=row[2],
                agent_type=row[3],
                topic=row[4],
                context_data=json.loads(row[5]) if row[5] else {},
                stack_depth=row[6],
                status=row[7],
                created_at=row[8]
            ))
        
        return {"children": children}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取子Agent失败: {str(e)}")


@router.get("/{agent_id}/hierarchy")
async def get_agent_hierarchy(agent_id: str):
    """获取以指定Agent为根的层级结构"""
    # 检查Agent是否存在
    await get_agent(agent_id)
    
    try:
        hierarchy = await agent_manager.build_agent_hierarchy(agent_id)
        return {"hierarchy": hierarchy}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取Agent层级结构失败: {str(e)}")


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, force: bool = False):
    """删除Agent及其所有子Agent和相关消息"""
    # 检查Agent是否存在
    agent = await get_agent(agent_id)
    
    # 如果是主Agent且没有强制删除标志，则拒绝删除
    if agent.agent_type == "main" and not force:
        raise HTTPException(status_code=400, detail="删除主Agent需要设置force=true参数")
    
    try:
        # 获取所有需要删除的Agent ID（包括子Agent）
        agent_ids_to_delete = await get_agent_subtree_ids(agent_id)
        
        # 删除所有相关消息
        for aid in agent_ids_to_delete:
            await db_manager.execute_update(
                "DELETE FROM messages WHERE agent_id = ?",
                (aid,)
            )
        
        # 递归删除所有子Agent
        await agent_manager.delete_agent_recursive(agent_id)
        
        return {
            "message": "Agent及相关数据删除成功",
            "deleted_agents": len(agent_ids_to_delete),
            "agent_ids": agent_ids_to_delete
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除Agent失败: {str(e)}")


async def get_agent_subtree_ids(agent_id: str) -> List[str]:
    """获取Agent及其所有子Agent的ID列表"""
    agent_ids = [agent_id]
    
    # 递归获取所有子Agent
    children_query = "SELECT id FROM agents WHERE parent_id = ?"
    children = await db_manager.execute_query(children_query, (agent_id,))
    
    for child in children:
        child_id = child[0]
        child_subtree = await get_agent_subtree_ids(child_id)
        agent_ids.extend(child_subtree)
    
    return agent_ids


@router.get("/{agent_id}/context")
async def get_agent_context(agent_id: str):
    """获取Agent的上下文信息"""
    # 检查Agent是否存在
    await get_agent(agent_id)
    
    try:
        # 获取栈帧信息
        frame_query = "SELECT * FROM agent_stack_frames WHERE agent_id = ? ORDER BY created_at DESC LIMIT 1"
        frame_row = await db_manager.execute_one(frame_query, (agent_id,))
        
        if not frame_row:
            return {"context_data": {}, "inherited_context": {}}
        
        return {
            "context_data": json.loads(frame_row[2]) if frame_row[2] else {},
            "inherited_context": json.loads(frame_row[3]) if frame_row[3] else {},
            "stack_depth": frame_row[4],
            "status": frame_row[5]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取Agent上下文失败: {str(e)}")


@router.get("/active")
async def get_active_agents():
    """获取当前活跃的Agent列表"""
    try:
        active_agent_ids = await multi_agent_manager.get_active_agents()
        
        agents = []
        for agent_id in active_agent_ids:
            agent_row = await db_manager.execute_one(
                "SELECT * FROM agents WHERE id = ?",
                (agent_id,)
            )
            if agent_row:
                agents.append(AgentResponse(
                    id=agent_row[0],
                    session_id=agent_row[1],
                    parent_id=agent_row[2],
                    agent_type=agent_row[3],
                    topic=agent_row[4],
                    context_data=json.loads(agent_row[5]) if agent_row[5] else {},
                    stack_depth=agent_row[6],
                    status=agent_row[7],
                    created_at=agent_row[8]
                ))
        
        return {"active_agents": agents}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取活跃Agent列表失败: {str(e)}")


@router.get("/switch-history")
async def get_switch_history(limit: int = 20):
    """获取Agent切换历史"""
    try:
        history = await multi_agent_manager.get_switch_history(limit)
        return {"switch_history": history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取切换历史失败: {str(e)}")


@router.get("/memory-stats")
async def get_memory_stats():
    """获取内存使用统计"""
    try:
        stats = multi_agent_manager.get_memory_stats()
        return {"memory_stats": stats}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取内存统计失败: {str(e)}")


@router.get("/session/{session_id}/hierarchy")
async def get_session_hierarchy(session_id: str):
    """获取会话的完整Agent层级结构"""
    try:
        hierarchy = await multi_agent_manager.get_session_hierarchy(session_id)
        return {"hierarchy": hierarchy}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话层级结构失败: {str(e)}")


@router.get("/")
async def list_agents(session_id: Optional[str] = None, agent_type: Optional[str] = None, status: Optional[str] = None):
    """获取Agent列表"""
    conditions = []
    params = []
    
    if session_id:
        conditions.append("session_id = ?")
        params.append(session_id)
    
    if agent_type:
        conditions.append("agent_type = ?")
        params.append(agent_type)
    
    if status:
        conditions.append("status = ?")
        params.append(status)
    
    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
    query = f"SELECT * FROM agents{where_clause} ORDER BY created_at DESC"
    
    try:
        rows = await db_manager.execute_query(query, tuple(params))
        agents = []
        
        for row in rows:
            agents.append(AgentResponse(
                id=row[0],
                session_id=row[1],
                parent_id=row[2],
                agent_type=row[3],
                topic=row[4],
                context_data=json.loads(row[5]) if row[5] else {},
                stack_depth=row[6],
                status=row[7],
                created_at=row[8]
            ))
        
        return {"agents": agents}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取Agent列表失败: {str(e)}")