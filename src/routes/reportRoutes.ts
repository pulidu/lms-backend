import { Router } from 'express';
import {
  downloadAcademicReportPdf,
  downloadAttendanceReportPdf,
  exportMarksExcel,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(protect);

router.get('/academic-pdf', authorize('student'), downloadAcademicReportPdf);
router.get('/attendance-pdf', authorize('student'), downloadAttendanceReportPdf);
router.get('/marks-excel/subject/:subjectId', authorize('admin', 'staff', 'lecturer'), exportMarksExcel);

export default router;
