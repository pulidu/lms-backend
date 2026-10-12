import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { generatePdfReport } from '../services/pdfService.js';
import { generateExcelReport } from '../services/excelService.js';
import { StudentProfile } from '../models/Profiles.js';
import { Attendance, Mark, Course } from '../models/Academics.js';
import { User } from '../models/User.js';

// Get PDF Academic Report
export const downloadAcademicReportPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const studentName = `${req.user?.firstName} ${req.user?.lastName}`;
    const profile = await StudentProfile.findOne({ userId: studentId });
    const marks = await Mark.find({ studentId }).populate('subjectId').populate('examId');

    const headers = ['Subject Code', 'Subject Name', 'Exam/Assessment', 'Marks Obtained', 'Grade'];
    const rows = marks.map((m: any) => [
      m.subjectId?.code || 'N/A',
      m.subjectId?.name || 'N/A',
      m.examId?.title || 'N/A',
      m.marksObtained.toString(),
      m.grade,
    ]);

    const pdfBuffer = await generatePdfReport({
      title: 'Student Academic Transcript',
      subtitle: `Official record for student: ${studentName}`,
      summaryFields: [
        { label: 'Registration No', value: profile?.registrationNumber || 'N/A' },
        { label: 'Cumulative GPA', value: (profile?.currentGPA || 0).toFixed(2) },
        { label: 'Total Credits Earned', value: (profile?.totalCredits || 0).toString() },
      ],
      headers,
      rows,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="academic_report.pdf"');
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get PDF Attendance Report
export const downloadAttendanceReportPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const studentName = `${req.user?.firstName} ${req.user?.lastName}`;
    const attendance = await Attendance.find({ studentId }).populate('subjectId');

    const headers = ['Date', 'Subject Code', 'Subject Name', 'Status'];
    const rows = attendance.map((a: any) => [
      new Date(a.date).toLocaleDateString(),
      a.subjectId?.code || 'N/A',
      a.subjectId?.name || 'N/A',
      a.status.toUpperCase(),
    ]);

    const presentCount = attendance.filter((a) => a.status === 'present').length;
    const absentCount = attendance.filter((a) => a.status === 'absent').length;
    const rate = attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(1) : '100';

    const pdfBuffer = await generatePdfReport({
      title: 'Student Attendance Report',
      subtitle: `Roster logs for student: ${studentName}`,
      summaryFields: [
        { label: 'Total Classes Scheduled', value: attendance.length.toString() },
        { label: 'Present Days', value: presentCount.toString() },
        { label: 'Attendance Ratio', value: `${rate}%` },
      ],
      headers,
      rows,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.pdf"');
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get Excel Student Marks Report (Staff / Admin can download)
export const exportMarksExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId } = req.params;
    const marks = await Mark.find({ subjectId })
      .populate('studentId', 'firstName lastName email')
      .populate('examId', 'title totalMarks');

    const headers = ['Student Name', 'Email', 'Exam Title', 'Max Marks', 'Marks Obtained', 'Grade'];
    const rows = marks.map((m: any) => [
      `${m.studentId?.firstName || ''} ${m.studentId?.lastName || ''}`,
      m.studentId?.email || '',
      m.examId?.title || '',
      m.examId?.totalMarks?.toString() || '100',
      m.marksObtained.toString(),
      m.grade,
    ]);

    const excelBuffer = await generateExcelReport({
      sheetName: 'Subject Grades',
      title: 'Subject Academic Grading Sheets',
      headers,
      rows,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="grades_report.xlsx"');
    res.send(excelBuffer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
