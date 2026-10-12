import { Router } from 'express';
import {
  createAnnouncement,
  getAnnouncements,
  createTimetable,
  getTimetables,
  createPayment,
  getPayments,
  getMyNotifications,
  markNotificationAsRead,
  getAllUsers,
  updateUserStatus,
  updateUser,
} from '../controllers/noticeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(protect);

// Announcement Routes
router.post('/announcements', authorize('admin', 'staff', 'lecturer'), createAnnouncement);
router.get('/announcements', getAnnouncements);

// Timetable Routes
router.post('/timetables', authorize('admin', 'staff', 'lecturer'), createTimetable);
router.get('/timetables/course/:courseId', getTimetables);

// Payment Routes
router.post('/payments', authorize('admin'), createPayment);
router.get('/payments/student/:studentId', getPayments);

// Notification Routes
router.get('/notifications/my', getMyNotifications);
router.put('/notifications/read/:id', markNotificationAsRead);

// User Status Management (Admin, Staff & Lecturer)
router.get('/users/all', authorize('admin', 'staff', 'lecturer'), getAllUsers);
router.put('/users/status/:userId', authorize('admin', 'staff'), updateUserStatus);
router.put('/users/edit/:userId', authorize('admin', 'staff'), updateUser);

export default router;
