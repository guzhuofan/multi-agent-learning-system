from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from .message import MessageResponse


class ChatRequest(BaseModel):
    """聊天请求模型"""
    agent_id: str = Field(..., description="Agent ID")
    content: str = Field(..., min_length=1, max_length=4000, description="用户消息内容")
    context_mode: Optional[str] = Field(
        default="auto", 
        pattern="^(auto|full|selective|none)$", 
        description="上下文模式"
    )
    

class ChatResponse(BaseModel):
    """聊天响应模型"""
    user_message: MessageResponse
    assistant_message: MessageResponse
    agent_id: str
    processing_time: float
    token_usage: Optional[Dict[str, int]] = None
    

class ConversationResponse(BaseModel):
    """对话响应模型"""
    agent_id: str
    messages: List[MessageResponse]
    total_messages: int
    started_at: Optional[str] = None
    last_activity: Optional[str] = None
    

class ChatStreamRequest(BaseModel):
    """流式聊天请求模型"""
    agent_id: str = Field(..., description="Agent ID")
    content: str = Field(..., min_length=1, max_length=4000, description="用户消息内容")
    stream: bool = Field(default=True, description="是否启用流式响应")
    

class ChatStreamChunk(BaseModel):
    """流式聊天响应块模型"""
    id: str
    agent_id: str
    content: str
    finished: bool = False
    

class ContextInheritanceRequest(BaseModel):
    """上下文继承请求模型"""
    parent_agent_id: str = Field(..., description="父Agent ID")
    inheritance_mode: str = Field(
        default="selective",
        pattern="^(selective|summary|full|none)$",
        description="继承模式"
    )
    max_messages: Optional[int] = Field(default=5, ge=1, le=20, description="最大消息数")
    

class ContextInheritanceResponse(BaseModel):
    """上下文继承响应模型"""
    inherited_messages: List[MessageResponse]
    summary: Optional[str] = None
    inheritance_mode: str
    source_agent_id: str
    

class AgentPerformanceMetrics(BaseModel):
    """Agent性能指标模型"""
    agent_id: str
    total_messages: int
    avg_response_time: float
    total_tokens: int
    success_rate: float
    last_activity: str
    

class SystemStatus(BaseModel):
    """系统状态模型"""
    status: str
    active_agents: int
    total_sessions: int
    uptime: str
    memory_usage: Optional[Dict[str, Any]] = None
    api_health: Dict[str, bool]