# WeekNote Makefile
# Usage:
#   make help
#   make reinstall

SHELL := /bin/bash
.DEFAULT_GOAL := help

# If pnpm is not on PATH, allow overriding:
PNPM ?= pnpm

.PHONY: help
help: ## Show help for each target
	@awk 'BEGIN {FS = ":.*##"; printf "\nAvailable targets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: reinstall
reinstall: ## 清除所有依赖并重新安装（删除 node_modules 后 pnpm install）
	@echo ">> 清理 node_modules..."
	@rm -rf node_modules packages/*/node_modules
	@echo ">> 重新安装依赖..."
	@$(PNPM) install --no-frozen-lockfile

