# WeekNote Makefile
# Usage:
#   make help
#   make dev
#   make reinstall

SHELL := /bin/bash
.DEFAULT_GOAL := help
.ONESHELL:

PNPM ?= pnpm

.PHONY: help
help: ## Show help for each target
	@awk 'BEGIN {FS = ":.*##"; printf "\nAvailable targets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# 静默 dev/reinstall 目标的命令输出（.ONESHELL 下 @ 只作用于首行）
.SILENT: dev dev-simple reinstall

.PHONY: dev
dev: ## 启动开发环境（后端 + 前端热更新）
	set -e
	echo "🔄 切换 Node 版本..."
	source "$$HOME/.nvm/nvm.sh" && nvm use
	echo "🔨 首次编译 core 和 cli..."
	$(PNPM) build:core
	$(PNPM) --filter weeknote-cli exec tsc
	echo "🚀 启动开发服务器（热更新模式）..."
	$(PNPM) exec concurrently -k \
		-n "core,cli,api,web" \
		-c "cyan,yellow,blue,green" \
		"$(PNPM) --filter @weeknote/core dev" \
		"$(PNPM) --filter weeknote-cli dev" \
		"sleep 2 && $(PNPM) --filter weeknote-cli dev:server" \
		"$(PNPM) --filter @weeknote/web dev"

.PHONY: dev-simple
dev-simple: ## 启动开发环境（简化版，仅 API + Web）
	set -e
	echo "🔄 切换 Node 版本..."
	source "$$HOME/.nvm/nvm.sh" && nvm use
	echo "🔨 编译 core 和 cli..."
	$(PNPM) build:core
	$(PNPM) --filter weeknote-cli exec tsc
	echo "🚀 启动开发服务器..."
	$(PNPM) exec concurrently -k \
		-n "api,web" \
		-c "blue,green" \
		"$(PNPM) --filter weeknote-cli dev:server" \
		"$(PNPM) --filter @weeknote/web dev"

.PHONY: reinstall
reinstall: ## 清除所有依赖并重新安装（删除 node_modules 后 pnpm install）
	set -e
	echo "🗑️  清理 node_modules..."
	rm -rf node_modules packages/*/node_modules
	echo "📦 重新安装依赖..."
	$(PNPM) install --no-frozen-lockfile
	echo "✅ 安装完成！"
