import mongoose, { Schema, Document } from 'mongoose';

// Assignment Schema & Interface
export interface IAssignment extends Document {
  title: string;
  description: string;
  subjectId: mongoose.Types.ObjectId; // Subject
  dueDate: Date;
  maxMarks: number;
  attachment?: {
    data: Buffer;
    fileName: string;
    contentType: string;
  };
  createdBy: mongoose.Types.ObjectId; // User
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, required: true, default: 100 },
    attachment: {
      data: Buffer,
      fileName: String,
      contentType: String,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);

// AssignmentSubmission Schema & Interface
export interface IAssignmentSubmission extends Document {
  assignmentId: mongoose.Types.ObjectId; // Assignment
  studentId: mongoose.Types.ObjectId; // User
  submissionDate: Date;
  submissionText?: string;
  attachment?: {
    data: Buffer;
    fileName: string;
    contentType: string;
  };
  marksObtained?: number;
  grade?: string;
  feedback?: string;
  status: 'submitted' | 'graded' | 'late';
  gradedBy?: mongoose.Types.ObjectId; // User
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submissionDate: { type: Date, default: Date.now },
    submissionText: { type: String },
    attachment: {
      data: Buffer,
      fileName: String,
      contentType: String,
    },
    marksObtained: { type: Number },
    grade: { type: String },
    feedback: { type: String },
    status: { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const AssignmentSubmission = mongoose.model<IAssignmentSubmission>(
  'AssignmentSubmission',
  AssignmentSubmissionSchema
);
