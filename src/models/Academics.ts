import mongoose, { Schema, Document } from 'mongoose';

// Subject Schema & Interface
export interface ISubject extends Document {
  code: string;
  name: string;
  description?: string;
  credits: number;
  department: string;
  lecturerId: mongoose.Types.ObjectId; // User (role: staff)
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    credits: { type: Number, required: true, min: 1 },
    department: { type: String, required: true, default: 'Computer Science', trim: true },
    lecturerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);

// Course Schema & Interface
export interface ICourse extends Document {
  code: string;
  name: string;
  description?: string;
  durationMonths: number;
  department: string;
  subjects: mongoose.Types.ObjectId[]; // Ref to Subjects
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    durationMonths: { type: Number, required: true },
    department: { type: String, required: true, trim: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>('Course', CourseSchema);

// Batch Schema & Interface
export interface IBatch extends Document {
  name: string;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  intake: string;
  courseId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    intake: { type: String, required: true, trim: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  },
  { timestamps: true }
);

export const Batch = mongoose.model<IBatch>('Batch', BatchSchema);

// Enrollment Schema & Interface
export interface IEnrollment extends Document {
  studentId: mongoose.Types.ObjectId; // User (role: student)
  courseId: mongoose.Types.ObjectId; // Course
  batchId?: mongoose.Types.ObjectId; // Batch (optional for fallback/legacy seeds)
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique compound index so a student can't enroll in the same course and batch twice
EnrollmentSchema.index({ studentId: 1, courseId: 1, batchId: 1 }, { unique: true });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

// Attendance Schema & Interface
export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId; // User
  subjectId: mongoose.Types.ObjectId; // Subject
  date: Date;
  status: 'present' | 'absent' | 'late';
  checkedBy: mongoose.Types.ObjectId; // User (role: staff/admin)
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    checkedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

// Exam Schema & Interface
export interface IExam extends Document {
  subjectId: mongoose.Types.ObjectId; // Subject
  title: string;
  type: 'midterm' | 'final' | 'quiz' | 'assignment';
  date: Date;
  totalMarks: number;
  weightage: number; // percentage of final grade, e.g. 30
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['midterm', 'final', 'quiz', 'assignment'], required: true },
    date: { type: Date, required: true },
    totalMarks: { type: Number, required: true, default: 100 },
    weightage: { type: Number, required: true, default: 100 },
  },
  { timestamps: true }
);

export const Exam = mongoose.model<IExam>('Exam', ExamSchema);

// Mark Schema & Interface
export interface IMark extends Document {
  studentId: mongoose.Types.ObjectId; // User
  examId: mongoose.Types.ObjectId; // Exam
  subjectId: mongoose.Types.ObjectId; // Subject
  marksObtained: number;
  grade: string;
  remarks?: string;
  gradedBy: mongoose.Types.ObjectId; // User
  createdAt: Date;
  updatedAt: Date;
}

const MarkSchema = new Schema<IMark>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    grade: { type: String, required: true },
    remarks: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Mark = mongoose.model<IMark>('Mark', MarkSchema);
