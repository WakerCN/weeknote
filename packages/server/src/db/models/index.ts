/**
 * 数据库模型导出
 */

// 用户模型
export { User } from './User.js';
export type { IUser, IUserModel, IUserConfig, IApiKeys } from './User.js';

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
