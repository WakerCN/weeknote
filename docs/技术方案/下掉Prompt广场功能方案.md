# 下掉 Prompt 广场功能方案

## 📋 概述

由于 Prompt 广场功能还不够成熟，需要暂时下掉相关功能。本方案详细列出了需要移除的代码和功能点。

## 🎯 下掉范围

### 前端部分

1. **Prompt 广场页面**
   - `/packages/web/src/pages/PromptPlaza/` 整个目录
   - 包括：`index.tsx`, `TemplateCard.tsx`, `TemplateDetail.tsx`, `CommentSection.tsx`

2. **路由配置**
   - `/packages/web/src/main.tsx` - 移除 `/prompt-plaza` 路由

3. **导航入口**
   - `/packages/web/src/pages/Home/index.tsx` - 移除导航栏中的 Prompt 广场按钮
   - `/packages/web/src/components/UserMenu.tsx` - 移除用户菜单中的 Prompt 广场链接

4. **设置页面**
   - `/packages/web/src/pages/settings/PromptSettings.tsx` - 移除发布到广场的功能
   - 移除收藏模板相关的功能（因为收藏主要用于 Prompt 广场）

5. **API 接口**
   - `/packages/web/src/api/index.ts` - 移除 Prompt 广场相关的 API 调用
     - `getPublicPrompts`
     - `favoritePrompt`
     - `unfavoritePrompt`
     - `getPromptComments`
     - `createComment`
     - `deleteComment`
     - `likeComment`
     - `publishPrompt`
     - `unpublishPrompt`
     - `getFavoritePrompts`

### 后端部分

1. **路由接口**
   - `/packages/server/src/routes/prompt-template.ts` - 移除以下路由：
     - `GET /api/prompt-template/public` - 获取公开模板
     - `GET /api/prompt-template/favorites` - 获取收藏列表
     - `POST /api/prompt-template/:id/favorite` - 收藏模板
     - `DELETE /api/prompt-template/:id/favorite` - 取消收藏
     - `POST /api/prompt-template/:id/publish` - 发布到广场
     - `POST /api/prompt-template/:id/unpublish` - 从广场撤回
     - `GET /api/prompt-template/:id/comments` - 获取评论列表
     - `POST /api/prompt-template/:id/comments` - 发表评论
     - `DELETE /api/prompt-template/comments/:id` - 删除评论
     - `POST /api/prompt-template/comments/:id/like` - 点赞评论

2. **数据模型**（保留但不使用）
   - `PromptFavorite` - 收藏模型（保留，以备将来使用）
   - `PromptComment` - 评论模型（保留，以备将来使用）

## 📝 执行步骤

1. ✅ 删除前端 Prompt 广场页面相关文件
2. ✅ 移除路由配置中的 Prompt 广场路由
3. ✅ 移除导航栏和用户菜单中的 Prompt 广场入口
4. ✅ 移除设置页面中发布到广场的功能
5. ✅ 移除前端 API 中 Prompt 广场相关的接口
6. ✅ 移除后端路由中 Prompt 广场相关的接口

## ⚠️ 注意事项

1. **保留数据模型**：虽然下掉了功能，但保留 `PromptFavorite` 和 `PromptComment` 数据模型，以便将来重新启用时数据不丢失。

2. **保留 visibility 字段**：`PromptTemplate` 模型中的 `visibility` 字段保留，但不再使用 `public` 值。

3. **向后兼容**：如果数据库中已有公开模板和收藏数据，这些数据会保留，但前端无法访问。

4. **不影响核心功能**：下掉 Prompt 广场不会影响用户创建、编辑、使用自己的 Prompt 模板的核心功能。

## 🔄 后续恢复

如果将来需要重新启用 Prompt 广场功能，可以：
1. 恢复相关代码文件
2. 重新启用路由和 API
3. 数据模型和数据都已保留，可以直接使用
