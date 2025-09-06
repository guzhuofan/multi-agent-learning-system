# 🌿 多Agent学习系统 (Multi-Agent Learning System)

> 基于栈帧式分支Agent架构的创新AI学习平台，解决传统AI学习中的主线偏离和上下文污染问题。

## ✨ 核心特性

- 🎯 **栈帧式分支Agent**：从任意对话点创建专题分支，深入探索特定问题
- 🧠 **智能上下文继承**：分支Agent智能继承父级上下文，保持学习连贯性
- 🌳 **可视化学习路径**：树状结构展示完整的学习探索过程
- 🔄 **无污染设计**：分支探索不影响主线学习进程
- 💾 **学习历史管理**：完整记录和回顾学习路径
- ⚡ **性能监控**：实时监控系统性能，支持大量Agent和消息处理
- 🎮 **快捷键支持**：丰富的键盘快捷键，提升操作效率
- 🛡️ **错误边界**：完善的错误处理和用户友好的错误提示
- 📱 **响应式设计**：完美适配桌面和移动设备

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Python 3.8+
- npm 或 pnpm
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/guzhuofan/multi-agent-learning-system.git
cd multi-agent-learning-system
```

2. **配置前端环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置前端应用设置
```

3. **配置后端环境变量**
```bash
cd backend
cp .env.example .env
# 编辑 backend/.env 文件，添加你的 DeepSeek API Key
# DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

4. **安装前端依赖并启动**
```bash
# 返回项目根目录
cd ..

# 安装前端依赖
npm install

# 启动前端开发服务器
npm run dev
```

5. **安装后端依赖并启动**
```bash
# 在新终端中，进入后端目录
cd backend

# 安装后端依赖
pip install -r requirements.txt

# 启动后端服务器
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

6. **访问应用**
- 前端界面：http://localhost:5173
- 后端API：http://localhost:8000
- API文档：http://localhost:8000/docs
- 支持热重载和实时预览

## 🎮 使用演示

### 快速上手（5分钟掌握）
1. **首次访问**：系统自动显示用户引导，跟随步骤快速了解功能
2. **基础对话**：在输入框中输入消息，与主Agent开始对话
3. **创建分支**：点击消息旁的"创建分支"按钮，深入探讨特定话题
4. **Agent切换**：使用左侧边栏切换不同的Agent
5. **查看分支树**：点击右上角树形图标查看完整学习路径

### 快捷键操作
- `Ctrl + Enter`：快速发送消息
- `Ctrl + B`：切换侧边栏
- `Ctrl + T`：切换分支树视图
- `Ctrl + /`：显示快捷键帮助

### 性能测试
- 点击侧边栏底部"性能测试"按钮创建大量测试数据
- 实时监控系统性能和内存使用情况
- 支持性能优化和垃圾回收

## 🏗️ 技术架构

### 前端技术栈
- **框架**：React 18 + TypeScript
- **状态管理**：Redux Toolkit
- **样式**：TailwindCSS
- **构建工具**：Vite
- **图标**：Lucide React
- **性能优化**：React Window（虚拟滚动）
- **错误处理**：Error Boundary
- **本地存储**：LocalStorage + Redux Persist

### 后端技术栈
- **框架**：FastAPI + Python 3.8+
- **数据库**：SQLite（开发环境）
- **ORM**：SQLAlchemy
- **AI服务**：DeepSeek API
- **异步处理**：asyncio + uvicorn
- **API文档**：自动生成的OpenAPI/Swagger
- **环境管理**：python-dotenv
- **CORS支持**：FastAPI CORS中间件

### 核心创新：栈帧式Agent架构
```
主Agent (栈深度: 0)
├── 分支Agent A (栈深度: 1)
│   ├── 子分支 A1 (栈深度: 2)
│   └── 子分支 A2 (栈深度: 2)
└── 分支Agent B (栈深度: 1)
    └── 子分支 B1 (栈深度: 2)
```

## 📁 项目结构

```
multi-agent-learning-system/
├── README.md                 # 项目介绍
├── package.json             # 前端依赖和脚本
├── vite.config.ts           # Vite构建配置
├── tailwind.config.js       # TailwindCSS配置
├── tsconfig.json            # TypeScript配置
├── .env.example             # 前端环境变量模板
├── src/                     # 前端源码目录
│   ├── components/          # React组件
│   │   ├── AgentSwitcher.tsx    # Agent切换器
│   │   ├── BranchTreePanel.tsx  # 分支树面板
│   │   ├── ChatInterface.tsx    # 聊天界面
│   │   ├── ErrorBoundary.tsx    # 错误边界
│   │   ├── LoadingSpinner.tsx   # 加载动画
│   │   ├── PerformanceMonitor.tsx # 性能监控
│   │   ├── UserGuide.tsx        # 用户引导
│   │   └── VirtualizedMessageList.tsx # 虚拟消息列表
│   ├── store/              # Redux状态管理
│   │   ├── agentSlice.ts       # Agent状态
│   │   ├── chatSlice.ts        # 聊天状态
│   │   ├── uiSlice.ts          # UI状态
│   │   └── index.ts            # Store配置
│   ├── pages/              # 页面组件
│   │   └── HomePage.tsx        # 主页面
│   ├── types/              # TypeScript类型定义
│   └── utils/              # 工具函数
├── backend/                # 后端源码目录
│   ├── app/                # FastAPI应用
│   │   ├── main.py             # 应用入口
│   │   ├── api/                # API路由
│   │   │   └── v1/             # API版本1
│   │   ├── core/               # 核心模块
│   │   │   ├── config.py           # 配置管理
│   │   │   ├── database.py         # 数据库连接
│   │   │   ├── multi_agent_manager.py # 多Agent管理
│   │   │   └── stack_frame.py      # 栈帧管理
│   │   ├── models/             # 数据模型
│   │   │   ├── agent.py            # Agent模型
│   │   │   ├── chat.py             # 聊天模型
│   │   │   ├── message.py          # 消息模型
│   │   │   └── session.py          # 会话模型
│   │   └── services/           # 业务服务
│   │       ├── agent_manager.py    # Agent管理服务
│   │       ├── context_processor.py # 上下文处理
│   │       ├── deepseek_service.py # DeepSeek API服务
│   │       └── openai_service.py   # OpenAI API服务
│   ├── requirements.txt        # Python依赖
│   ├── .env.example           # 后端环境变量模板
│   ├── Dockerfile             # Docker配置
│   └── multi_agent_learning.db # SQLite数据库
├── public/                 # 静态资源
└── dist/                   # 构建输出
```

