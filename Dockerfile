# 多Agent学习系统 - Docker配置
# 基于Node.js 18的Alpine镜像，提供轻量级的生产环境

# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖（仅生产依赖）
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine AS production

# 安装Node.js（用于可能的服务端渲染）
RUN apk add --no-cache nodejs npm

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]

# 元数据标签
LABEL maintainer="Multi-Agent Learning System Team" \
      version="1.0.0" \
      description="多Agent学习系统 - 栈帧式分支Agent架构" \
      org.opencontainers.image.source="https://github.com/yourusername/multi-agent-learning-system"
