import { Response } from 'express';
import mongoose from 'mongoose';
import { Course, Subject, Enrollment, Attendance, Exam, Mark, Batch } from '../models/Academics.js';
import { StudentProfile } from '../models/Profiles.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../types/index.js';
import { sendEmail, getEmailTemplate } from '../services/emailService.js';

// --- COURSE MANAGEMENT (Admin only write, all read) ---
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, name, description, durationMonths, department, subjects } = req.body;
    const course = await Course.create({ code, name, description, durationMonths, department, subjects });
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await Course.find().populate('subjects');
    res.status(200).json(courses);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id).populate('subjects');
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    res.status(200).json(course);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    res.status(200).json({ message: 'Course updated successfully', course });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const sendCourseEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { subject, body } = req.body;

    const course = await Course.findById(courseId).populate('subjects');
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Get all enrolled students
    const enrollments = await Enrollment.find({ courseId }).populate('studentId');
    const studentEmails = enrollments
      .map((e: any) => e.studentId?.email)
      .filter((email) => !!email);

    // Get all lecturers teaching subjects in this course
    const lecturerIds = course.subjects.map((s: any) => s.lecturerId).filter(id => !!id);
    const lecturers = await User.find({ _id: { $in: lecturerIds } });
    const lecturerEmails = lecturers.map((l: any) => l.email);

    const recipientEmails = Array.from(new Set([...studentEmails, ...lecturerEmails]));

    if (recipientEmails.length === 0) {
      res.status(400).json({ message: 'No students or lecturers found for this course' });
      return;
    }

    // Send emails
    for (const email of recipientEmails) {
      await sendEmail(
        email, 
        subject, 
        `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Course Notice: ${course.name} (${course.code})</h2>
          <p style="color: #334155; line-height: 1.6; font-size: 14px;">${body}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <small style="color: #94a3b8;">This is an automated course notice from LMS Classroom.</small>
        </div>`
      );
    }

    res.status(200).json({ message: `Emails sent successfully to ${recipientEmails.length} recipients` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, name, description, credits, lecturerId, courseId, department } = req.body;
    
    if (lecturerId) {
      const lecturer = await User.findById(lecturerId);
      if (!lecturer || !['staff', 'lecturer'].includes(lecturer.role)) {
        res.status(400).json({ message: 'Assigned Lecturer must be a valid staff or lecturer member' });
        return;
      }
    }

    const subject = await Subject.create({ code, name, description, credits, lecturerId, department });
    if (courseId) {
      await Course.findByIdAndUpdate(courseId, { $push: { subjects: subject._id } });
    }
    res.status(201).json({ message: 'Subject created successfully', subject });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.query;
    const user = req.user;

    if (courseId && mongoose.Types.ObjectId.isValid(courseId as string)) {
      const course = await Course.findById(courseId).populate({
        path: 'subjects',
        populate: { path: 'lecturerId', select: 'firstName lastName email' }
      });
      res.status(200).json(course ? course.subjects : []);
      return;
    }

    if (user) {
      if (user.role === 'student') {
        const enrollment = await Enrollment.findOne({ studentId: user._id });
        if (enrollment) {
          const course = await Course.findById(enrollment.courseId).populate({
            path: 'subjects',
            populate: { path: 'lecturerId', select: 'firstName lastName email' }
          });
          res.status(200).json(course ? course.subjects : []);
          return;
        }
        res.status(200).json([]);
        return;
      }

      if (user.role === 'staff') {
        let subjects = await Subject.find({
          $or: [
            { lecturerId: user._id },
            { lecturerId: new mongoose.Types.ObjectId(user._id.toString()) }
          ]
        }).populate('lecturerId', 'firstName lastName email');

        if (subjects.length === 0) {
          subjects = await Subject.find().populate('lecturerId', 'firstName lastName email');
        }

        res.status(200).json(subjects);
        return;
      }
    }

    const subjects = await Subject.find().populate('lecturerId', 'firstName lastName email');
    res.status(200).json(subjects);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lecturerId } = req.body;
    if (lecturerId) {
      const lecturer = await User.findById(lecturerId);
      if (!lecturer || !['staff', 'lecturer'].includes(lecturer.role)) {
        res.status(400).json({ message: 'Assigned Lecturer must be a valid staff or lecturer member' });
        return;
      }
    }

    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    res.status(200).json({ message: 'Subject updated successfully', subject });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const enrollStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, courseId, batchId } = req.body;
    let targetStudentId = studentId;

    if (req.user?.role === 'student') {
      targetStudentId = req.user._id;
    }

    if (!targetStudentId) {
      res.status(400).json({ message: 'Student ID is required' });
      return;
    }

    const student = await User.findById(targetStudentId);
    if (!student || student.role !== 'student') {
      res.status(400).json({ message: 'User is not a valid student' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    if (batchId) {
      const batchObj = await Batch.findById(batchId);
      if (!batchObj) {
        res.status(404).json({ message: 'Batch not found' });
        return;
      }
    }

    const existingEnrollment = await Enrollment.findOne({ studentId: targetStudentId, courseId, batchId });
    if (existingEnrollment) {
      res.status(400).json({ message: 'Already enrolled in this course and batch' });
      return;
    }

    const enrollment = await Enrollment.create({ studentId: targetStudentId, courseId, batchId });
    res.status(201).json({ message: 'Student enrolled in course successfully', enrollment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getStudentEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const enrollments = await Enrollment.find({ studentId }).populate('courseId').populate('batchId');
    res.status(200).json(enrollments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, academicYear, startDate, endDate, intake, courseId } = req.body;
    
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    const batch = await Batch.create({
      name,
      academicYear,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      intake,
      courseId,
    });

    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getBatchesByCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const batches = await Batch.find({ courseId }).sort({ createdAt: -1 });
    res.status(200).json(batches);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const batch = await Batch.findByIdAndUpdate(id, req.body, { new: true });
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }
    res.status(200).json({ message: 'Batch updated successfully', batch });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getStudentsByCourseAndBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId, batchId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(batchId)) {
      res.status(400).json({ message: 'Invalid course or batch ID' });
      return;
    }

    const enrollments = await Enrollment.find({ courseId, batchId }).populate('studentId');
    
    const enrolledStudents = enrollments
      .map((e: any) => ({
        _id: e.studentId?._id,
        firstName: e.studentId?.firstName,
        lastName: e.studentId?.lastName,
        email: e.studentId?.email,
        enrollmentId: e._id,
      }))
      .filter((s: any) => !!s._id);

    const enrolledIds = enrolledStudents.map((s: any) => s._id);

    const allStudents = await User.find({ role: 'student', status: 'active' });
    const availableStudents = allStudents.filter(
      (s) => !enrolledIds.some((id) => id.toString() === s._id.toString())
    );

    res.status(200).json({ enrolledStudents, availableStudents });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const removeEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const enrollment = await Enrollment.findByIdAndDelete(id);
    if (!enrollment) {
      res.status(404).json({ message: 'Enrollment not found' });
      return;
    }
    res.status(200).json({ message: 'Student removed from course enrollment successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getStudentsBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      res.status(400).json({ message: 'Invalid subject ID' });
      return;
    }

    const course = await Course.findOne({ subjects: subjectId });
    if (!course) {
      res.status(250).json([]); // Return empty list instead of 404 so UI doesn't break if subject is newly created
      return;
    }

    const enrollments = await Enrollment.find({ courseId: course._id, status: 'active' }).populate('studentId');
    const students = enrollments
      .map((e: any) => e.studentId)
      .filter((s: any) => !!s && s.role === 'student');

    res.status(200).json(students);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// --- ATTENDANCE MANAGEMENT (Staff checks, Student/Staff read) ---
export const logAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, subjectId, date, status } = req.body;
    const checkedBy = req.user?._id;

    if (!checkedBy) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Check if attendance already exists for this date and student/subject
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let attendance = await Attendance.findOne({
      studentId,
      subjectId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (attendance) {
      attendance.status = status;
      attendance.checkedBy = checkedBy;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        studentId,
        subjectId,
        date: new Date(date),
        status,
        checkedBy,
      });
    }

    // Attendance Warning triggers if percentage falls below 75%
    if (status === 'absent') {
      const student = await User.findById(studentId);
      const subject = await Subject.findById(subjectId);
      if (student && subject) {
        const totalClasses = await Attendance.countDocuments({ studentId, subjectId });
        const attended = await Attendance.countDocuments({
          studentId,
          subjectId,
          status: { $in: ['present', 'late'] },
        });
        const percentage = totalClasses > 0 ? (attended / totalClasses) * 100 : 100;
        
        if (percentage < 75) {
          const warningTemplate = getEmailTemplate('attendanceWarning', {
            name: `${student.firstName} ${student.lastName}`,
            subjectName: subject.name,
            percentage: percentage.toFixed(1),
          });
          await sendEmail(student.email, warningTemplate.subject, warningTemplate.html);
        }
      }
    }

    res.status(200).json({ message: 'Attendance recorded successfully', attendance });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getAttendanceBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId } = req.params;
    const { date } = req.query;

    const query: any = { subjectId };
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const attendance = await Attendance.find(query).populate('studentId', 'firstName lastName email');
    res.status(200).json(attendance);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const attendance = await Attendance.find({ studentId }).populate('subjectId', 'code name');
    res.status(200).json(attendance);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// --- GRADING / MARKS MANAGEMENT (Staff writes, Student reads) ---
export const createExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId, title, type, date, totalMarks, weightage } = req.body;
    const exam = await Exam.create({ subjectId, title, type, date, totalMarks, weightage });
    res.status(201).json({ message: 'Exam entry created successfully', exam });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getExamsBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId } = req.params;
    const exams = await Exam.find({ subjectId });
    res.status(200).json(exams);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Calculate Grade Helper
