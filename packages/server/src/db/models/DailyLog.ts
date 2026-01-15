/**
 * 每日记录模型
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 每日记录文档接口
 */
export interface IDailyLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string;        // 格式: "2024-12-23"
  dayOfWeek: string;   // 格式: "周一"
  plan: string;
  result: string;
  issues: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 每日记录模型静态方法接口
 */
export interface IDailyLogModel extends Model<IDailyLog> {
  findByUserAndDate(userId: mongoose.Types.ObjectId, date: string): Promise<IDailyLog | null>;
  findByUserAndDateRange(
    userId: mongoose.Types.ObjectId,
    startDate: string,
    endDate: string
  ): Promise<IDailyLog[]>;
}

/**
 * 每日记录 Schema
 */
const DailyLogSchema = new Schema<IDailyLog, IDailyLogModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID不能为空'],
      index: true,
    },
    date: {
      type: String,
      required: [true, '日期不能为空'],
      match: [/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'],
    },
    dayOfWeek: {
      type: String,
      required: [true, '星期不能为空'],
      enum: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    plan: {
      type: String,
      default: '',
    },
    result: {
      type: String,
      default: '',
    },
    issues: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 复合唯一索引：一个用户一天只能有一条记录
 */
DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

/**
 * 查询索引：按用户和日期范围查询
 */
DailyLogSchema.index({ userId: 1, date: -1 });

/**
 * 静态方法：通过用户ID和日期查找记录
 */
DailyLogSchema.statics.findByUserAndDate = function (
  userId: mongoose.Types.ObjectId,
  date: string
): Promise<IDailyLog | null> {
  return this.findOne({ userId, date });
};

/**
 * 静态方法：查询用户指定时间段的所有记录
 */
DailyLogSchema.statics.findByUserAndDateRange = function (
  userId: mongoose.Types.ObjectId,
  startDate: string,
  endDate: string
): Promise<IDailyLog[]> {
  return this.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });
};

/**
 * 实例方法：检查是否有内容
 */
DailyLogSchema.methods.hasContent = function (): boolean {
  return !!(
    this.plan.trim() ||
    this.result.trim() ||
    this.issues.trim() ||
    this.notes.trim()
  );
};

/**
 * 每日记录模型
 */
export const DailyLog = mongoose.model<IDailyLog, IDailyLogModel>('DailyLog', DailyLogSchema);
