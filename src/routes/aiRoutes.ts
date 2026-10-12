import { Router } from 'express';
import { askAssistant } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(protect);
router.post('/chat', authorize('student'), askAssistant);

export default router;
