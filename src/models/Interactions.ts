import mongoose, { Schema, Document } from 'mongoose';

// Notice & Announcement Interface & Schema
export interface INotice extends Document {
  title: string;
  content: string;
  targetRole: 'all' | 'staff' | 'student';
  createdBy: mongoose.Types.ObjectId; // User
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    targetRole: { type: String, enum: ['all', 'staff', 'student'], default: 'all' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Notice = mongoose.model<INotice>('Notice', NoticeSchema);

// Announcement Schema & Interface
export interface IAnnouncement extends Document {
  title: string;
  content: string;
  createdBy: mongoose.Types.ObjectId; // User
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

// Notification Schema & Interface
export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId; // User
  title: string;
  message: string;
  type: 'assignment' | 'marks' | 'attendance' | 'enrollment' | 'general' | 'announcement';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['assignment', 'marks', 'attendance', 'enrollment', 'general', 'announcement'],
      required: true,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// ChatHistory (for Gemini AI Assistant)
export interface IChatMessage {
  sender: 'student' | 'ai';
  text: string;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  studentId: mongoose.Types.ObjectId; // User
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatHistorySchema = new Schema<IChatHistory>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [
      {
        sender: { type: String, enum: ['student', 'ai'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
