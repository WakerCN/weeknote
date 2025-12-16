# WeekNote - AI 周报生成器

将工程师的 Daily Log 自动整理为结构清晰、可提交的周报。

## 项目结构

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

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制环境变量示例文件并填入你的 OpenAI API Key：

```bash
cp .env.example .env
# 编辑 .env 文件，填入 OPENAI_API_KEY
```

### 启动开发服务器

```bash
# 启动 Web 应用
pnpm dev:web

# 或启动 CLI
pnpm dev:cli
```

## 使用方式

### Web 界面

1. 打开 http://localhost:5173
2. 在上半区粘贴你的 Daily Log
3. 点击「生成周报」按钮
4. 在下半区查看、编辑生成的周报
5. 点击「一键复制」获取最终周报

### CLI

```bash
# 从文件生成周报
weeknote generate -f daily-log.md -o report.md

# 生成并复制到剪贴板
weeknote generate -f daily-log.md -c
```

## Daily Log 格式

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
```

## 技术栈

- **语言**: TypeScript
- **Core 层**: Node.js
- **CLI**: Commander.js
- **Web 前端**: React + Vite + TailwindCSS + Monaco Editor
- **Web 后端**: Express
- **AI**: OpenAI API

## License

MIT


