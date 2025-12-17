# WeekNote - AI 周报生成器

将工程师的 Daily Log 自动整理为结构清晰、可提交的周报。

## ✨ 功能特性

- 📝 **Daily Log 解析** - 自动识别 Plan/Result/Issues/Notes 结构
- 🤖 **多模型支持** - 支持 OpenAI、DeepSeek、SiliconFlow（含免费模型）
- 🌊 **流式输出** - 实时查看 AI 生成过程
- 🖥️ **双端支持** - CLI 命令行 + Web 可视化界面
- 📋 **一键复制** - 快速获取生成的周报
- 🔄 **同步滚动** - 编辑器与预览区双向同步
- ⚙️ **灵活配置** - 支持多 API Key、默认模型设置

## 📦 项目结构

```
weeknote/
├── docs/                    # 产品文档
├── packages/
│   ├── core/               # 核心逻辑层
│   │   ├── parser/         # Daily Log 解析
│   │   ├── prompt/         # Prompt 管理
│   │   └── generator/      # AI 周报生成
│   ├── cli/                # 命令行工具
│   └── web/                # Web 应用
└── package.json            # Monorepo 配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 构建项目

```bash
pnpm build
```

### 配置 API Key

```bash
# 使用交互式配置
pnpm cli config init

# 或手动设置
pnpm cli config key siliconflow <your-api-key>
pnpm cli config default siliconflow/Qwen2.5-7B-Instruct
```

### 启动 Web 服务

```bash
pnpm serve
# 或
pnpm cli serve
```

浏览器会自动打开 http://localhost:3000

## 💻 CLI 使用

### 生成周报

```bash
# 从文件生成周报
pnpm cli generate -f daily-log.md

# 生成并保存到文件
pnpm cli generate -f daily-log.md -o report.md

# 生成并复制到剪贴板
pnpm cli generate -f daily-log.md -c

# 使用指定模型
pnpm cli generate -f daily-log.md -m siliconflow/Qwen2.5-7B-Instruct
```

### 配置管理

```bash
# 交互式初始化配置
pnpm cli config init

# 查看当前配置
pnpm cli config show

# 查看可用模型列表
pnpm cli config models

# 设置默认模型
pnpm cli config default <model-id>

# 设置 API Key
pnpm cli config key <provider> <api-key>
```

### 启动 Web 服务

```bash
# 启动服务并自动打开浏览器
pnpm cli serve

# 指定端口
pnpm cli serve -p 8080

# 不自动打开浏览器
pnpm cli serve --no-open
```

## 🌐 Web 使用

1. 启动服务：`pnpm serve`
2. 在上半区粘贴你的 Daily Log
3. 选择 AI 模型
4. 点击「🚀 生成周报」按钮
5. 在下半区查看、编辑生成的周报
6. 点击「📋 复制」获取最终周报

## 📝 Daily Log 格式

```markdown
12-15 | 周一
Plan
- 计划任务 1
- 计划任务 2

Result
- 完成内容 1
- 完成内容 2

Issues
- 遇到的问题

Notes
- 备注信息

12-16 | 周二
Plan
...
```

## 🤖 支持的模型

### 免费模型（SiliconFlow）

| 模型 | 说明 |
|------|------|
| `siliconflow/Qwen2.5-7B-Instruct` | 通义千问 2.5 (7B) - 默认推荐 |
| `siliconflow/glm-4-9b-chat` | 智谱 GLM-4 (9B) |
| `siliconflow/GLM-Z1-9B-0414` | 智谱 GLM-Z1 (9B) |

### 付费模型

| 模型 | 说明 |
|------|------|
| `deepseek/deepseek-chat` | DeepSeek Chat |
| `openai/gpt-4o` | GPT-4o |
| `openai/gpt-4o-mini` | GPT-4o Mini |

## 🛠️ 开发

### 开发模式

```bash
# 启动 Web 开发服务器（支持热更新）
pnpm dev:web

# 启动 CLI 开发模式（监听文件变化）
pnpm dev:cli
```

### 构建

```bash
# 构建所有包
pnpm build

# 单独构建
pnpm build:core
pnpm build:cli
pnpm build:web
```

### 测试

```bash
pnpm test
```

### 代码规范

```bash
# ESLint 检查
pnpm lint

# 自动修复
pnpm lint:fix

# 格式化代码
pnpm format
```

## 📄 输出格式

生成的周报遵循以下结构：

```markdown
【本周工作总结】
- xxx：
  - xxx
  - xxx

【本周输出成果（Deliverables）】
- ✓ xxx
- ✓ xxx

【问题 & 风险（Issues & Risks）】
- 问题 1：xxx
  - 影响：xxx
  - 需要：xxx

【下周工作计划】
- 计划 1：xxx
- 计划 2：xxx
```

## 🔧 技术栈

- **语言**: TypeScript
- **包管理**: pnpm (Monorepo)
- **Core 层**: Node.js
- **CLI**: Commander.js + Inquirer.js
- **Web 前端**: React + Vite + TailwindCSS + Monaco Editor
- **Web 服务**: Express（集成在 CLI 中）
- **AI**: OpenAI API 兼容接口
- **UI 组件**: Radix UI + shadcn/ui

## 📋 License

MIT
