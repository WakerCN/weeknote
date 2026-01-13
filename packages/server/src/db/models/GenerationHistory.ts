/**
 * 生成历史模型
 * 记录每次周报生成的历史
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 生成历史文档接口
 */
export interface IGenerationHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // 输入信息
  weekStart: string;           // 周开始日期 "2024-12-16"
  weekEnd: string;             // 周结束日期 "2024-12-22"
  inputText: string;           // 输入的 Daily Log 原文

  // 输出信息
  outputMarkdown: string;      // 生成的周报 Markdown

  // 生成配置
  modelId: string;             // 使用的模型 ID
  modelName: string;           // 模型名称
  promptTemplateId?: mongoose.Types.ObjectId;  // 使用的 Prompt 模板
  promptTemplateName?: string; // 模板名称

  // 时间信息
  generatedAt: Date;           // 生成时间
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 生成历史模型静态方法接口
 */
export interface IGenerationHistoryModel extends Model<IGenerationHistory> {
  findByUser(
    userId: mongoose.Types.ObjectId,
    options?: { limit?: number; skip?: number }
  ): Promise<IGenerationHistory[]>;
  findByUserAndWeek(
    userId: mongoose.Types.ObjectId,
    weekStart: string
  ): Promise<IGenerationHistory[]>;
}

/**
 * 生成历史 Schema
 */
const GenerationHistorySchema = new Schema<IGenerationHistory, IGenerationHistoryModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID不能为空'],
      index: true,
    },
    weekStart: {
      type: String,
      required: [true, '周开始日期不能为空'],
      match: [/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'],
    },
    weekEnd: {
      type: String,
      required: [true, '周结束日期不能为空'],
      match: [/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'],
    },
    inputText: {
      type: String,
      required: [true, '输入内容不能为空'],
    },
    outputMarkdown: {
      type: String,
      required: [true, '输出内容不能为空'],
    },
    modelId: {
      type: String,
      required: [true, '模型ID不能为空'],
    },
    modelName: {
      type: String,
      required: [true, '模型名称不能为空'],
    },
    promptTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'PromptTemplate',
    },
    promptTemplateName: {
      type: String,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 索引：按用户和生成时间倒序查询
 */
GenerationHistorySchema.index({ userId: 1, generatedAt: -1 });

/**
 * 索引：按用户和周查询
 */
GenerationHistorySchema.index({ userId: 1, weekStart: 1 });

/**
 * 静态方法：查询用户的生成历史（分页）
 */
GenerationHistorySchema.statics.findByUser = function (
  userId: mongoose.Types.ObjectId,
  options: { limit?: number; skip?: number } = {}
): Promise<IGenerationHistory[]> {
  const { limit = 20, skip = 0 } = options;
  return this.find({ userId })
    .sort({ generatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * 静态方法：查询用户某周的生成历史
 */
GenerationHistorySchema.statics.findByUserAndWeek = function (
  userId: mongoose.Types.ObjectId,
  weekStart: string
): Promise<IGenerationHistory[]> {
  return this.find({ userId, weekStart }).sort({ generatedAt: -1 });
};

/**
 * 生成历史模型
 */
export const GenerationHistory = mongoose.model<IGenerationHistory, IGenerationHistoryModel>(
  'GenerationHistory',
  GenerationHistorySchema
);