## 🔧 开发指南

### 本地开发

1. **前端开发**
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 代码检查
npm run type-check   # 类型检查
```

2. **后端开发**
```bash
cd backend
python -m uvicorn app.main:app --reload  # 启动开发服务器
pip install -r requirements.txt          # 安装依赖
python -m pytest                         # 运行测试（如果有）
black app/                               # 代码格式化
```

### 核心功能模块

**Agent管理**
- 主Agent自动创建和初始化
- 分支Agent创建和上下文继承
- Agent状态管理和切换

**消息系统**
- 实时消息发送和接收
- 消息历史记录和持久化
- 消息操作（复制、引用、分支）

**性能优化**
- 虚拟滚动处理大量消息
- 内存使用监控和优化
- 组件懒加载和代码分割

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

#### 前端开发规范
- 遵循 TypeScript 严格模式
- 使用 ESLint 和 Prettier 进行代码格式化
- 编写单元测试覆盖核心功能
- 组件命名使用 PascalCase
- Hook 命名使用 camelCase 并以 use 开头
- 遵循 React 最佳实践和性能优化

#### 后端开发规范
- 遵循 PEP 8 Python 代码风格规范
- 使用 Black 进行代码格式化
- 使用 isort 进行导入排序
- 编写 pytest 单元测试和集成测试
- API 设计遵循 RESTful 规范
- 使用 FastAPI 的依赖注入和数据验证
- 实现完善的错误处理和异常捕获
- 使用结构化日志记录（JSON 格式）
- 数据库操作使用 SQLAlchemy ORM
- 异步编程使用 async/await 模式

#### 通用规范
- 提交信息遵循 Conventional Commits 规范
- 代码审查必须通过才能合并
- 保持代码覆盖率在 80% 以上
- 文档和注释使用中英文混合，优先中文

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [DeepSeek](https://www.deepseek.com/) 提供的强大AI能力和优秀的API服务
- [React](https://reactjs.org/) 社区提供的现代化前端框架
- [FastAPI](https://fastapi.tiangolo.com/) 社区提供的高性能Python Web框架
- [SQLAlchemy](https://www.sqlalchemy.org/) 提供的优秀ORM解决方案
- [Vite](https://vitejs.dev/) 和 [TailwindCSS](https://tailwindcss.com/) 提供的开发工具支持
- 所有贡献者的支持和反馈

## 📞 联系方式

- 项目主页：[GitHub Repository](https://github.com/guzhuofan/multi-agent-learning-system)
- 问题反馈：[Issues](https://github.com/guzhuofan/multi-agent-learning-system/issues)
- 邮箱：[guzhuofan@163.com]

## 🗺️ 路线图

### v1.0.0 (当前版本) - MVP基础版本
- ✅ 栈帧式分支Agent架构
- ✅ React + FastAPI + SQLite 全栈架构
- ✅ 完整的用户交互界面
- ✅ 多Agent对话和切换功能
- ✅ 性能监控和优化
- ✅ 用户引导和快捷键
- ✅ 错误处理和边界保护
- ✅ 响应式设计
- ✅ 本地数据持久化
- ✅ DeepSeek API集成

### Phase 1 (v1.1.0) - LangChain单Agent增强 (1-2周)
- 🔄 集成LangChain框架增强每个Agent
- 🔄 实现Agent独立记忆系统
- 🔄 上下文管理和传递机制
- 🔄 个性化提示词模板和角色设定
- 🔄 工具调用和外部API集成能力
- 🔄 子Agent创建时的上下文继承
- 🔄 学习成果总结和知识点跟踪

### Phase 2 (v1.2.0) - LangGraph笔记生成工作流 (2-3周)
- 📋 使用LangGraph实现智能笔记生成
- 📋 多步骤工作流：分析→提取→结构化→生成
- 📋 支持多种格式：PDF、Markdown、思维导图
- 📋 智能提取关键概念和学习路径
- 📋 工具调用集成：图表生成、文档转换
- 📋 模板化和个性化定制

### Phase 3 (v2.0.0) - 完整智能体系统 (3-4周)
- 📋 完整的LangChain + LangGraph架构
- 📋 向量数据库集成（Chroma/FAISS）
- 📋 知识库和长期记忆系统
- 📋 多层次记忆管理（短期/长期/知识库）
- 📋 高级工具集成（网络搜索、文件处理）
- 📋 可视化学习路径和知识图谱
- 📋 云端部署和数据同步

### 未来版本 (v3.0.0+)
- 📋 多模型支持（Claude, Gemini等）
- 📋 协作学习功能
- 📋 企业级部署支持
- 📋 插件系统和扩展机制
- 📋 移动端应用
- 📋 多租户支持

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！

**让AI学习更有结构，让知识探索更有深度！** 🚀