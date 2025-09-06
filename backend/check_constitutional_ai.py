import sqlite3

# 连接数据库
conn = sqlite3.connect('multi_agent_learning.db')
cursor = conn.cursor()

# 查询宪法式AI agent的历史消息
agent_id = 'e407f16b-662e-4ee1-8485-bd7e17fbcb9b'
cursor.execute('SELECT id, agent_id, role, content, timestamp FROM messages WHERE agent_id = ?', (agent_id,))
results = cursor.fetchall()

print('📨 宪法式AI agent的历史消息:')
print(f'Agent ID: {agent_id}')
print(f'总共找到 {len(results)} 条消息')
print('-' * 80)

for i, r in enumerate(results, 1):
    print(f'{i}. ID: {r[0][:8]}...')
    print(f'   Role: {r[2]}')
    print(f'   Content: {r[3][:100]}...' if len(r[3]) > 100 else f'   Content: {r[3]}')
    print(f'   Time: {r[4]}')
    print()

conn.close()