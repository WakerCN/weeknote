# @weeknote/server

WeekNote 多用户后端服务模块。

## 功能模块

| 模块 | 说明 | 状态 |
|------|------|------|
| db/ | MongoDB 数据库连接和模型 | ✅ 已完成 |
| auth/ | 用户认证（JWT、密码加密） | ✅ 已完成 |
| middleware/ | Express 中间件 | ✅ 已完成 |
| routes/ | API 路由 | 🔄 进行中 |
| services/ | 业务逻辑层 | Phase 3 |

## 数据模型

| 模型 | 说明 |
|------|------|
| User | 用户表（邮箱+密码登录） |
| DailyLog | 每日记录表 |
| GenerationHistory | 生成历史表 |
| PromptTemplate | Prompt 模板表（支持私有/公开/系统） |

## API 接口

### 认证相关

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 用户注册 | 否 |
| POST | /api/auth/login | 用户登录 | 否 |
| POST | /api/auth/refresh | 刷新 Token | 否 |
| GET | /api/auth/me | 获取当前用户 | 是 |
| PUT | /api/auth/me | 更新用户信息 | 是 |
| PUT | /api/auth/password | 修改密码 | 是 |

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
| JWT_ACCESS_EXPIRES | Access Token 过期时间 | 7d |
| JWT_REFRESH_EXPIRES | Refresh Token 过期时间 | 30d |

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
│   └── index.ts                # 路由导出
└── services/                   # 业务服务（Phase 3）
```

## 开发进度

- [x] Phase 0: 环境准备
- [x] Phase 1: 数据库层
- [x] Phase 2: 用户认证
- [ ] Phase 3: API 改造
- [ ] Phase 4: 前端改造
- [ ] Phase 5: 部署上线
