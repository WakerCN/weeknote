/**
 * Prompt 模板评论模型
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 评论文档接口
 */
export interface IPromptComment extends Document {
  _id: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;     // 所属模板
  userId: mongoose.Types.ObjectId;         // 评论者
  authorName: string;                      // 评论者昵称（快照）
  authorAvatar?: string;                   // 评论者头像（快照）
  content: string;                         // 评论内容
  parentId?: mongoose.Types.ObjectId;      // 父评论 ID（用于回复）
  likeCount: number;                       // 点赞数
  isDeleted: boolean;                      // 软删除标记
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 评论模型静态方法接口
 */
export interface IPromptCommentModel extends Model<IPromptComment> {
  /**
   * 获取模板的评论列表（支持分页，包含回复）
   */
  findByTemplate(
    templateId: mongoose.Types.ObjectId,
    options?: { limit?: number; skip?: number }
  ): Promise<IPromptComment[]>;

  /**
   * 获取模板的评论数量（不包含已删除的）
   */
  getCommentCount(templateId: mongoose.Types.ObjectId): Promise<number>;

  /**
   * 获取评论的回复列表
   */
  findReplies(commentId: mongoose.Types.ObjectId): Promise<IPromptComment[]>;
}

/**
 * 评论 Schema
 */
const PromptCommentSchema = new Schema<IPromptComment, IPromptCommentModel>(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'PromptTemplate',
      required: [true, '模板 ID 不能为空'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户 ID 不能为空'],
      index: true,
    },
    authorName: {
      type: String,
      required: [true, '作者名称不能为空'],
      trim: true,
      maxlength: [50, '作者名称最多 50 个字符'],
    },
    authorAvatar: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: [true, '评论内容不能为空'],
      trim: true,
      maxlength: [500, '评论内容最多 500 个字符'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'PromptComment',
      default: null,
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 索引：按模板查询评论（按时间倒序）
 */
PromptCommentSchema.index({ templateId: 1, isDeleted: 1, createdAt: -1 });

/**
 * 索引：查询回复
 */
PromptCommentSchema.index({ parentId: 1, isDeleted: 1, createdAt: 1 });

/**
 * 静态方法：获取模板的评论列表
 * 只获取顶级评论（parentId 为 null），回复需要单独获取
 */
PromptCommentSchema.statics.findByTemplate = async function (
  templateId: mongoose.Types.ObjectId,
  options: { limit?: number; skip?: number } = {}
): Promise<IPromptComment[]> {
  const { limit = 20, skip = 0 } = options;

  return this.find({
    templateId,
    parentId: null,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * 静态方法：获取模板的评论数量
 */
PromptCommentSchema.statics.getCommentCount = async function (
  templateId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    templateId,
    isDeleted: false,
  });
};

/**
 * 静态方法：获取评论的回复列表
 */
PromptCommentSchema.statics.findReplies = async function (
  commentId: mongoose.Types.ObjectId
): Promise<IPromptComment[]> {
  return this.find({
    parentId: commentId,
    isDeleted: false,
  }).sort({ createdAt: 1 });
};

/**
 * Prompt 评论模型
 */
export const PromptComment = mongoose.model<IPromptComment, IPromptCommentModel>(
  'PromptComment',
  PromptCommentSchema
);
