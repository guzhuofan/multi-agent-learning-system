from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class MessageBase(BaseModel):
    """消息基础模型"""
    role: str = Field(..., pattern="^(user|assistant|system)$", description="消息角色")
    content: str = Field(..., min_length=1, description="消息内容")


class MessageCreate(MessageBase):
    """创建消息请求模型"""
    agent_id: str = Field(..., description="所属Agent ID")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="消息元数据")


class MessageResponse(MessageBase):
    """消息响应模型"""
    id: str
    agent_id: str
    metadata: Dict[str, Any]
    timestamp: str
    
    class Config:
        from_attributes = True


class Message(MessageResponse):
    """完整的消息模型"""
    pass


class MessageUpdate(BaseModel):
    """更新消息请求模型"""
    content: Optional[str] = Field(None, min_length=1)
    metadata: Optional[Dict[str, Any]] = None


class MessageWithContext(MessageResponse):
    """包含上下文的消息模型"""
    context_messages: List[MessageResponse] = []
    

class MessageStats(BaseModel):
    """消息统计信息"""
    total_messages: int
    user_messages: int
    assistant_messages: int
    system_messages: int
    avg_message_length: float