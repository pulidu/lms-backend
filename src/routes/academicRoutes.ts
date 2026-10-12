import { Router } from 'express';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  sendCourseEmail,
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
  enrollStudent,
  getStudentEnrollments,
  getStudentsBySubject,
  logAttendance,
  getAttendanceBySubject,
  getMyAttendance,
  createExam,
  getExamsBySubject,
  publishResults,
  getMyMarks,
  getSubjectMarks,
  createBatch,
  getBatchesByCourse,
  updateBatch,
  getStudentsByCourseAndBatch,
  removeEnrollment,
} from '../controllers/academicController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(protect);

// Course Routes
router.post('/courses', authorize('admin'), createCourse);
router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.put('/courses/:id', authorize('admin'), updateCourse);
router.delete('/courses/:id', authorize('admin'), deleteCourse);
router.post('/courses/:courseId/email', authorize('admin', 'staff', 'lecturer'), sendCourseEmail);

// Subject Routes
router.post('/subjects', authorize('admin'), createSubject);
router.get('/subjects', getSubjects);
router.put('/subjects/:id', authorize('admin'), updateSubject);
router.delete('/subjects/:id', authorize('admin'), deleteSubject);

// Batch Routes
router.post('/batches', authorize('admin', 'staff'), createBatch);
router.get('/courses/:courseId/batches', getBatchesByCourse);
router.put('/batches/:id', authorize('admin', 'staff'), updateBatch);

// Enrollment Routes
router.post('/enrollments', authorize('admin', 'staff', 'lecturer', 'student'), enrollStudent);
router.get('/enrollments/:studentId', getStudentEnrollments);
router.get('/enrollments/course/:courseId/batch/:batchId', authorize('admin', 'staff', 'lecturer'), getStudentsByCourseAndBatch);
router.delete('/enrollments/:id', authorize('admin', 'staff'), removeEnrollment);
router.get('/students/subject/:subjectId', authorize('admin', 'staff', 'lecturer'), getStudentsBySubject);

// Attendance Routes
router.post('/attendance', authorize('admin', 'staff', 'lecturer'), logAttendance);
router.get('/attendance/subject/:subjectId', authorize('admin', 'staff', 'lecturer'), getAttendanceBySubject);
router.get('/attendance/my', authorize('student'), getMyAttendance);

// Exam Routes
router.post('/exams', authorize('admin', 'staff', 'lecturer'), createExam);
router.get('/exams/subject/:subjectId', getExamsBySubject);

// Marks Routes
router.post('/marks/publish', authorize('admin', 'staff', 'lecturer'), publishResults);
router.get('/marks/my', authorize('student'), getMyMarks);
router.get('/marks/subject/:subjectId', authorize('admin', 'staff', 'lecturer'), getSubjectMarks);

export default router;
