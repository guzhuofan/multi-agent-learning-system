import sqlite3

def check_messages():
    conn = sqlite3.connect('multi_agent_learning.db')
    cursor = conn.cursor()
    
    # 检查消息表结构
    cursor.execute("PRAGMA table_info(messages)")
    columns = cursor.fetchall()
    print('Messages table structure:')
    for col in columns:
        print(f'  {col[1]} ({col[2]})')
    
    # 检查消息总数
    cursor.execute('SELECT COUNT(*) FROM messages')
    total_messages = cursor.fetchone()[0]
    print(f'\nTotal messages: {total_messages}')
    
    # 按Agent分组的消息数量
    cursor.execute('SELECT agent_id, COUNT(*) FROM messages GROUP BY agent_id')
    print('\nMessages per agent:')
    for row in cursor.fetchall():
        print(f'  Agent {row[0]}: {row[1]} messages')
    
    # 最近的消息（使用id排序）
    cursor.execute('SELECT id, agent_id, content FROM messages ORDER BY id DESC LIMIT 10')
    print('\nRecent messages:')
    for row in cursor.fetchall():
        content_preview = row[2][:100] + '...' if len(row[2]) > 100 else row[2]
        print(f'  ID: {row[0]}, Agent: {row[1]}')
        print(f'    Content: {content_preview}')
    
    conn.close()

if __name__ == '__main__':
    check_messages()