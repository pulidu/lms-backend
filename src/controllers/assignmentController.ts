import { Response } from 'express';
import mongoose from 'mongoose';
import { Assignment, AssignmentSubmission } from '../models/Assignments.js';
import { Subject } from '../models/Academics.js';
import { AuthRequest } from '../types/index.js';

// Create Assignment (Staff only)
export const createAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, subjectId, dueDate, maxMarks } = req.body;
    const createdBy = req.user?._id;

    if (!createdBy) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const assignmentData: any = {
      title,
      description,
      subjectId,
      dueDate: new Date(dueDate),
      maxMarks: Number(maxMarks) || 100,
      createdBy,
    };

    if (req.file) {
      assignmentData.attachment = {
        data: req.file.buffer,
        fileName: req.file.originalname,
        contentType: req.file.mimetype,
      };
    }

    const assignment = await Assignment.create(assignmentData);
    res.status(201).json({ message: 'Assignment posted successfully', assignment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get Assignments by Subject
export const getAssignmentsBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId } = req.params;
    const assignments = await Assignment.find({ subjectId }).select('-attachment.data');
    res.status(200).json(assignments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Download Assignment Attachment
export const downloadAssignmentAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);

    if (!assignment || !assignment.attachment || !assignment.attachment.data) {
      res.status(404).json({ message: 'Attachment not found' });
      return;
    }

    res.setHeader('Content-Type', assignment.attachment.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.attachment.fileName}"`);
    res.send(assignment.attachment.data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Submit Assignment (Student only)
export const submitAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId, submissionText } = req.body;
    const studentId = req.user?._id;

    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    const isLate = new Date() > new Date(assignment.dueDate);

    const submissionData: any = {
      assignmentId,
      studentId,
      submissionText,
      submissionDate: new Date(),
      status: isLate ? 'late' : 'submitted',
    };

    if (req.file) {
      submissionData.attachment = {
        data: req.file.buffer,
        fileName: req.file.originalname,
        contentType: req.file.mimetype,
      };
    }

    // Check if student already submitted this assignment
    let submission = await AssignmentSubmission.findOne({ assignmentId, studentId });
    if (submission) {
      submission.submissionText = submissionText;
      submission.submissionDate = new Date();
      submission.status = isLate ? 'late' : 'submitted';
      if (req.file) {
        submission.attachment = submissionData.attachment;
      }
      await submission.save();
    } else {
      submission = await AssignmentSubmission.create(submissionData);
    }

    res.status(201).json({ message: 'Assignment submitted successfully', submission });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get Submissions for an Assignment (Staff only)
export const getAssignmentSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const submissions = await AssignmentSubmission.find({ assignmentId })
      .populate('studentId', 'firstName lastName email')
      .select('-attachment.data');
    res.status(200).json(submissions);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Download Submission Attachment (Staff only)
export const downloadSubmissionAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await AssignmentSubmission.findById(id);

    if (!submission || !submission.attachment || !submission.attachment.data) {
      res.status(404).json({ message: 'Attachment not found' });
      return;
    }

    res.setHeader('Content-Type', submission.attachment.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${submission.attachment.fileName}"`);
    res.send(submission.attachment.data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Grade Assignment Submission (Staff only)
export const gradeSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const { marksObtained, grade, feedback } = req.body;
    const gradedBy = req.user?._id;

    if (!gradedBy) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }

    submission.marksObtained = Number(marksObtained);
    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'graded';
    submission.gradedBy = gradedBy;

    await submission.save();
    res.status(200).json({ message: 'Submission graded successfully', submission });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
