from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import json


class AgentBase(BaseModel):
    """Agent基础模型"""
    session_id: str = Field(..., description="所属会话ID")
    agent_type: str = Field(..., pattern="^(main|branch)$", description="Agent类型")
    topic: str = Field(..., min_length=1, max_length=255, description="Agent主题")


class AgentCreate(AgentBase):
    """创建Agent请求模型"""
    parent_id: Optional[str] = Field(None, description="父Agent ID（分支Agent必需）")
    context_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="上下文数据")
    
    @validator('parent_id')
    def validate_parent_id(cls, v, values):
        if values.get('agent_type') == 'branch' and not v:
            raise ValueError('分支Agent必须指定父Agent ID')
        if values.get('agent_type') == 'main' and v:
            raise ValueError('主Agent不能有父Agent')
        return v


class AgentUpdate(BaseModel):
    """更新Agent请求模型"""
    topic: Optional[str] = Field(None, min_length=1, max_length=255)
    context_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = Field(None, pattern="^(active|suspended|completed)$")


class AgentResponse(AgentBase):
    """Agent响应模型"""
    id: str
    parent_id: Optional[str]
    context_data: Dict[str, Any]
    stack_depth: int
    status: str
    created_at: str
    
    class Config:
        from_attributes = True


class Agent(AgentResponse):
    """完整的Agent模型"""
    messages_count: Optional[int] = 0
    children_count: Optional[int] = 0
    last_activity: Optional[str] = None


class AgentStackFrame(BaseModel):
    """Agent栈帧模型"""
    id: str
    agent_id: str
    context_data: Dict[str, Any]
    inherited_context: Dict[str, Any]
    stack_depth: int
    status: str
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


class AgentStackFrameCreate(BaseModel):
    """创建栈帧请求模型"""
    agent_id: str
    context_data: Dict[str, Any] = Field(default_factory=dict)
    inherited_context: Dict[str, Any] = Field(default_factory=dict)
    stack_depth: int = 0


class AgentHierarchyNode(BaseModel):
    """Agent层级节点模型"""
    id: str
    parent_id: Optional[str]
    agent_type: str
    topic: str
    level: int
    status: str
    children: List['AgentHierarchyNode'] = []
    
    class Config:
        from_attributes = True


# 解决前向引用问题
AgentHierarchyNode.model_rebuild()


class BranchCreateRequest(BaseModel):
    """创建分支Agent请求模型"""
    parent_agent_id: str = Field(..., description="父Agent ID")
    topic: str = Field(..., min_length=1, max_length=255, description="分支主题")
    message_id: str = Field(..., description="触发分支的消息ID")
    inheritance_mode: str = Field(
        default="selective", 
        pattern="^(selective|summary|full|none)$", 
        description="上下文继承模式"
    )


class AgentSwitchRequest(BaseModel):
    """切换Agent请求模型"""
    agent_id: str = Field(..., description="目标Agent ID")


class AgentContextSummary(BaseModel):
    """Agent上下文摘要模型"""
    agent_id: str
    summary: str
    key_points: List[str]
    message_count: int
    generated_at: str


class AgentStats(BaseModel):
    """Agent统计信息"""
    total_agents: int
    main_agents: int
    branch_agents: int
    active_agents: int
    max_depth: int
    avg_messages_per_agent: float