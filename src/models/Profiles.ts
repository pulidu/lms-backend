import mongoose, { Schema, Document } from 'mongoose';

// Student Profile Interface & Schema
export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  registrationNumber: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  academicYear: string;
  semester: number;
  currentGPA: number;
  totalCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    registrationNumber: { type: String, required: true, unique: true, trim: true },
    guardianName: { type: String, required: true, trim: true },
    guardianPhone: { type: String, required: true, trim: true },
    guardianEmail: { type: String, trim: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, default: 1 },
    currentGPA: { type: Number, default: 0.0 },
    totalCredits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);

// Staff Profile Interface & Schema
export interface IStaffProfile extends Document {
  userId: mongoose.Types.ObjectId;
  staffId: string;
  department: string;
  designation: string;
  qualifications: string[];
  joinedDate: Date;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffProfileSchema = new Schema<IStaffProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    staffId: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    joinedDate: { type: Date, default: Date.now },
    bio: { type: String },
  },
  { timestamps: true }
);

export const StaffProfile = mongoose.model<IStaffProfile>('StaffProfile', StaffProfileSchema);
