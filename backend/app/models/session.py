from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SessionBase(BaseModel):
    """会话基础模型"""
    title: str = Field(..., min_length=1, max_length=255, description="会话标题")
    description: Optional[str] = Field(None, max_length=1000, description="会话描述")


class SessionCreate(SessionBase):
    """创建会话请求模型"""
    pass


class SessionUpdate(BaseModel):
    """更新会话请求模型"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field(None, pattern="^(active|completed|archived)$")


class SessionResponse(SessionBase):
    """会话响应模型"""
    id: str
    status: str
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


class Session(SessionResponse):
    """完整的会话模型（包含关联数据）"""
    agents_count: Optional[int] = 0
    messages_count: Optional[int] = 0
    last_activity: Optional[str] = None


class SessionWithAgents(SessionResponse):
    """包含Agent信息的会话模型"""
    agents: List[dict] = []
    

class SessionStats(BaseModel):
    """会话统计信息"""
    total_sessions: int
    active_sessions: int
    completed_sessions: int
    archived_sessions: int
    total_agents: int
    total_messages: int