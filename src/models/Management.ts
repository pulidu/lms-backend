import mongoose, { Schema, Document } from 'mongoose';

// Timetable Schema & Interface
export interface ITimetable extends Document {
  courseId: mongoose.Types.ObjectId; // Course
  batchId?: mongoose.Types.ObjectId; // Batch
  subjectId: mongoose.Types.ObjectId; // Subject
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "11:00"
  roomNumber: string;
  lecturerId: mongoose.Types.ObjectId; // User
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema = new Schema<ITimetable>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    roomNumber: { type: String, required: true },
    lecturerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Timetable = mongoose.model<ITimetable>('Timetable', TimetableSchema);

// Payment Schema & Interface
export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId; // User
  amount: number;
  paymentDate: Date;
  type: 'tuition' | 'exam' | 'admission' | 'other';
  status: 'pending' | 'completed' | 'failed';
  referenceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    type: { type: String, enum: ['tuition', 'exam', 'admission', 'other'], default: 'tuition' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    referenceId: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

// Certificate Schema & Interface
export interface ICertificate extends Document {
  studentId: mongoose.Types.ObjectId; // User
  courseId: mongoose.Types.ObjectId; // Course
  issueDate: Date;
  certificateNumber: string;
  grade: string;
  pdfData?: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    issueDate: { type: Date, default: Date.now },
    certificateNumber: { type: String, unique: true, required: true },
    grade: { type: String, required: true },
    pdfData: Buffer,
  },
  { timestamps: true }
);

export const Certificate = mongoose.model<ICertificate>('Certificate', CertificateSchema);

// Report Schema & Interface
export interface IReport extends Document {
  title: string;
  type: 'academic' | 'attendance' | 'finance' | 'system';
  generatedBy: mongoose.Types.ObjectId; // User
  data: string; // JSON String or description
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['academic', 'attendance', 'finance', 'system'], required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: String, required: true },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);

// ActivityLog Schema & Interface
export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId; // User
  action: string;
  ipAddress?: string;
  details?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    ipAddress: String,
    details: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
