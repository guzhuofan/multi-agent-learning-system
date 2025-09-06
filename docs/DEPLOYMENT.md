# 多Agent学习系统 - 部署指南

本文档详细介绍了多Agent学习系统的各种部署方式，包括本地开发、生产环境部署和云服务部署。

## 📋 目录

- [快速开始](#快速开始)
- [本地开发部署](#本地开发部署)
- [Docker部署](#docker部署)
- [云服务部署](#云服务部署)
- [生产环境部署](#生产环境部署)
- [环境变量配置](#环境变量配置)
- [监控和维护](#监控和维护)
- [故障排除](#故障排除)

## 🚀 快速开始

### 最简单的部署方式

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/multi-agent-learning-system.git
cd multi-agent-learning-system

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 打开浏览器访问 http://localhost:5173
```

## 💻 本地开发部署

### 环境要求

- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本（推荐使用 pnpm）
- **现代浏览器**: Chrome 90+, Firefox 88+, Safari 14+

### 详细步骤

1. **环境准备**
   ```bash
   # 检查Node.js版本
   node --version  # 应该 >= 18.0.0
   
   # 检查npm版本
   npm --version   # 应该 >= 8.0.0
   ```

2. **项目设置**
   ```bash
   # 克隆项目
   git clone https://github.com/yourusername/multi-agent-learning-system.git
   cd multi-agent-learning-system
   
   # 复制环境变量文件
   cp .env.example .env
   
   # 编辑环境变量（可选）
   # 开发环境通常使用默认配置即可
   ```

3. **安装依赖**
   ```bash
   # 使用npm
   npm install
   
   # 或使用pnpm（推荐，更快）
   pnpm install
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **验证部署**
   - 打开浏览器访问 `http://localhost:5173`
   - 应该看到多Agent学习系统的主界面
   - 尝试创建对话和分支Agent功能

### 开发工具

```bash
# 类型检查
npm run check

# 代码格式化
npm run format

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🐳 Docker部署

### 本地Docker部署

1. **环境要求**
   - Docker 20.0+ 
   - Docker Compose 2.0+

2. **快速启动**
   ```bash
   # 使用自动化脚本
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh local
   
   # 或手动启动
   docker-compose up -d
   ```

3. **访问应用**
   - 应用地址: `http://localhost:3000`
   - 健康检查: `http://localhost:3000/health`

4. **管理容器**
   ```bash
   # 查看日志
   docker-compose logs -f
   
   # 停止服务
   docker-compose down
   
   # 重新构建
   docker-compose build --no-cache
   docker-compose up -d
   ```

### 开发环境Docker

```bash
# 启动开发环境容器
docker-compose --profile dev up -d

# 访问开发服务器
# http://localhost:5173
```

### 生产环境Docker

```bash
# 构建生产镜像
docker build -t multi-agent-system:latest .

# 运行生产容器
docker run -d \
  --name multi-agent-system \
  -p 80:80 \
  --restart unless-stopped \
  multi-agent-system:latest
```

## ☁️ 云服务部署

### Vercel部署（推荐）

1. **自动部署**
   - Fork项目到你的GitHub账户
   - 在 [Vercel](https://vercel.com) 导入项目
   - Vercel会自动检测Vite配置并部署

2. **手动部署**
   ```bash
   # 安装Vercel CLI
   npm i -g vercel
   
   # 登录Vercel
   vercel login
   
   # 部署项目
   vercel
   
   # 生产部署
   vercel --prod
   ```

3. **环境变量配置**
   - 在Vercel控制台设置环境变量
   - 或使用 `vercel env` 命令

### Netlify部署

1. **自动部署**
   - 连接GitHub仓库到Netlify
   - 构建命令: `npm run build`
   - 发布目录: `dist`

2. **手动部署**
   ```bash
   # 构建项目
   npm run build
   
   # 安装Netlify CLI
   npm install -g netlify-cli
   
   # 部署
   netlify deploy --prod --dir=dist
   ```

### GitHub Pages部署

1. **配置GitHub Actions**
   - 项目已包含 `.github/workflows/ci-cd.yml`
   - 推送到main分支自动触发部署

2. **手动部署**
   ```bash
   # 安装gh-pages
   npm install --save-dev gh-pages
   
   # 添加部署脚本到package.json
   "deploy": "gh-pages -d dist"
   
   # 构建并部署
   npm run build
   npm run deploy
   ```

## 🏭 生产环境部署

### 服务器部署

1. **服务器要求**
   - Ubuntu 20.04+ / CentOS 8+
   - Node.js 18+
   - Nginx 1.18+
   - SSL证书（推荐）

2. **部署步骤**
   ```bash
   # 在服务器上
   git clone https://github.com/yourusername/multi-agent-learning-system.git
   cd multi-agent-learning-system
   
   # 安装依赖
   npm ci --only=production
   
   # 构建应用
   npm run build
   
   # 配置Nginx
   sudo cp nginx.conf /etc/nginx/sites-available/multi-agent-system
   sudo ln -s /etc/nginx/sites-available/multi-agent-system /etc/nginx/sites-enabled/
   
   # 重启Nginx
   sudo systemctl restart nginx
   ```

3. **Nginx配置示例**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       # 重定向到HTTPS
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       root /path/to/multi-agent-learning-system/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

### 使用PM2管理（如果有Node.js后端）

```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'multi-agent-system',
    script: 'serve',
    args: '-s dist -l 3000',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save
pm2 startup
```

## ⚙️ 环境变量配置

### 开发环境 (.env)

```bash
# 基础配置
NODE_ENV=development
VITE_DEBUG=true
VITE_USE_MOCK_DATA=true

# 功能开关
VITE_ENABLE_PERFORMANCE_TESTING=true
VITE_ENABLE_USER_GUIDE=true
```

### 生产环境 (.env.production)

```bash
# 基础配置
NODE_ENV=production
VITE_DEBUG=false
VITE_USE_MOCK_DATA=false

# 性能配置
VITE_MAX_STACK_DEPTH=5
VITE_MAX_MESSAGES_PER_AGENT=1000

# 安全配置
VITE_ENABLE_EXPERIMENTAL_FEATURES=false
```

### 云服务环境变量

**Vercel:**
- 在项目设置中添加环境变量
- 支持不同环境的变量配置

**Netlify:**
- 在Site settings > Environment variables中配置
- 支持构建时和运行时变量

## 📊 监控和维护

### 健康检查

```bash
# 检查应用状态
curl -f http://localhost:3000/health

# 检查构建状态
npm run build

# 检查类型错误
npm run check
```

### 性能监控

1. **内置性能监控**
   - 应用内置性能监控组件
   - 实时显示内存使用和FPS
   - 支持性能测试数据生成

2. **外部监控工具**
   ```bash
   # 使用Lighthouse进行性能测试
   npx lighthouse http://localhost:3000 --output html
   
   # 使用WebPageTest
   # 访问 https://www.webpagetest.org/
   ```

### 日志管理

```bash
# Docker日志
docker-compose logs -f frontend

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 应用日志（浏览器控制台）
# 打开开发者工具查看Console
```

### 备份和恢复

```bash
# 备份用户数据（LocalStorage）
# 用户可以通过应用内的导出功能备份对话历史

# 备份配置文件
cp .env .env.backup
cp nginx.conf nginx.conf.backup

# 代码备份
git push origin main  # 推送到远程仓库
```

## 🔧 故障排除

### 常见问题

1. **端口占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :5173
   
   # 杀死进程
   kill -9 <PID>
   
   # 或使用不同端口
   npm run dev -- --port 3001
   ```

2. **依赖安装失败**
   ```bash
   # 清理缓存
   npm cache clean --force
   rm -rf node_modules package-lock.json
   
   # 重新安装
   npm install
   ```

3. **构建失败**
   ```bash
   # 检查TypeScript错误
   npm run check
   
   # 清理构建缓存
   rm -rf dist
   rm -rf node_modules/.vite
   
   # 重新构建
   npm run build
   ```

4. **Docker问题**
   ```bash
   # 查看容器日志
   docker-compose logs frontend
   
   # 重新构建镜像
   docker-compose build --no-cache
   
   # 清理Docker缓存
   docker system prune -a
   ```

### 性能问题

1. **内存使用过高**
   - 检查是否有内存泄漏
   - 使用性能监控组件查看内存使用
   - 清理过多的消息历史

2. **加载速度慢**
   - 检查网络连接
   - 启用浏览器缓存
   - 使用CDN加速静态资源

3. **响应速度慢**
   - 检查是否有大量DOM元素
   - 使用虚拟滚动优化长列表
   - 减少不必要的重渲染

### 获取帮助

- **GitHub Issues**: [项目Issues页面](https://github.com/yourusername/multi-agent-learning-system/issues)
- **文档**: 查看项目README和技术文档
- **社区**: 加入项目讨论群组

## 📝 部署检查清单

### 部署前检查

- [ ] 代码已提交到版本控制系统
- [ ] 所有测试通过
- [ ] 环境变量配置正确
- [ ] 依赖版本兼容
- [ ] 构建成功无错误

### 部署后验证

- [ ] 应用可以正常访问
- [ ] 所有功能正常工作
- [ ] 性能指标正常
- [ ] 错误监控正常
- [ ] 备份机制就位

### 生产环境额外检查

- [ ] HTTPS证书配置
- [ ] 安全头设置
- [ ] 缓存策略配置
- [ ] 监控告警设置
- [ ] 灾难恢复计划

---

*本部署指南会持续更新，以反映最新的部署最佳实践和工具。*