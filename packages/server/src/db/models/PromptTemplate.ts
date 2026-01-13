/**
 * Prompt 模板模型
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 可见性类型
 */
export type PromptVisibility = 'private' | 'public' | 'system';

/**
 * Prompt 模板文档接口
 */
export interface IPromptTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | null;  // system 模板为 null

  // 基本信息
  name: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;

  // 可见性与状态
  visibility: PromptVisibility;
  isActive: boolean;           // 是否为用户当前激活的模板

  // Prompt 广场相关
  usageCount: number;          // 使用次数
  likeCount: number;           // 点赞数

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prompt 模板模型静态方法接口
 */
export interface IPromptTemplateModel extends Model<IPromptTemplate> {
  findActiveByUser(userId: mongoose.Types.ObjectId): Promise<IPromptTemplate | null>;
  findByUser(userId: mongoose.Types.ObjectId): Promise<IPromptTemplate[]>;
  findPublicTemplates(options?: { limit?: number; skip?: number }): Promise<IPromptTemplate[]>;
  findSystemTemplates(): Promise<IPromptTemplate[]>;
}

/**
 * Prompt 模板 Schema
 */
const PromptTemplateSchema = new Schema<IPromptTemplate, IPromptTemplateModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,  // system 模板为 null
      index: true,
    },
    name: {
      type: String,
      required: [true, '模板名称不能为空'],
      trim: true,
      maxlength: [100, '模板名称最多100个字符'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, '模板描述最多500个字符'],
    },
    systemPrompt: {
      type: String,
      required: [true, '系统提示词不能为空'],
    },
    userPromptTemplate: {
      type: String,
      required: [true, '用户提示词模板不能为空'],
      validate: {
        validator: function (v: string) {
          return v.includes('{{dailyLog}}');
        },
        message: '用户提示词模板必须包含 {{dailyLog}} 占位符',
      },
    },
    visibility: {
      type: String,
      enum: ['private', 'public', 'system'],
      default: 'private',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 索引：查询用户激活的模板
 */
PromptTemplateSchema.index({ userId: 1, isActive: 1 });

/**
 * 索引：Prompt 广场列表查询（按使用次数排序）
 */
PromptTemplateSchema.index({ visibility: 1, usageCount: -1 });

/**
 * 索引：用户的模板列表
 */
PromptTemplateSchema.index({ userId: 1, visibility: 1 });

/**
 * 静态方法：查找用户当前激活的模板
 */
PromptTemplateSchema.statics.findActiveByUser = function (
  userId: mongoose.Types.ObjectId
): Promise<IPromptTemplate | null> {
  return this.findOne({ userId, isActive: true });
};

/**
 * 静态方法：查询用户的所有模板（包括私有和系统模板）
 */
PromptTemplateSchema.statics.findByUser = function (
  userId: mongoose.Types.ObjectId
): Promise<IPromptTemplate[]> {
  return this.find({
    $or: [
      { userId },                    // 用户自己的模板
      { visibility: 'system' },      // 系统模板
    ],
  }).sort({ isActive: -1, updatedAt: -1 });
};

/**
 * 静态方法：查询公开模板（Prompt 广场）
 */
PromptTemplateSchema.statics.findPublicTemplates = function (
  options: { limit?: number; skip?: number } = {}
): Promise<IPromptTemplate[]> {
  const { limit = 20, skip = 0 } = options;
  return this.find({ visibility: 'public' })
    .sort({ usageCount: -1, likeCount: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * 静态方法：查询系统模板
 */
PromptTemplateSchema.statics.findSystemTemplates = function (): Promise<IPromptTemplate[]> {
  return this.find({ visibility: 'system' }).sort({ name: 1 });
};

/**
 * 实例方法：增加使用次数
 */
PromptTemplateSchema.methods.incrementUsage = function (): Promise<IPromptTemplate> {
  this.usageCount += 1;
  return this.save();
};

/**
 * Prompt 模板模型
 */
export const PromptTemplate = mongoose.model<IPromptTemplate, IPromptTemplateModel>(
  'PromptTemplate',
  PromptTemplateSchema
);
