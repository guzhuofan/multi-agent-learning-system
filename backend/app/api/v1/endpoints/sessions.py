from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

from app.core.database import get_db, db_manager

router = APIRouter()


# Pydantic模型
class SessionCreate(BaseModel):
    title: str
    description: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    created_at: str
    updated_at: str


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


@router.post("/", response_model=SessionResponse)
async def create_session(session_data: SessionCreate):
    """创建新的学习会话"""
    session_id = str(uuid.uuid4())
    current_time = datetime.now().isoformat()
    
    query = """
        INSERT INTO sessions (id, title, description, status, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?)
    """
    
    try:
        await db_manager.execute_insert(
            query, 
            (session_id, session_data.title, session_data.description, current_time, current_time)
        )
        
        return SessionResponse(
            id=session_id,
            title=session_data.title,
            description=session_data.description,
            status="active",
            created_at=current_time,
            updated_at=current_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建会话失败: {str(e)}")


@router.get("/", response_model=List[SessionResponse])
async def get_sessions():
    """获取所有学习会话"""
    query = "SELECT * FROM sessions ORDER BY created_at DESC"
    
    try:
        rows = await db_manager.execute_query(query)
        sessions = []
        
        for row in rows:
            sessions.append(SessionResponse(
                id=row[0],
                title=row[1],
                description=row[2],
                status=row[3],
                created_at=row[4],
                updated_at=row[5]
            ))
        
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """获取特定学习会话"""
    query = "SELECT * FROM sessions WHERE id = ?"
    
    try:
        row = await db_manager.execute_one(query, (session_id,))
        
        if not row:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        return SessionResponse(
            id=row[0],
            title=row[1],
            description=row[2],
            status=row[3],
            created_at=row[4],
            updated_at=row[5]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话失败: {str(e)}")


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, session_update: SessionUpdate):
    """更新学习会话"""
    # 首先检查会话是否存在
    existing_session = await get_session(session_id)
    
    # 构建更新字段
    update_fields = []
    params = []
    
    if session_update.title is not None:
        update_fields.append("title = ?")
        params.append(session_update.title)
    
    if session_update.description is not None:
        update_fields.append("description = ?")
        params.append(session_update.description)
    
    if session_update.status is not None:
        update_fields.append("status = ?")
        params.append(session_update.status)
    
    if not update_fields:
        return existing_session
    
    # 添加更新时间
    update_fields.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(session_id)
    
    query = f"UPDATE sessions SET {', '.join(update_fields)} WHERE id = ?"
    
    try:
        await db_manager.execute_update(query, tuple(params))
        
        # 返回更新后的会话
        return await get_session(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新会话失败: {str(e)}")


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """删除学习会话"""
    # 首先检查会话是否存在
    await get_session(session_id)
    
    try:
        # 删除相关的消息
        await db_manager.execute_update(
            "DELETE FROM messages WHERE agent_id IN (SELECT id FROM agents WHERE session_id = ?)",
            (session_id,)
        )
        
        # 删除相关的栈帧
        await db_manager.execute_update(
            "DELETE FROM agent_stack_frames WHERE agent_id IN (SELECT id FROM agents WHERE session_id = ?)",
            (session_id,)
        )
        
        # 删除相关的Agent
        await db_manager.execute_update(
            "DELETE FROM agents WHERE session_id = ?",
            (session_id,)
        )
        
        # 删除会话
        await db_manager.execute_update(
            "DELETE FROM sessions WHERE id = ?",
            (session_id,)
        )
        
        return {"message": "会话删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除会话失败: {str(e)}")


@router.get("/{session_id}/agents")
async def get_session_agents(session_id: str):
    """获取会话中的所有Agent"""
    # 首先检查会话是否存在
    await get_session(session_id)
    
    query = "SELECT * FROM agents WHERE session_id = ? ORDER BY created_at"
    
    try:
        rows = await db_manager.execute_query(query, (session_id,))
        agents = []
        
        for row in rows:
            agents.append({
                "id": row[0],
                "session_id": row[1],
                "parent_id": row[2],
                "agent_type": row[3],
                "topic": row[4],
                "context_data": row[5],
                "stack_depth": row[6],
                "status": row[7],
                "created_at": row[8]
            })
        
        return {"agents": agents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话Agent失败: {str(e)}")


@router.get("/{session_id}/hierarchy")
async def get_session_hierarchy(session_id: str):
    """获取会话的Agent层级结构"""
    # 首先检查会话是否存在
    await get_session(session_id)
    
    query = "SELECT * FROM agents WHERE session_id = ? ORDER BY stack_depth, created_at"
    
    try:
        rows = await db_manager.execute_query(query, (session_id,))
        
        # 构建层级结构
        agents_dict = {}
        root_agents = []
        
        for row in rows:
            agent = {
                "id": row[0],
                "parent_id": row[2],
                "agent_type": row[3],
                "topic": row[4],
                "level": row[6],
                "children": []
            }
            agents_dict[agent["id"]] = agent
            
            if not agent["parent_id"]:
                root_agents.append(agent)
        
        # 建立父子关系
        for agent in agents_dict.values():
            if agent["parent_id"] and agent["parent_id"] in agents_dict:
                agents_dict[agent["parent_id"]]["children"].append(agent)
        
        return {"hierarchy": root_agents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话层级结构失败: {str(e)}")