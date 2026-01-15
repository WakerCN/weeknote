# @weeknote/server

WeekNote 多用户后端服务模块。

## 功能模块

| 模块 | 说明 | 状态 |
|------|------|------|
| db/ | MongoDB 数据库连接和模型 | ✅ 已完成 |
| auth/ | 用户认证（JWT、密码加密） | ✅ 已完成 |
| middleware/ | Express 中间件 | ✅ 已完成 |
| routes/ | API 路由 | ✅ 已完成 |
| services/ | 业务逻辑层 | 未使用 |

## 数据模型

| 模型 | 说明 |
|------|------|
| User | 用户表（邮箱+密码登录） |
| DailyLog | 每日记录表 |
| GenerationHistory | 生成历史表 |
| PromptTemplate | Prompt 模板表（支持私有/公开/系统） |

## API 接口

### 认证相关 (/api/auth)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /register | 用户注册 | 否 |
| POST | /login | 用户登录 | 否 |
| POST | /refresh | 刷新 Token | 否 |
| GET | /me | 获取当前用户 | 是 |
| PUT | /me | 更新用户信息 | 是 |
| PUT | /password | 修改密码 | 是 |

### 每日记录 (/api/daily-logs)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /day/:date | 获取某天记录 | 是 |
| POST | /day/:date | 保存某天记录 | 是 |
| GET | /range?startDate=xxx&endDate=xxx | 获取时间段记录 | 是 |
| DELETE | /day/:date | 删除某天记录 | 是 |

### 生成历史 (/api/history)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取生成历史列表（分页） | 是 |
| GET | /:id | 获取单条历史详情 | 是 |
| DELETE | /:id | 删除历史记录 | 是 |

### Prompt 模板 (/api/prompts)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取用户的模板列表 | 是 |
| GET | /public | 获取公开模板（广场） | 否 |
| GET | /:id | 获取模板详情 | 是 |
| POST | / | 创建新模板 | 是 |
| PUT | /:id | 更新模板 | 是 |
| DELETE | /:id | 删除模板 | 是 |
| POST | /:id/activate | 激活模板 | 是 |
| POST | /:id/like | 点赞模板 | 是 |

### 用户配置 (/api/config)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取用户配置 | 是 |
| PUT | / | 更新用户配置 | 是 |
| DELETE | /api-key/:platform | 删除 API Key | 是 |

### 周报生成 (/api/generate)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | / | 生成周报（非流式） | 是 |
| POST | /stream | 生成周报（流式，待实现） | 是 |

## 技术栈

- MongoDB + Mongoose
- bcryptjs（密码加密）
- jsonwebtoken（JWT 认证）
- express-validator（参数校验）
- Express.js

## 开发

```bash
# 构建
pnpm --filter @weeknote/server build

# 开发模式
pnpm --filter @weeknote/server dev
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| MONGODB_URI | MongoDB 连接地址 | mongodb://localhost:27017/weeknote |
| JWT_SECRET | JWT 签名密钥 | （开发环境有默认值，生产必填） |
| JWT_ACCESS_EXPIRES | Access Token 过期时间（秒） | 604800 (7天) |
| JWT_REFRESH_EXPIRES | Refresh Token 过期时间（秒） | 2592000 (30天) |

## 目录结构

```
src/
├── index.ts                    # 入口文件
├── db/
│   ├── connection.ts           # 数据库连接
│   └── models/
│       ├── User.ts             # 用户模型
│       ├── DailyLog.ts         # 每日记录模型
│       ├── GenerationHistory.ts # 生成历史模型
│       ├── PromptTemplate.ts   # Prompt 模板模型
│       └── index.ts            # 模型导出
├── auth/
│   ├── password.ts             # 密码加密
│   ├── jwt.ts                  # JWT 工具
│   └── index.ts                # 认证模块导出
├── middleware/
│   ├── auth.middleware.ts      # 认证中间件
│   └── index.ts                # 中间件导出
├── routes/
│   ├── auth.ts                 # 认证路由
│   ├── daily-logs.ts           # 每日记录路由
│   ├── history.ts              # 生成历史路由
│   ├── prompt-template.ts      # Prompt 模板路由
│   ├── config.ts               # 用户配置路由
│   ├── generation.ts           # 周报生成路由
│   └── index.ts                # 路由导出
└── services/                   # 未使用
```

## 开发进度

- [x] Phase 0: 环境准备
- [x] Phase 1: 数据库层
- [x] Phase 2: 用户认证
- [x] Phase 3: API 改造
- [ ] Phase 4: 前端改造
- [ ] Phase 5: 部署上线

## 注意事项

- 当前 `/api/generate` 接口返回 Mock 数据，需在 Phase 4 集成 `@weeknote/core` 的生成逻辑
- 流式生成 `/api/generate/stream` 待 Phase 4 实现
