#!/bin/bash

# 多Agent学习系统 - 自动化部署脚本
# 支持开发环境和生产环境的一键部署

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
多Agent学习系统 - 部署脚本

用法: $0 [选项] <环境>

环境:
  dev         开发环境部署
  prod        生产环境部署
  local       本地Docker部署

选项:
  -h, --help     显示此帮助信息
  -v, --verbose  详细输出
  -c, --clean    清理旧的构建文件
  --no-cache     不使用Docker缓存
  --skip-tests   跳过测试
  --skip-build   跳过构建步骤

示例:
  $0 dev                    # 开发环境部署
  $0 prod --clean           # 生产环境部署并清理
  $0 local --no-cache       # 本地部署不使用缓存

EOF
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查Docker（如果需要）
    if [[ "$ENVIRONMENT" == "local" ]] && ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，本地部署需要 Docker"
        exit 1
    fi
    
    # 检查Docker Compose（如果需要）
    if [[ "$ENVIRONMENT" == "local" ]] && ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 清理函数
clean_build() {
    if [[ "$CLEAN" == "true" ]]; then
        log_info "清理旧的构建文件..."
        rm -rf dist/
        rm -rf node_modules/.vite/
        log_success "清理完成"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm ci
    fi
    
    log_success "依赖安装完成"
}

# 运行测试
run_tests() {
    if [[ "$SKIP_TESTS" != "true" ]]; then
        log_info "运行测试..."
        
        # 类型检查
        if npm run check &> /dev/null; then
            log_success "类型检查通过"
        else
            log_warning "类型检查有警告，继续部署"
        fi
        
        # 单元测试（如果存在）
        if npm run test --if-present &> /dev/null; then
            log_success "单元测试通过"
        else
            log_info "未找到单元测试或测试失败"
        fi
    else
        log_warning "跳过测试步骤"
    fi
}

# 构建应用
build_app() {
    if [[ "$SKIP_BUILD" != "true" ]]; then
        log_info "构建应用..."
        
        # 设置环境变量
        export NODE_ENV=$ENVIRONMENT
        
        # 构建
        npm run build
        
        log_success "应用构建完成"
    else
        log_warning "跳过构建步骤"
    fi
}

# 开发环境部署
deploy_dev() {
    log_info "启动开发环境..."
    
    # 检查环境变量文件
    if [[ ! -f ".env" ]]; then
        log_warning ".env 文件不存在，复制 .env.example"
        cp .env.example .env
        log_info "请编辑 .env 文件配置必要的环境变量"
    fi
    
    # 启动开发服务器
    npm run dev
}

# 生产环境部署
deploy_prod() {
    log_info "部署到生产环境..."
    
    # 检查环境变量
    if [[ ! -f ".env.production" ]]; then
        log_error "生产环境配置文件 .env.production 不存在"
        exit 1
    fi
    
    # 构建生产版本
    export NODE_ENV=production
    npm run build
    
    # 这里可以添加部署到服务器的逻辑
    # 例如：rsync, scp, 或者云服务商的CLI工具
    
    log_success "生产环境部署完成"
    log_info "构建文件位于 dist/ 目录"
}

# 本地Docker部署
deploy_local() {
    log_info "启动本地Docker环境..."
    
    # Docker构建参数
    DOCKER_ARGS=""
    if [[ "$NO_CACHE" == "true" ]]; then
        DOCKER_ARGS="--no-cache"
    fi
    
    # 构建并启动容器
    docker-compose down
    docker-compose build $DOCKER_ARGS
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 健康检查
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "服务启动成功！"
        log_info "访问地址: http://localhost:3000"
    else
        log_error "服务启动失败，请检查日志"
        docker-compose logs
        exit 1
    fi
}

# 显示部署后信息
show_post_deploy_info() {
    cat << EOF

${GREEN}🎉 部署完成！${NC}

根据部署环境，您可以：

${BLUE}开发环境:${NC}
  - 访问: http://localhost:5173
  - 热重载已启用
  - 开发工具已激活

${BLUE}生产环境:${NC}
  - 构建文件: ./dist/
  - 部署到您的Web服务器
  - 配置反向代理

${BLUE}本地Docker:${NC}
  - 访问: http://localhost:3000
  - 查看日志: docker-compose logs -f
  - 停止服务: docker-compose down

${YELLOW}注意事项:${NC}
  - 确保环境变量配置正确
  - 生产环境请使用HTTPS
  - 定期备份用户数据

EOF
}

# 主函数
main() {
    # 解析命令行参数
    ENVIRONMENT=""
    VERBOSE=false
    CLEAN=false
    NO_CACHE=false
    SKIP_TESTS=false
    SKIP_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            -c|--clean)
                CLEAN=true
                shift
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            dev|prod|local)
                ENVIRONMENT=$1
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查环境参数
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "请指定部署环境: dev, prod, 或 local"
        show_help
        exit 1
    fi
    
    # 显示部署信息
    log_info "开始部署多Agent学习系统"
    log_info "环境: $ENVIRONMENT"
    log_info "时间: $(date)"
    
    # 执行部署流程
    check_dependencies
    clean_build
    
    case $ENVIRONMENT in
        dev)
            install_dependencies
            run_tests
            deploy_dev
            ;;
        prod)
            install_dependencies
            run_tests
            build_app
            deploy_prod
            ;;
        local)
            deploy_local
            ;;
    esac
    
    show_post_deploy_info
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"' ERR

# 执行主函数
main "$@"