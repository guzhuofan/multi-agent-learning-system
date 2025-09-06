from openai import OpenAI
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings, DEEPSEEK_CONFIG


class DeepseekService:
    """
    Deepseek API服务
    
    基于Deepseek官方Python样例优化:
    - 使用OpenAI SDK与Deepseek API兼容
    - 正确配置base_url为https://api.deepseek.com
    - 明确设置stream=False参数
    - 优化错误处理和响应解析
    """
    
    def __init__(self):
        self.api_key = DEEPSEEK_CONFIG["api_key"]
        self.base_url = DEEPSEEK_CONFIG["base_url"]
        self.model = DEEPSEEK_CONFIG["model"]
        self.max_tokens = DEEPSEEK_CONFIG["max_tokens"]
        self.temperature = DEEPSEEK_CONFIG["temperature"]
        
        if self.api_key:
            # 使用OpenAI客户端，配置为Deepseek的API（按照官方样例）
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url  # Deepseek官方base_url已包含完整路径
            )
        else:
            self.client = None
            print("⚠️  警告: Deepseek API Key未配置，AI功能将不可用")
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: str = None,
        agent_context: Dict[str, Any] = None,
        model: str = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> Dict[str, Any]:
        """生成AI回复"""
        
        if not self.api_key:
            raise Exception("Deepseek API Key未配置")
        
        # 使用传入的参数或默认值
        model = model or self.model
        temperature = temperature if temperature is not None else self.temperature
        max_tokens = max_tokens or self.max_tokens
        
        # 构建消息列表
        api_messages = []
        
        # 添加系统提示词
        if system_prompt:
            api_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # 添加对话历史
        for msg in messages:
            if msg["role"] in ["user", "assistant", "system"]:
                api_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        try:
            # 调用Deepseek API（使用OpenAI兼容格式）
            response = await self._call_deepseek_api(
                messages=api_messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return {
                "content": response["choices"][0]["message"]["content"],
                "model": model,
                "usage": response.get("usage", {}),
                "finish_reason": response["choices"][0].get("finish_reason"),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            # 改进的错误处理，提供更详细的错误信息
            error_type = type(e).__name__
            error_message = str(e)
            
            # 根据错误类型提供更友好的提示
            if "timeout" in error_message.lower():
                user_message = "抱歉，AI服务响应超时，请稍后重试。"
            elif "api_key" in error_message.lower() or "unauthorized" in error_message.lower():
                user_message = "抱歉，API密钥配置有误，请检查配置。"
            elif "rate_limit" in error_message.lower():
                user_message = "抱歉，请求过于频繁，请稍后重试。"
            else:
                user_message = f"抱歉，AI服务暂时不可用。错误信息: {error_message}"
            
            return {
                "content": user_message,
                "model": model,
                "usage": {},
                "finish_reason": "error",
                "timestamp": datetime.now().isoformat(),
                "error": error_message,
                "error_type": error_type
            }
    
    async def _call_deepseek_api(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """异步调用Deepseek API（按照官方样例优化）"""
        
        if not self.client:
            raise Exception("Deepseek客户端未初始化")
        
        # 使用asyncio在线程池中运行同步的API调用
        loop = asyncio.get_event_loop()
        
        def sync_deepseek_call():
            # 按照Deepseek官方样例进行API调用
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,  # 明确设置为非流式，与官方样例一致
                timeout=60
            )
            
            # 直接返回响应对象，简化转换逻辑
            return {
                "choices": [{
                    "message": {
                        "content": response.choices[0].message.content,
                        "role": response.choices[0].message.role
                    },
                    "finish_reason": response.choices[0].finish_reason
                }],
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0
                } if response.usage else {},
                "model": response.model if hasattr(response, 'model') else model
            }
        
        response = await loop.run_in_executor(None, sync_deepseek_call)
        return response
    
    async def generate_context_summary(
        self, 
        messages: List[Dict[str, str]], 
        max_length: int = 500
    ) -> str:
        """生成对话上下文摘要"""
        
        if not messages:
            return "无对话内容"
        
        if not self.api_key:
            # 如果没有API Key，使用简单的摘要方法
            return self._simple_summary(messages, max_length)
        
        # 构建摘要提示词
        conversation_text = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in messages[-10:]  # 只取最近10条消息
        ])
        
        summary_prompt = f"""
        请为以下对话生成一个简洁的摘要，突出关键讨论点和重要信息。
        摘要长度不超过{max_length}字符。
        
        对话内容：
        {conversation_text}
        
        摘要：
        """
        
        try:
            response = await self.generate_response(
                messages=[{"role": "user", "content": summary_prompt}],
                system_prompt="你是一个专业的对话摘要助手，能够提取对话中的关键信息并生成简洁准确的摘要。",
                temperature=0.3,  # 较低的温度以获得更一致的摘要
                max_tokens=200
            )
            
            summary = response["content"].strip()
            
            # 确保摘要长度不超过限制
            if len(summary) > max_length:
                summary = summary[:max_length-3] + "..."
            
            return summary
            
        except Exception as e:
            print(f"生成摘要失败: {e}")
            return self._simple_summary(messages, max_length)
    
    def _simple_summary(self, messages: List[Dict[str, str]], max_length: int) -> str:
        """简单的摘要方法（不使用AI）"""
        if not messages:
            return "无对话内容"
        
        # 提取用户问题和助手回答
        user_messages = [msg["content"] for msg in messages if msg["role"] == "user"]
        assistant_messages = [msg["content"] for msg in messages if msg["role"] == "assistant"]
        
        summary_parts = []
        
        if user_messages:
            recent_question = user_messages[-1][:100] if user_messages[-1] else ""
            summary_parts.append(f"最新问题: {recent_question}")
        
        if assistant_messages:
            recent_answer = assistant_messages[-1][:100] if assistant_messages[-1] else ""
            summary_parts.append(f"最新回答: {recent_answer}")
        
        summary_parts.append(f"对话轮次: {len(messages)}")
        
        summary = " | ".join(summary_parts)
        
        # 确保长度不超过限制
        if len(summary) > max_length:
            summary = summary[:max_length-3] + "..."
        
        return summary
    
    async def generate_branch_prompt(
        self, 
        branch_topic: str, 
        parent_context: str,
        inheritance_mode: str = "selective"
    ) -> str:
        """为分支Agent生成专门的系统提示词"""
        
        base_prompt = f"""
        你是一个专门探讨"{branch_topic}"的学习助手。
        
        你的任务是：
        1. 专注于深入探讨"{branch_topic}"这个特定话题
        2. 提供详细、准确的解释和分析
        3. 结合上下文信息，给出针对性的回答
        4. 保持专业性和准确性
        
        上下文信息：
        {parent_context}
        
        请基于以上上下文，专注于"{branch_topic}"话题进行深入讨论。
        """
        
        return base_prompt.strip()
    
    async def check_api_health(self) -> Dict[str, Any]:
        """检查Deepseek API健康状态"""
        if not self.api_key:
            return {
                "status": "unavailable",
                "message": "API Key未配置",
                "timestamp": datetime.now().isoformat()
            }
        
        try:
            # 发送一个简单的测试请求
            test_response = await self.generate_response(
                messages=[{"role": "user", "content": "Hello"}],
                system_prompt="You are a helpful assistant. Please respond with 'OK'.",
                max_tokens=10
            )
            
            if "error" in test_response:
                return {
                    "status": "error",
                    "message": test_response["error"],
                    "timestamp": datetime.now().isoformat()
                }
            
            return {
                "status": "healthy",
                "message": "API连接正常",
                "model": self.model,
                "base_url": self.base_url,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"API连接失败: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }


# 创建全局Deepseek服务实例
deepseek_service = DeepseekService()