const calculateGrade = (marks: number, total: number): string => {
  const percent = (marks / total) * 100;
  if (percent >= 85) return 'A+';
  if (percent >= 75) return 'A';
  if (percent >= 65) return 'B';
  if (percent >= 55) return 'C';
  if (percent >= 45) return 'D';
  return 'F';
};

export const publishResults = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, examId, subjectId, marksObtained, remarks } = req.body;
    const gradedBy = req.user?._id;

    if (!gradedBy) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      res.status(404).json({ message: 'Exam not found' });
      return;
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    const grade = calculateGrade(marksObtained, exam.totalMarks);

    let mark = await Mark.findOne({ studentId, examId });
    if (mark) {
      mark.marksObtained = marksObtained;
      mark.grade = grade;
      mark.remarks = remarks;
      mark.gradedBy = gradedBy;
      await mark.save();
    } else {
      mark = await Mark.create({
        studentId,
        examId,
        subjectId,
        marksObtained,
        grade,
        remarks,
        gradedBy,
      });
    }

    // Send email to student
    const student = await User.findById(studentId);
    if (student) {
      const template = getEmailTemplate('resultPublished', {
        name: `${student.firstName} ${student.lastName}`,
        subjectName: subject.name,
        subjectCode: subject.code,
        examTitle: exam.title,
        grade,
        marks: marksObtained,
        totalMarks: exam.totalMarks,
      });
      await sendEmail(student.email, template.subject, template.html);
    }

    // Recalculate GPA on StudentProfile
    await recalculateStudentGPA(studentId.toString());

    res.status(200).json({ message: 'Result published successfully', mark });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Recalculate GPA helper
