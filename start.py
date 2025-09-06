#!/usr/bin/env python3
"""
多Agent学习系统启动脚本
支持开发模式和生产模式启动
"""

import os
import sys
import subprocess
import argparse
import time
from pathlib import Path

def check_requirements():
    """检查系统要求"""
    print("🔍 检查系统要求...")
    
    # 检查Python版本
    if sys.version_info < (3, 9):
        print("❌ Python版本需要3.9或更高")
        return False
    
    # 检查Node.js
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ 未找到Node.js，请先安装Node.js 18+")
            return False
        print(f"✅ Node.js版本: {result.stdout.strip()}")
    except FileNotFoundError:
        print("❌ 未找到Node.js，请先安装Node.js 18+")
        return False
    
    # 检查npm
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ 未找到npm")
            return False
        print(f"✅ npm版本: {result.stdout.strip()}")
    except FileNotFoundError:
        print("❌ 未找到npm")
        return False
    
    print("✅ 系统要求检查通过")
    return True

def setup_environment():
    """设置环境"""
    print("🔧 设置环境...")
    
    # 检查.env文件
    if not os.path.exists(".env"):
        if os.path.exists(".env.example"):
            print("📋 复制.env.example到.env")
            subprocess.run(["cp", ".env.example", ".env"])
            print("⚠️  请编辑.env文件，添加你的OpenAI API Key")
        else:
            print("❌ 未找到.env.example文件")
            return False
    
    return True

def install_dependencies():
    """安装依赖"""
    print("📦 安装依赖...")
    
    # 安装前端依赖
    print("📦 安装前端依赖...")
    result = subprocess.run(["npm", "install"], cwd=".")
    if result.returncode != 0:
        print("❌ 前端依赖安装失败")
        return False
    
    # 安装后端依赖
    print("📦 安装后端依赖...")
    backend_path = Path("backend")
    if backend_path.exists():
        result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                              cwd=backend_path)
        if result.returncode != 0:
            print("❌ 后端依赖安装失败")
            return False
    
    print("✅ 依赖安装完成")
    return True

def start_backend(dev_mode=True):
    """启动后端服务"""
    print("🚀 启动后端服务...")
    
    backend_path = Path("backend")
    if not backend_path.exists():
        print("❌ 未找到backend目录")
        return None
    
    cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    if dev_mode:
        cmd.append("--reload")
    
    try:
        process = subprocess.Popen(cmd, cwd=backend_path)
        print("✅ 后端服务启动成功 (PID: {})".format(process.pid))
        print("🌐 后端API: http://localhost:8000")
        print("📚 API文档: http://localhost:8000/docs")
        return process
    except Exception as e:
        print(f"❌ 后端服务启动失败: {e}")
        return None

def start_frontend(dev_mode=True):
    """启动前端服务"""
    print("🚀 启动前端服务...")
    
    cmd = ["npm", "run", "dev" if dev_mode else "start"]
    
    try:
        process = subprocess.Popen(cmd, cwd=".")
        print("✅ 前端服务启动成功 (PID: {})".format(process.pid))
        print("🌐 前端界面: http://localhost:3000")
        return process
    except Exception as e:
        print(f"❌ 前端服务启动失败: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="多Agent学习系统启动脚本")
    parser.add_argument("--mode", choices=["dev", "prod"], default="dev", 
                       help="启动模式 (dev: 开发模式, prod: 生产模式)")
    parser.add_argument("--skip-deps", action="store_true", 
                       help="跳过依赖安装")
    parser.add_argument("--backend-only", action="store_true", 
                       help="仅启动后端服务")
    parser.add_argument("--frontend-only", action="store_true", 
                       help="仅启动前端服务")
    
    args = parser.parse_args()
    
    print("🌿 多Agent学习系统启动器")
    print("=" * 50)
    
    # 检查系统要求
    if not check_requirements():
        sys.exit(1)
    
    # 设置环境
    if not setup_environment():
        sys.exit(1)
    
    # 安装依赖
    if not args.skip_deps:
        if not install_dependencies():
            sys.exit(1)
    
    dev_mode = args.mode == "dev"
    processes = []
    
    try:
        # 启动服务
        if not args.frontend_only:
            backend_process = start_backend(dev_mode)
            if backend_process:
                processes.append(backend_process)
                time.sleep(3)  # 等待后端启动
        
        if not args.backend_only:
            frontend_process = start_frontend(dev_mode)
            if frontend_process:
                processes.append(frontend_process)
        
        if processes:
            print("\n" + "=" * 50)
            print("🎉 系统启动完成！")
            print("\n📖 使用说明:")
            print("  1. 访问 http://localhost:3000 开始使用")
            print("  2. 按 Ctrl+C 停止所有服务")
            print("  3. 查看 README.md 了解更多功能")
            print("\n" + "=" * 50)
            
            # 等待用户中断
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n🛑 正在停止服务...")
                for process in processes:
                    process.terminate()
                    process.wait()
                print("✅ 所有服务已停止")
        else:
            print("❌ 没有成功启动任何服务")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ 启动过程中发生错误: {e}")
        for process in processes:
            process.terminate()
        sys.exit(1)

if __name__ == "__main__":
    main()