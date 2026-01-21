/**
 * 用户模型
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * API Keys 类型
 */
export interface IApiKeys {
  siliconflow?: string;
  deepseek?: string;
  openai?: string;
  doubao?: string;
}

/**
 * 用户配置类型
 */
export interface IUserConfig {
  defaultModel?: string;
  apiKeys?: IApiKeys;
  doubaoEndpoint?: string;
  reminderConfig?: Record<string, unknown>;
}

/**
 * 登录方式类型
 */
export type LoginMethod = 'password' | 'code';

/**
 * 用户文档接口
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string; // 可选：验证码登录用户可以没有密码
  name: string;
  avatar?: string;
  config: IUserConfig;
  loginMethod?: LoginMethod; // 记录注册方式
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * 用户模型静态方法接口
 */
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

/**
 * 用户配置 Schema
 */
const UserConfigSchema = new Schema<IUserConfig>(
  {
    defaultModel: { type: String },
    apiKeys: {
      siliconflow: { type: String },
      deepseek: { type: String },
      openai: { type: String },
      doubao: { type: String },
    },
    doubaoEndpoint: { type: String },
    reminderConfig: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * 用户 Schema
 */
const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, '邮箱不能为空'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, '邮箱格式不正确'],
    },
    passwordHash: {
      type: String,
      required: false, // 改为可选：验证码登录用户可以没有密码
    },
    name: {
      type: String,
      required: [true, '用户名不能为空'],
      trim: true,
      minlength: [1, '用户名至少1个字符'],
      maxlength: [50, '用户名最多50个字符'],
    },
    avatar: {
      type: String,
    },
    config: {
      type: UserConfigSchema,
      default: () => ({}),
    },
    lastLoginAt: {
      type: Date,
    },
    loginMethod: {
      type: String,
      enum: ['password', 'code'],
      default: 'password',
    },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

/**
 * 索引
 */
UserSchema.index({ email: 1 }, { unique: true });

/**
 * 静态方法：通过邮箱查找用户
 */
UserSchema.statics.findByEmail = function (email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * 实例方法：转换为 JSON 时隐藏敏感字段
 */
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  // 隐藏 API Keys 的具体值
  if (obj.config?.apiKeys) {
    const maskedKeys: IApiKeys = {};
    for (const [key, value] of Object.entries(obj.config.apiKeys)) {
      if (value) {
        maskedKeys[key as keyof IApiKeys] = '******';
      }
    }
    obj.config.apiKeys = maskedKeys;
  }
  return obj;
};

/**
 * 用户模型
 */
export const User = mongoose.model<IUser, IUserModel>('User', UserSchema);
