import { Router } from 'express';
import {
  login,
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  getProfile,
  updateProfile,
  getProfileImage,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.get('/profile-image/:userId', getProfileImage);

// Protected routes
router.use(protect);
router.post('/register', authorize('admin', 'staff'), registerUser);
router.put('/change-password', changePassword);
router.get('/profile', getProfile);
router.put('/profile', upload.single('profileImage'), updateProfile);

export default router;
