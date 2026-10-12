import mongoose, { Schema, Document } from 'mongoose';

// User Schema & Interface
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: 'admin' | 'staff' | 'student' | 'lecturer';
  profileImage?: {
    data: Buffer;
    contentType: string;
  };
  phone?: string;
  address?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: Date;
  status: 'pending' | 'active' | 'suspended' | 'disabled';
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['admin', 'staff', 'student', 'lecturer'], required: true },
    profileImage: {
      data: Buffer,
      contentType: String,
    },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'disabled'],
      default: 'pending',
    },
    isEmailVerified: { type: Boolean, default: false },
    isFirstLogin: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

// EmailVerification Schema & Interface
export interface IEmailVerification extends Document {
  userId: mongoose.Types.ObjectId;
  verificationToken: string;
  expiresAt: Date;
  isVerified: boolean;
  createdAt: Date;
}

const EmailVerificationSchema = new Schema<IEmailVerification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verificationToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const EmailVerification = mongoose.model<IEmailVerification>(
  'EmailVerification',
  EmailVerificationSchema
);
