import aiosqlite
import asyncio
from typing import Optional
from app.core.config import settings


class DatabaseManager:
    """数据库管理器 - 改进版本，增强稳定性"""
    
    def __init__(self):
        self.db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        self._connection: Optional[aiosqlite.Connection] = None
        self._connection_lock = asyncio.Lock()
    
    async def get_connection(self) -> aiosqlite.Connection:
        """获取数据库连接 - 线程安全版本"""
        async with self._connection_lock:
            if self._connection is None or self._connection._connection is None:
                try:
                    self._connection = await aiosqlite.connect(
                        self.db_path,
                        timeout=30.0,  # 设置连接超时
                        isolation_level=None  # 自动提交模式
                    )
                    # 启用外键约束和优化设置
                    await self._connection.execute("PRAGMA foreign_keys = ON")
                    await self._connection.execute("PRAGMA journal_mode = WAL")
                    await self._connection.execute("PRAGMA synchronous = NORMAL")
                    await self._connection.execute("PRAGMA cache_size = 1000")
                    await self._connection.execute("PRAGMA temp_store = memory")
                    await self._connection.commit()
                except Exception as e:
                    print(f"❌ 数据库连接失败: {e}")
                    raise
            return self._connection
    
    async def close_connection(self):
        """关闭数据库连接 - 安全版本"""
        async with self._connection_lock:
            if self._connection:
                try:
                    await self._connection.close()
                except Exception as e:
                    print(f"⚠️ 关闭数据库连接时出错: {e}")
                finally:
                    self._connection = None
    
    async def execute_query(self, query: str, params: tuple = ()):
        """执行查询 - 增强错误处理"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = await self.get_connection()
                async with conn.execute(query, params) as cursor:
                    return await cursor.fetchall()
            except Exception as e:
                print(f"⚠️ 查询执行失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(0.1 * (attempt + 1))  # 指数退避
    
    async def execute_one(self, query: str, params: tuple = ()):
        """执行查询并返回单条记录 - 增强错误处理"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = await self.get_connection()
                async with conn.execute(query, params) as cursor:
                    return await cursor.fetchone()
            except Exception as e:
                print(f"⚠️ 单条查询执行失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(0.1 * (attempt + 1))
    
    async def execute_insert(self, query: str, params: tuple = ()) -> str:
        """执行插入操作并返回lastrowid - 增强错误处理"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = await self.get_connection()
                cursor = await conn.execute(query, params)
                await conn.commit()
                return str(cursor.lastrowid)
            except Exception as e:
                print(f"⚠️ 插入操作失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(0.1 * (attempt + 1))
    
    async def execute_update(self, query: str, params: tuple = ()) -> int:
        """执行更新操作并返回影响的行数 - 增强错误处理"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = await self.get_connection()
                cursor = await conn.execute(query, params)
                await conn.commit()
                return cursor.rowcount
            except Exception as e:
                print(f"⚠️ 更新操作失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(0.1 * (attempt + 1))


# 全局数据库管理器实例
db_manager = DatabaseManager()


async def init_db():
    """初始化数据库表结构 - 增强版本"""
    try:
        conn = await db_manager.get_connection()
        print("🔄 开始初始化数据库...")
    
        # 创建学习会话表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 创建Agent实例表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                parent_id TEXT,
                agent_type TEXT NOT NULL CHECK (agent_type IN ('main', 'branch')),
                topic TEXT,
                context_data TEXT,
                stack_depth INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'completed')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id),
                FOREIGN KEY (parent_id) REFERENCES agents(id)
            )
        """)
        
        # 创建消息表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                metadata TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
        """)
        
        # 创建栈帧表（用于管理Agent上下文栈帧）
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_stack_frames (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                context_data TEXT,
                inherited_context TEXT,
                stack_depth INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'completed')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
        """)
        
        # 创建索引
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_agents_session_id ON agents(session_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_agents_parent_id ON agents(parent_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_stack_frames_agent_id ON agent_stack_frames(agent_id)")
        
        await conn.commit()
        print("✅ 数据库初始化完成")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        raise


async def get_db():
    """依赖注入：获取数据库连接"""
    return await db_manager.get_connection()


# 数据库操作辅助函数
async def row_to_dict(cursor, row):
    """将数据库行转换为字典"""
    if row is None:
        return None
    
    columns = [description[0] for description in cursor.description]
    return dict(zip(columns, row))


async def rows_to_dict_list(cursor, rows):
    """将数据库行列表转换为字典列表"""
    if not rows:
        return []
    
    columns = [description[0] for description in cursor.description]
    return [dict(zip(columns, row)) for row in rows]