const recalculateStudentGPA = async (studentId: string): Promise<void> => {
  const marks = await Mark.find({ studentId }).populate('examId');
  if (marks.length === 0) return;

  // Simple GPA calculation: A+=4.0, A=4.0, B=3.0, C=2.0, D=1.0, F=0.0
  let totalPoints = 0;
  marks.forEach((m: any) => {
    switch (m.grade) {
      case 'A+':
      case 'A':
        totalPoints += 4;
        break;
      case 'B':
        totalPoints += 3;
        break;
      case 'C':
        totalPoints += 2;
        break;
      case 'D':
        totalPoints += 1;
        break;
      default:
        totalPoints += 0;
    }
  });

  const averageGPA = totalPoints / marks.length;
  await StudentProfile.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(studentId) },
    { currentGPA: averageGPA, totalCredits: marks.length * 3 } // Mock credits per exam subject
  );
};

export const getMyMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const marks = await Mark.find({ studentId })
      .populate('subjectId', 'code name')
      .populate('examId', 'title type totalMarks weightage');
    res.status(200).json(marks);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getSubjectMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId } = req.params;
    const marks = await Mark.find({ subjectId })
      .populate('studentId', 'firstName lastName email')
      .populate('examId', 'title totalMarks');
    res.status(200).json(marks);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
