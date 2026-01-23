/**
 * 数据库模型导出
 */

// 用户模型
export { User } from './User.js';
export type { IUser, IUserModel, IUserConfig, IApiKeys, LoginMethod } from './User.js';

// 验证码模型
export { VerificationCode } from './VerificationCode.js';
export type {
  IVerificationCode,
  IVerificationCodeModel,
  VerificationCodeType,
} from './VerificationCode.js';

// 每日记录模型
export { DailyLog } from './DailyLog.js';
export type { IDailyLog, IDailyLogModel } from './DailyLog.js';

// 生成历史模型
export { GenerationHistory } from './GenerationHistory.js';
export type { IGenerationHistory, IGenerationHistoryModel } from './GenerationHistory.js';

// Prompt 模板模型
export { PromptTemplate } from './PromptTemplate.js';
export type {
  IPromptTemplate,
  IPromptTemplateModel,
  PromptVisibility,
} from './PromptTemplate.js';

// Prompt 收藏模型
export { PromptFavorite } from './PromptFavorite.js';
export type { IPromptFavorite, IPromptFavoriteModel } from './PromptFavorite.js';

// Prompt 评论模型
export { PromptComment } from './PromptComment.js';
export type { IPromptComment, IPromptCommentModel } from './PromptComment.js';
