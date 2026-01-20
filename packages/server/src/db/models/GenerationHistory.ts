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

  // 日期范围信息
  dateStart?: string;        // 日期范围开始，YYYY-MM-DD 格式（导入时有值）
  dateEnd?: string;          // 日期范围结束，YYYY-MM-DD 格式（导入时有值）
  dateRangeLabel: string;    // 展示用标签，如 "01-13 ~ 01-17" 或 "手动输入"

  // 内容
  inputText: string;         // 输入的 Daily Log 原文
  outputMarkdown: string;    // 生成的周报 Markdown

  // 生成配置
  modelId: string;           // 使用的模型 ID
  modelName: string;         // 模型名称
  promptTemplateId?: mongoose.Types.ObjectId;  // 使用的 Prompt 模板
  promptTemplateName?: string; // 模板名称

  // 时间信息
  generatedAt: Date;         // 开始生成时间
  completedAt: Date;         // 生成完成时间
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
  findByUserAndDateRange(
    userId: mongoose.Types.ObjectId,
    dateStart: string
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
    // 日期范围（可选，导入时有值）
    dateStart: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'],
    },
    dateEnd: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'],
    },
    // 展示用标签（必填）
    dateRangeLabel: {
      type: String,
      required: [true, '日期范围标签不能为空'],
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
    completedAt: {
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
 * 索引：按用户和完成时间倒序查询
 */
GenerationHistorySchema.index({ userId: 1, completedAt: -1 });

/**
 * 索引：按用户和日期范围查询
 */
GenerationHistorySchema.index({ userId: 1, dateStart: 1 });

/**
 * 静态方法：查询用户的生成历史（分页）
 */
GenerationHistorySchema.statics.findByUser = function (
  userId: mongoose.Types.ObjectId,
  options: { limit?: number; skip?: number } = {}
): Promise<IGenerationHistory[]> {
  const { limit = 20, skip = 0 } = options;
  return this.find({ userId })
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * 静态方法：查询用户某日期范围的生成历史
 */
GenerationHistorySchema.statics.findByUserAndDateRange = function (
  userId: mongoose.Types.ObjectId,
  dateStart: string
): Promise<IGenerationHistory[]> {
  return this.find({ userId, dateStart }).sort({ completedAt: -1 });
};

/**
 * 生成历史模型
 */
export const GenerationHistory = mongoose.model<IGenerationHistory, IGenerationHistoryModel>(
  'GenerationHistory',
  GenerationHistorySchema
);
