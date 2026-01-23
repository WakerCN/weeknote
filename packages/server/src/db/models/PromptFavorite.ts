/**
 * Prompt 模板收藏模型
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 收藏文档接口
 */
export interface IPromptFavorite extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;       // 收藏者
  templateId: mongoose.Types.ObjectId;   // 被收藏的模板
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 收藏模型静态方法接口
 */
export interface IPromptFavoriteModel extends Model<IPromptFavorite> {
  /**
   * 检查用户是否已收藏某模板
   */
  isFavorited(userId: mongoose.Types.ObjectId, templateId: mongoose.Types.ObjectId): Promise<boolean>;

  /**
   * 获取用户收藏的模板 ID 列表
   */
  getFavoriteIds(userId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]>;

  /**
   * 获取模板的收藏数量
   */
  getFavoriteCount(templateId: mongoose.Types.ObjectId): Promise<number>;
}

/**
 * 收藏 Schema
 */
const PromptFavoriteSchema = new Schema<IPromptFavorite, IPromptFavoriteModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户 ID 不能为空'],
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'PromptTemplate',
      required: [true, '模板 ID 不能为空'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 联合唯一索引：一个用户只能收藏一个模板一次
 */
PromptFavoriteSchema.index({ userId: 1, templateId: 1 }, { unique: true });

/**
 * 静态方法：检查用户是否已收藏某模板
 */
PromptFavoriteSchema.statics.isFavorited = async function (
  userId: mongoose.Types.ObjectId,
  templateId: mongoose.Types.ObjectId
): Promise<boolean> {
  const favorite = await this.findOne({ userId, templateId });
  return !!favorite;
};

/**
 * 静态方法：获取用户收藏的模板 ID 列表
 */
PromptFavoriteSchema.statics.getFavoriteIds = async function (
  userId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  const favorites = await this.find({ userId }).select('templateId');
  return favorites.map((f: IPromptFavorite) => f.templateId);
};

/**
 * 静态方法：获取模板的收藏数量
 */
PromptFavoriteSchema.statics.getFavoriteCount = async function (
  templateId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({ templateId });
};

/**
 * Prompt 收藏模型
 */
export const PromptFavorite = mongoose.model<IPromptFavorite, IPromptFavoriteModel>(
  'PromptFavorite',
  PromptFavoriteSchema
);
