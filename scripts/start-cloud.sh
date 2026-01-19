#!/bin/bash

# WeekNote 云端版本快速启动脚本

# 加载 nvm 并使用项目指定的 Node 版本
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 如果存在 .nvmrc，自动切换到对应版本
if [ -f ".nvmrc" ]; then
  nvm use
fi

# 确保使用 nvm 管理的 Node，移除 Homebrew Node 的干扰
export PATH="$NVM_DIR/versions/node/$(node -v)/bin:$PATH"

# 使用淘宝镜像源加速 corepack 下载
export COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

# 启用 corepack
corepack enable 2>/dev/null || true

echo "============================================================"
echo "  WeekNote 云端版本启动脚本"
echo "============================================================"
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
  echo "❌ 错误: 未找到 .env 文件"
  echo ""
  echo "请在项目根目录创建 .env 文件，并配置以下环境变量:"
  echo ""
  echo "  MONGODB_URI=mongodb://localhost:27017/weeknote"
  echo "  JWT_SECRET=<your-secret-key>"
  echo "  PORT=3000"
  echo ""
  echo "详见: docs/测试指南.md"
  exit 1
fi

echo "✅ 找到 .env 文件"
echo ""

# 检查 MongoDB 是否运行
echo "🔍 检查 MongoDB 状态..."
if ! mongosh --eval "db.version()" > /dev/null 2>&1; then
  echo "❌ MongoDB 未运行"
  echo ""
  echo "请先启动 MongoDB:"
  echo "  brew services start mongodb-community"
  echo ""
  echo "或使用 Docker:"
  echo "  docker run -d --name weeknote-mongo -p 27017:27017 mongo:latest"
  exit 1
fi

echo "✅ MongoDB 运行中"
echo ""

# 编译 Web UI（产物输出到 packages/cli/web-dist）
echo "🖥️  编译 Web UI..."
pnpm --filter weeknote-cli build

if [ $? -ne 0 ]; then
  echo "❌ Web UI 编译失败"
  exit 1
fi

echo "✅ Web UI 编译完成"
echo ""

# 编译后端
echo "📦 编译后端代码..."
pnpm --filter @weeknote/server build

if [ $? -ne 0 ]; then
  echo "❌ 后端编译失败"
  exit 1
fi

echo "✅ 后端编译完成"
echo ""

# 启动服务
echo "🚀 启动云端后端服务..."
echo ""
pnpm --filter @weeknote/server start
