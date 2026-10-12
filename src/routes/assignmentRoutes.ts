import { Router } from 'express';
import {
  createAssignment,
  getAssignmentsBySubject,
  downloadAssignmentAttachment,
  submitAssignment,
  getAssignmentSubmissions,
  downloadSubmissionAttachment,
  gradeSubmission,
} from '../controllers/assignmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(protect);

router.post('/assignments', authorize('admin', 'staff', 'lecturer'), upload.single('attachment'), createAssignment);
router.get('/assignments/subject/:subjectId', getAssignmentsBySubject);
router.get('/assignments/download/:id', downloadAssignmentAttachment);

router.post('/submissions', authorize('student'), upload.single('attachment'), submitAssignment);
router.get('/submissions/assignment/:assignmentId', authorize('admin', 'staff', 'lecturer'), getAssignmentSubmissions);
router.get('/submissions/download/:id', authorize('admin', 'staff', 'lecturer'), downloadSubmissionAttachment);
router.put('/submissions/grade/:submissionId', authorize('admin', 'staff', 'lecturer'), gradeSubmission);

export default router;
