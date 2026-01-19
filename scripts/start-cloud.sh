#!/bin/bash

# WeekNote 云端版本快速启动脚本

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 切换到 Node 18 并强制设置 PATH
nvm use 18

# 关键：直接从 nvm 获取 Node 18 的完整路径
NODE18_PATH="$NVM_DIR/versions/node/$(nvm version 18)/bin"

# 强制将 Node 18 路径放在 PATH 最前面
export PATH="$NODE18_PATH:$PATH"

# 清除 shell 命令缓存和干扰变量
hash -r
unset npm_config_prefix

# 验证 Node 版本
echo "📌 当前 Node 版本: $(node -v)"
echo "📌 Node 路径: $(which node)"

# 检查是否使用了正确的版本
CURRENT_NODE_VERSION=$(node -v)
if [[ ! "$CURRENT_NODE_VERSION" =~ ^v18\. ]]; then
  echo "❌ 错误: Node 版本不正确，期望 v18.x，实际 $CURRENT_NODE_VERSION"
  echo ""
  echo "请手动运行以下命令后重试:"
  echo "  nvm install 18"
  echo "  nvm use 18"
  exit 1
fi

# 使用淘宝镜像源加速 corepack 下载
export COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

# 启用 corepack 并准备 pnpm（使用当前 Node 18 环境）
"$NODE18_PATH/corepack" enable 2>/dev/null || corepack enable 2>/dev/null || true
"$NODE18_PATH/corepack" prepare pnpm@9.15.9 --activate 2>/dev/null || true

# 验证 pnpm
echo "📌 当前 pnpm 版本: $(pnpm -v)"
echo ""

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
