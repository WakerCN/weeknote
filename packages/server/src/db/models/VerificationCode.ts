/**
 * 验证码模型
 * 用于邮箱验证码登录和密码重置
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 验证码类型
 */
export type VerificationCodeType = 'login' | 'reset' | 'bind';

/**
 * 验证码文档接口
 */
export interface IVerificationCode extends Document {
  email: string;
  code: string;
  type: VerificationCodeType;
  expiresAt: Date;
  used: boolean;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 验证码模型静态方法接口
 */
export interface IVerificationCodeModel extends Model<IVerificationCode> {
  /**
   * 查找有效的验证码
   */
  findValidCode(
    email: string,
    type: VerificationCodeType
  ): Promise<IVerificationCode | null>;

  /**
   * 检查是否在冷却期内（60秒）
   */
  isInCooldown(email: string, type: VerificationCodeType): Promise<{
    inCooldown: boolean;
    retryAfter?: number;
  }>;
}

/**
 * 验证码 Schema
 */
const VerificationCodeSchema = new Schema<IVerificationCode, IVerificationCodeModel>(
  {
    email: {
      type: String,
      required: [true, '邮箱不能为空'],
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, '验证码不能为空'],
    },
    type: {
      type: String,
      enum: ['login', 'reset', 'bind'],
      required: [true, '验证码类型不能为空'],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL 索引，自动删除过期记录
    },
    used: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 索引
 */
VerificationCodeSchema.index({ email: 1, type: 1, createdAt: -1 });

/**
 * 静态方法：查找有效的验证码
 */
VerificationCodeSchema.statics.findValidCode = function (
  email: string,
  type: VerificationCodeType
): Promise<IVerificationCode | null> {
  return this.findOne({
    email: email.toLowerCase(),
    type,
    used: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

/**
 * 静态方法：检查是否在冷却期内
 */
VerificationCodeSchema.statics.isInCooldown = async function (
  email: string,
  type: VerificationCodeType
): Promise<{ inCooldown: boolean; retryAfter?: number }> {
  const cooldownMs = 60 * 1000; // 60秒冷却期
  const recentCode = await this.findOne({
    email: email.toLowerCase(),
    type,
    createdAt: { $gt: new Date(Date.now() - cooldownMs) },
  }).sort({ createdAt: -1 });

  if (recentCode) {
    const retryAfter = Math.ceil(
      (recentCode.createdAt.getTime() + cooldownMs - Date.now()) / 1000
    );
    return { inCooldown: true, retryAfter };
  }

  return { inCooldown: false };
};

/**
 * 验证码模型
 */
export const VerificationCode = mongoose.model<IVerificationCode, IVerificationCodeModel>(
  'VerificationCode',
  VerificationCodeSchema
);
