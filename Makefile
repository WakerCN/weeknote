# WeekNote Makefile
# Usage:
#   make help
#   make dev        # 启动全部（Server + Web）
#   make server     # 仅启动后端
#   make web        # 仅启动前端
#   make reinstall  # 重装依赖
#
# 也可以使用 VS Code Tasks（Cmd+Shift+B）启动

SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show help for each target
	@awk 'BEGIN {FS = ":.*##"; printf "\nAvailable targets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: dev
dev: ## 启动全部服务（Server + Web，使用 concurrently）
	@./scripts/start-cloud.sh

.PHONY: server
server: ## 仅启动后端 API 服务
	@echo "🔨 编译后端..."
	@pnpm build:core
	@pnpm build:server
	@echo "🚀 启动后端 API 服务 (http://localhost:3000)"
	@pnpm start:server

.PHONY: web
web: ## 仅启动前端开发服务器
	@echo "🖥️  启动前端开发服务器 (http://localhost:5173)"
	@pnpm dev:web

.PHONY: build
build: ## 编译所有包
	@pnpm build

.PHONY: reinstall
reinstall: ## 清除所有依赖并重新安装
	@echo "🗑️  清理 node_modules..."
	@rm -rf node_modules packages/*/node_modules
	@echo "📦 重新安装依赖..."
	@pnpm install --no-frozen-lockfile
	@echo "✅ 安装完成！"
