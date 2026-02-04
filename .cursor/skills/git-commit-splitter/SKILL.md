---
name: git-commit-splitter
description: 分析 Git 工作区变更并拆分为多个语义清晰的 commit。当用户说"拆分 commit"、"整理提交"、"帮我提交代码"、"提交代码"、"commit"时使用。
---

# Git Commit 智能拆分

分析当前工作区的全部代码变更（staged + unstaged），拆分为多个语义清晰、可维护的 Git commit。

## 工作流程

1. **获取变更** - 执行 `git status` 和 `git diff` 查看所有变更
2. **分析变更** - 按文件和改动内容分类
3. **输出方案** - 按规范格式输出拆分建议
4. **等待确认** - 用户确认后再执行提交

## 拆分原则

- 按 **feat / fix / refactor / style / docs / chore / test** 分类
- **一个 commit 只做一件事**，只包含一类变更
- UI、业务逻辑、配置、文档应尽量拆分
- 若必须合并多个改动，需说明原因
- 以**可回滚、易 Code Review** 为目标，宁可多拆

## Commit Message 规范

遵循 **Conventional Commits**，必须使用中文，允许 scope。

### Emoji 映射（强制）

每条 Commit Message **必须以 emoji 开头**：

| 类型 | Emoji | 示例 |
|------|-------|------|
| feat | ✨ | ✨ feat(login)：新增短信验证码登录能力 |
| fix | 🐛 | 🐛 fix(order)：修复订单列表分页异常问题 |
| refactor | ♻️ | ♻️ refactor(utils)：重构日期处理函数 |
| style | 🎨 | 🎨 style(button)：调整按钮圆角样式 |
| docs | 📝 | 📝 docs：更新 README 安装说明 |
| chore | 🔧 | 🔧 chore：升级 vite 到 5.0 版本 |
| test | 🧪 | 🧪 test(api)：补充登录接口单元测试 |

## 输出格式

按顺序输出多个 commit，每个使用以下结构：

```
### Commit N

- **类型**：feat / fix / refactor / style / docs / chore / test
- **scope**（可选）：模块名
- **Commit Message**：emoji + 空格 + 完整 message
- **包含的变更文件**：
  - file1.ts
  - file2.tsx
- **拆分原因说明**：为什么这些文件放在一起
```

## 重要约束

1. ⚠️ **不要执行 git commit** - 仅输出拆分方案
2. ✅ 最后必须询问用户：

   > "是否按以上拆分顺序提交？是否需要调整？"

3. ⛔ 未经用户确认，不得执行任何提交操作
