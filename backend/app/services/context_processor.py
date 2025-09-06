from typing import Dict, List, Optional, Any, Tuple
import re
import json
from datetime import datetime
from collections import Counter
import math


class ContextProcessor:
    """
    上下文处理器 - 实现高级的上下文继承和处理算法
    
    功能：
    - 智能消息相关性计算
    - 高级上下文摘要生成
    - 语义相似度分析
    - 关键信息提取
    """
    
    def __init__(self):
        # 停用词列表（简化版）
        self.stop_words = {
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '什么', '可以', '这个', '那个', '怎么', '为什么', '如何',
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
        }
        
        # 重要性权重词汇
        self.importance_keywords = {
            '问题': 2.0, '解决': 2.0, '方法': 1.8, '原理': 1.8, '实现': 1.5, '设计': 1.5,
            '算法': 2.0, '架构': 1.8, '系统': 1.5, '功能': 1.3, '特性': 1.3, '优化': 1.5,
            'problem': 2.0, 'solution': 2.0, 'method': 1.8, 'principle': 1.8, 'implement': 1.5, 'design': 1.5,
            'algorithm': 2.0, 'architecture': 1.8, 'system': 1.5, 'function': 1.3, 'feature': 1.3, 'optimize': 1.5
        }
    
    def calculate_advanced_relevance(self, message_content: str, topic: str, context_messages: List[Dict] = None) -> float:
        """
        计算高级消息相关性
        
        Args:
            message_content: 消息内容
            topic: 主题
            context_messages: 上下文消息列表（用于计算上下文相关性）
            
        Returns:
            相关性得分 (0-1)
        """
        if not message_content or not topic:
            return 0.0
        
        # 1. 基础词汇相似度
        lexical_score = self._calculate_lexical_similarity(message_content, topic)
        
        # 2. 语义相似度（基于词汇共现）
        semantic_score = self._calculate_semantic_similarity(message_content, topic)
        
        # 3. 重要性权重
        importance_score = self._calculate_importance_weight(message_content)
        
        # 4. 上下文连贯性（如果提供了上下文）
        context_score = 0.0
        if context_messages:
            context_score = self._calculate_context_coherence(message_content, context_messages)
        
        # 5. 长度和结构权重
        structure_score = self._calculate_structure_weight(message_content)
        
        # 综合评分
        weights = {
            'lexical': 0.25,
            'semantic': 0.25,
            'importance': 0.20,
            'context': 0.15,
            'structure': 0.15
        }
        
        final_score = (
            weights['lexical'] * lexical_score +
            weights['semantic'] * semantic_score +
            weights['importance'] * importance_score +
            weights['context'] * context_score +
            weights['structure'] * structure_score
        )
        
        return min(1.0, final_score)
    
    def _calculate_lexical_similarity(self, text1: str, text2: str) -> float:
        """
        计算词汇相似度
        
        Args:
            text1: 文本1
            text2: 文本2
            
        Returns:
            词汇相似度得分
        """
        words1 = self._extract_keywords(text1.lower())
        words2 = self._extract_keywords(text2.lower())
        
        if not words1 or not words2:
            return 0.0
        
        # 计算Jaccard相似度
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        jaccard_score = intersection / union if union > 0 else 0.0
        
        # 计算余弦相似度（基于词频）
        all_words = words1.union(words2)
        vector1 = [1 if word in words1 else 0 for word in all_words]
        vector2 = [1 if word in words2 else 0 for word in all_words]
        
        cosine_score = self._cosine_similarity(vector1, vector2)
        
        return (jaccard_score + cosine_score) / 2
    
    def _calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """
        计算语义相似度（简化版本）
        
        Args:
            text1: 文本1
            text2: 文本2
            
        Returns:
            语义相似度得分
        """
        # 提取关键短语
        phrases1 = self._extract_key_phrases(text1)
        phrases2 = self._extract_key_phrases(text2)
        
        if not phrases1 or not phrases2:
            return 0.0
        
        # 计算短语匹配度
        matches = 0
        total_comparisons = 0
        
        for phrase1 in phrases1:
            for phrase2 in phrases2:
                total_comparisons += 1
                if self._phrases_similar(phrase1, phrase2):
                    matches += 1
        
        phrase_similarity = matches / total_comparisons if total_comparisons > 0 else 0.0
        
        # 计算概念重叠度
        concepts1 = self._extract_concepts(text1)
        concepts2 = self._extract_concepts(text2)
        
        concept_overlap = len(concepts1.intersection(concepts2)) / len(concepts1.union(concepts2)) if concepts1.union(concepts2) else 0.0
        
        return (phrase_similarity + concept_overlap) / 2
    
    def _calculate_importance_weight(self, text: str) -> float:
        """
        计算文本重要性权重
        
        Args:
            text: 文本内容
            
        Returns:
            重要性权重得分
        """
        text_lower = text.lower()
        importance_score = 0.0
        word_count = 0
        
        # 检查重要性关键词
        for keyword, weight in self.importance_keywords.items():
            if keyword in text_lower:
                importance_score += weight
                word_count += 1
        
        # 检查问号（问题通常更重要）
        question_count = text.count('?') + text.count('？')
        importance_score += question_count * 0.5
        
        # 检查代码块（技术内容更重要）
        code_blocks = len(re.findall(r'```[\s\S]*?```|`[^`]+`', text))
        importance_score += code_blocks * 0.3
        
        # 标准化得分
        max_possible_score = 5.0  # 假设的最大可能得分
        normalized_score = min(1.0, importance_score / max_possible_score)
        
        return normalized_score
    
    def _calculate_context_coherence(self, message: str, context_messages: List[Dict]) -> float:
        """
        计算上下文连贯性
        
        Args:
            message: 当前消息
            context_messages: 上下文消息列表
            
        Returns:
            上下文连贯性得分
        """
        if not context_messages:
            return 0.0
        
        coherence_scores = []
        
        # 与最近几条消息的连贯性
        recent_messages = context_messages[-3:] if len(context_messages) > 3 else context_messages
        
        for ctx_msg in recent_messages:
            ctx_content = ctx_msg.get('content', '')
            if ctx_content:
                similarity = self._calculate_lexical_similarity(message, ctx_content)
                coherence_scores.append(similarity)
        
        return sum(coherence_scores) / len(coherence_scores) if coherence_scores else 0.0
    
    def _calculate_structure_weight(self, text: str) -> float:
        """
        计算文本结构权重
        
        Args:
            text: 文本内容
            
        Returns:
            结构权重得分
        """
        # 长度权重（适中长度的文本通常包含更多信息）
        length = len(text)
        if length < 20:
            length_score = 0.3
        elif length < 100:
            length_score = 0.7
        elif length < 500:
            length_score = 1.0
        elif length < 1000:
            length_score = 0.8
        else:
            length_score = 0.6
        
        # 结构复杂度（包含列表、代码等结构化内容）
        structure_elements = 0
        structure_elements += len(re.findall(r'^\s*[-*+]\s', text, re.MULTILINE))  # 列表项
        structure_elements += len(re.findall(r'^\s*\d+\.\s', text, re.MULTILINE))  # 编号列表
        structure_elements += len(re.findall(r'```[\s\S]*?```', text))  # 代码块
        structure_elements += len(re.findall(r'\*\*[^*]+\*\*|__[^_]+__', text))  # 粗体
        
        structure_score = min(1.0, structure_elements * 0.2)
        
        return (length_score + structure_score) / 2
    
    def generate_intelligent_summary(self, messages: List[Dict], topic: str, max_length: int = 300) -> str:
        """
        生成智能上下文摘要
        
        Args:
            messages: 消息列表
            topic: 主题
            max_length: 最大长度
            
        Returns:
            智能摘要
        """
        if not messages:
            return f"开始探讨新主题：{topic}"
        
        # 1. 提取关键消息
        key_messages = self._extract_key_messages(messages, topic)
        
        # 2. 提取关键概念和实体
        key_concepts = self._extract_key_concepts_from_messages(key_messages)
        
        # 3. 识别主要问题和答案
        qa_pairs = self._extract_qa_pairs(key_messages)
        
        # 4. 生成结构化摘要
        summary_parts = []
        
        # 主题信息
        summary_parts.append(f"探讨主题：{topic}")
        
        # 关键概念
        if key_concepts:
            concepts_str = '、'.join(list(key_concepts)[:5])
            summary_parts.append(f"核心概念：{concepts_str}")
        
        # 主要问答
        if qa_pairs:
            qa_summary = self._summarize_qa_pairs(qa_pairs)
            summary_parts.append(f"主要讨论：{qa_summary}")
        
        # 对话统计
        user_msg_count = len([m for m in messages if m.get('role') == 'user'])
        assistant_msg_count = len([m for m in messages if m.get('role') == 'assistant'])
        summary_parts.append(f"对话轮次：{user_msg_count}问{assistant_msg_count}答")
        
        # 组合摘要
        full_summary = ' | '.join(summary_parts)
        
        # 截断到指定长度
        if len(full_summary) > max_length:
            full_summary = full_summary[:max_length-3] + '...'
        
        return full_summary
    
    def select_optimal_messages(self, messages: List[Dict], topic: str, max_count: int = 5) -> List[Dict]:
        """
        选择最优的消息子集
        
        Args:
            messages: 消息列表
            topic: 主题
            max_count: 最大消息数量
            
        Returns:
            选择的消息列表
        """
        if not messages:
            return []
        
        if len(messages) <= max_count:
            return messages
        
        # 计算每条消息的综合得分
        scored_messages = []
        
        for i, msg in enumerate(messages):
            content = msg.get('content', '')
            
            # 相关性得分
            relevance_score = self.calculate_advanced_relevance(content, topic, messages[:i])
            
            # 位置权重（最近的消息更重要）
            position_weight = (i + 1) / len(messages)
            
            # 角色权重（用户问题通常更重要）
            role_weight = 1.2 if msg.get('role') == 'user' else 1.0
            
            # 综合得分
            total_score = relevance_score * 0.6 + position_weight * 0.3 + (role_weight - 1.0) * 0.1
            
            scored_messages.append((msg, total_score, i))
        
        # 按得分排序
        scored_messages.sort(key=lambda x: x[1], reverse=True)
        
        # 选择最优消息，保持时间顺序
        selected_with_indices = scored_messages[:max_count]
        selected_with_indices.sort(key=lambda x: x[2])  # 按原始索引排序
        
        return [msg for msg, score, idx in selected_with_indices]
    
    def _extract_keywords(self, text: str) -> set:
        """提取关键词"""
        # 简单的分词和过滤
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = set()
        
        for word in words:
            if len(word) > 2 and word not in self.stop_words:
                keywords.add(word)
        
        return keywords
    
    def _extract_key_phrases(self, text: str) -> List[str]:
        """提取关键短语"""
        # 简单的短语提取（2-3个词的组合）
        words = re.findall(r'\b\w+\b', text.lower())
        phrases = []
        
        for i in range(len(words) - 1):
            if words[i] not in self.stop_words and words[i+1] not in self.stop_words:
                phrases.append(f"{words[i]} {words[i+1]}")
        
        return phrases
    
    def _extract_concepts(self, text: str) -> set:
        """提取概念"""
        # 提取可能的概念（大写开头的词、技术术语等）
        concepts = set()
        
        # 大写开头的词
        capitalized_words = re.findall(r'\b[A-Z][a-z]+\b', text)
        concepts.update(capitalized_words)
        
        # 技术术语模式
        tech_terms = re.findall(r'\b[a-zA-Z]+(?:[A-Z][a-z]*)+\b', text)  # CamelCase
        concepts.update(tech_terms)
        
        return concepts
    
    def _phrases_similar(self, phrase1: str, phrase2: str) -> bool:
        """判断短语是否相似"""
        words1 = set(phrase1.split())
        words2 = set(phrase2.split())
        
        if not words1 or not words2:
            return False
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union > 0.5
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """计算余弦相似度"""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    def _extract_key_messages(self, messages: List[Dict], topic: str) -> List[Dict]:
        """提取关键消息"""
        key_messages = []
        
        for msg in messages:
            content = msg.get('content', '')
            relevance = self.calculate_advanced_relevance(content, topic)
            
            if relevance > 0.3:  # 相关性阈值
                key_messages.append(msg)
        
        return key_messages
    
    def _extract_key_concepts_from_messages(self, messages: List[Dict]) -> set:
        """从消息中提取关键概念"""
        all_concepts = set()
        
        for msg in messages:
            content = msg.get('content', '')
            concepts = self._extract_concepts(content)
            all_concepts.update(concepts)
        
        return all_concepts
    
    def _extract_qa_pairs(self, messages: List[Dict]) -> List[Tuple[str, str]]:
        """提取问答对"""
        qa_pairs = []
        
        for i in range(len(messages) - 1):
            current_msg = messages[i]
            next_msg = messages[i + 1]
            
            if (current_msg.get('role') == 'user' and 
                next_msg.get('role') == 'assistant'):
                
                question = current_msg.get('content', '')[:100]
                answer = next_msg.get('content', '')[:100]
                
                if question and answer:
                    qa_pairs.append((question, answer))
        
        return qa_pairs
    
    def _summarize_qa_pairs(self, qa_pairs: List[Tuple[str, str]]) -> str:
        """总结问答对"""
        if not qa_pairs:
            return "无具体问答"
        
        # 提取问题关键词
        question_keywords = set()
        for question, _ in qa_pairs:
            keywords = self._extract_keywords(question)
            question_keywords.update(list(keywords)[:3])  # 每个问题取前3个关键词
        
        # 生成摘要
        if question_keywords:
            keywords_str = '、'.join(list(question_keywords)[:5])
            return f"围绕{keywords_str}等问题进行了深入讨论"
        else:
            return f"进行了{len(qa_pairs)}轮问答交流"


# 全局实例
context_processor = ContextProcessor()