from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
import uuid
import json
from datetime import datetime

from app.core.database import get_db, db_manager
from app.models.chat import ChatRequest, ChatResponse, ConversationResponse, ChatStreamRequest, ChatStreamChunk
from app.models.message import MessageCreate, MessageResponse
from app.services.deepseek_service import deepseek_service
from app.services.agent_manager import AgentManager
from app.core.multi_agent_manager import multi_agent_manager
from app.services.context_processor import context_processor

router = APIRouter()
ai_service = deepseek_service
agent_manager = AgentManager()


@router.post("/send", response_model=ChatResponse)
async def send_message(chat_request: ChatRequest):
    """发送消息并获取AI回复"""
    
    # 检查Agent是否存在
    agent_query = "SELECT * FROM agents WHERE id = ?"
    agent_row = await db_manager.execute_one(agent_query, (chat_request.agent_id,))
    
    if not agent_row:
        raise HTTPException(status_code=404, detail="Agent不存在")
    
    if agent_row[7] != "active":  # status字段
        raise HTTPException(status_code=400, detail="Agent未激活")
    
    start_time = datetime.now()
    
    try:
        # 1. 使用栈帧式Agent管理器添加用户消息
        user_message = await multi_agent_manager.add_message_to_agent(
            agent_id=chat_request.agent_id,
            role="user",
            content=chat_request.content,
            metadata={"context_mode": chat_request.context_mode}
        )
        
        # 2. 获取Agent的完整上下文（包括继承的上下文）
        agent_context = await multi_agent_manager.get_agent_context(chat_request.agent_id)
        
        # 3. 构建对话上下文
        context_messages = []
        
        # 添加继承的上下文
        inherited_context = agent_context.get('inherited_context', {})
        if inherited_context.get('inherited_messages'):
            for msg in inherited_context['inherited_messages']:
                context_messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })
        elif inherited_context.get('context_summary'):
            # 如果是摘要继承，添加系统消息
            context_messages.append({
                "role": "system",
                "content": f"上下文摘要：{inherited_context['context_summary']}"
            })
        
        # 添加当前Agent的消息历史
        current_messages = agent_context.get('current_context', {}).get('messages', [])
        for msg in current_messages[-10:]:  # 最近10条消息
            context_messages.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })
        
        # 4. 获取Agent配置和系统提示词
        agent_config = json.loads(agent_row[5]) if agent_row[5] else {}
        system_prompt = agent_config.get(
            "system_prompt", 
            f"你是一个专门探讨'{agent_row[4]}'的智能学习助手。请专注于深入探讨这个话题，帮助用户获得更深入的理解。"
        )
        
        # 5. 调用AI API
        ai_response = await ai_service.generate_response(
            messages=context_messages,
            system_prompt=system_prompt,
            agent_context=agent_config
        )
        
        # 6. 使用栈帧式Agent管理器添加AI回复
        assistant_message = await multi_agent_manager.add_message_to_agent(
            agent_id=chat_request.agent_id,
            role="assistant",
            content=ai_response["content"],
            metadata={
                "model": ai_response.get("model"),
                "tokens": ai_response.get("usage"),
                "branchable": True,
                "context_used": len(context_messages)
            }
        )
        
        # 7. 计算处理时间
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # 8. 构建响应
        user_message_response = MessageResponse(
            id=user_message["id"],
            agent_id=chat_request.agent_id,
            role="user",
            content=chat_request.content,
            metadata=user_message.get("metadata", {}),
            timestamp=user_message["timestamp"]
        )
        
        assistant_message_response = MessageResponse(
            id=assistant_message["id"],
            agent_id=chat_request.agent_id,
            role="assistant",
            content=ai_response["content"],
            metadata=assistant_message.get("metadata", {}),
            timestamp=assistant_message["timestamp"]
        )
        
        return ChatResponse(
            user_message=user_message_response,
            assistant_message=assistant_message_response,
            agent_id=chat_request.agent_id,
            processing_time=processing_time,
            token_usage=ai_response.get("usage")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发送消息失败: {str(e)}")


@router.get("/conversation/{agent_id}", response_model=ConversationResponse)
async def get_conversation(agent_id: str, limit: Optional[int] = 50):
    """获取Agent的对话历史"""
    
    # 检查Agent是否存在
    agent_query = "SELECT * FROM agents WHERE id = ?"
    agent_row = await db_manager.execute_one(agent_query, (agent_id,))
    
    if not agent_row:
        raise HTTPException(status_code=404, detail="Agent不存在")
    
    try:
        # 获取消息列表
        messages_query = """
            SELECT * FROM messages 
            WHERE agent_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """
        
        rows = await db_manager.execute_query(messages_query, (agent_id, limit))
        messages = []
        
        for row in reversed(rows):  # 反转以获得正确的时间顺序
            messages.append(MessageResponse(
                id=row[0],
                agent_id=row[1],
                role=row[2],
                content=row[3],
                metadata=json.loads(row[4]) if row[4] else {},
                timestamp=row[5]
            ))
        
        # 获取对话统计信息
        stats_query = """
            SELECT 
                COUNT(*) as total_messages,
                MIN(timestamp) as started_at,
                MAX(timestamp) as last_activity
            FROM messages 
            WHERE agent_id = ?
        """
        
        stats_row = await db_manager.execute_one(stats_query, (agent_id,))
        
        return ConversationResponse(
            agent_id=agent_id,
            messages=messages,
            total_messages=stats_row[0] if stats_row else 0,
            started_at=stats_row[1] if stats_row else None,
            last_activity=stats_row[2] if stats_row else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取对话历史失败: {str(e)}")


@router.get("/message/{message_id}", response_model=MessageResponse)
async def get_message(message_id: str):
    """获取特定消息"""
    query = "SELECT * FROM messages WHERE id = ?"
    
    try:
        row = await db_manager.execute_one(query, (message_id,))
        
        if not row:
            raise HTTPException(status_code=404, detail="消息不存在")
        
        return MessageResponse(
            id=row[0],
            agent_id=row[1],
            role=row[2],
            content=row[3],
            metadata=json.loads(row[4]) if row[4] else {},
            timestamp=row[5]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取消息失败: {str(e)}")


@router.delete("/message/{message_id}")
async def delete_message(message_id: str):
    """删除消息"""
    # 检查消息是否存在
    await get_message(message_id)
    
    try:
        await db_manager.execute_update(
            "DELETE FROM messages WHERE id = ?",
            (message_id,)
        )
        
        return {"message": "消息删除成功"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除消息失败: {str(e)}")


@router.get("/messages")
async def list_messages(
    agent_id: Optional[str] = None,
    role: Optional[str] = None,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0
):
    """获取消息列表"""
    conditions = []
    params = []
    
    if agent_id:
        conditions.append("agent_id = ?")
        params.append(agent_id)
    
    if role:
        conditions.append("role = ?")
        params.append(role)
    
    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
    
    query = f"""
        SELECT * FROM messages{where_clause} 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
    """
    
    params.extend([limit, offset])
    
    try:
        rows = await db_manager.execute_query(query, tuple(params))
        messages = []
        
        for row in rows:
            messages.append(MessageResponse(
                id=row[0],
                agent_id=row[1],
                role=row[2],
                content=row[3],
                metadata=json.loads(row[4]) if row[4] else {},
                timestamp=row[5]
            ))
        
        return {"messages": messages}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取消息列表失败: {str(e)}")


@router.post("/clear/{agent_id}")
async def clear_conversation(agent_id: str):
    """清空Agent的对话历史"""
    # 检查Agent是否存在
    agent_query = "SELECT * FROM agents WHERE id = ?"
    agent_row = await db_manager.execute_one(agent_query, (agent_id,))
    
    if not agent_row:
        raise HTTPException(status_code=404, detail="Agent不存在")
    
    try:
        # 删除所有消息
        deleted_count = await db_manager.execute_update(
            "DELETE FROM messages WHERE agent_id = ?",
            (agent_id,)
        )
        
        return {
            "message": "对话历史清空成功",
            "deleted_messages": deleted_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空对话历史失败: {str(e)}")


async def get_conversation_context(agent_id: str, context_mode: str = "auto", max_messages: int = 10) -> List[dict]:
    """获取对话上下文"""
    
    if context_mode == "none":
        return []
    
    # 获取最近的消息
    query = """
        SELECT role, content FROM messages 
        WHERE agent_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    """
    
    rows = await db_manager.execute_query(query, (agent_id, max_messages))
    
    # 构建消息列表（反转以获得正确的时间顺序）
    messages = []
    for row in reversed(rows):
        messages.append({
            "role": row[0],
            "content": row[1]
        })
    
    # 根据上下文模式处理
    if context_mode == "selective":
        # 选择性上下文：保留最重要的消息
        return messages[-6:]  # 保留最近的6条消息
    elif context_mode == "full":
        # 完整上下文：返回所有消息
        return messages
    else:  # auto
        # 自动模式：根据消息数量智能选择
        if len(messages) <= 8:
            return messages
        else:
            # 保留开头2条和最后6条
            return messages[:2] + messages[-6:]


@router.get("/context/{agent_id}")
async def get_agent_conversation_context(agent_id: str, mode: str = "auto", max_messages: int = 10):
    """获取Agent的对话上下文"""
    try:
        context = await get_conversation_context(agent_id, mode, max_messages)
        return {
            "agent_id": agent_id,
            "context_mode": mode,
            "messages": context,
            "message_count": len(context)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取对话上下文失败: {str(e)}")


@router.get("/stats/{agent_id}")
async def get_conversation_stats(agent_id: str):
    """获取对话统计信息"""
    try:
        stats_query = """
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
                COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
                AVG(LENGTH(content)) as avg_message_length,
                MIN(timestamp) as first_message,
                MAX(timestamp) as last_message
            FROM messages 
            WHERE agent_id = ?
        """
        
        row = await db_manager.execute_one(stats_query, (agent_id,))
        
        if not row or row[0] == 0:
            return {
                "agent_id": agent_id,
                "total_messages": 0,
                "user_messages": 0,
                "assistant_messages": 0,
                "avg_message_length": 0,
                "first_message": None,
                "last_message": None
            }
        
        return {
            "agent_id": agent_id,
            "total_messages": row[0],
            "user_messages": row[1],
            "assistant_messages": row[2],
            "avg_message_length": round(row[3], 2) if row[3] else 0,
            "first_message": row[4],
            "last_message": row[5]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取对话统计失败: {str(e)}")