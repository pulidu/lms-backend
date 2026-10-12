import { Router } from 'express';
import {
  updateUserStatus,
  getAllUsers,
  updateUser,
  deleteUser,
} from '../controllers/noticeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(protect);

// Status route: PATCH /api/users/:id/status and PUT /api/users/:id/status
router.patch('/:id/status', authorize('admin', 'staff'), updateUserStatus);
router.put('/:id/status', authorize('admin', 'staff'), updateUserStatus);

// Admin-only user deletion: DELETE /api/users/:id
router.delete('/:id', authorize('admin'), deleteUser);

// User lists & editing
router.get('/all', authorize('admin', 'staff', 'lecturer'), getAllUsers);
router.put('/edit/:userId', authorize('admin', 'staff'), updateUser);

export default router;
