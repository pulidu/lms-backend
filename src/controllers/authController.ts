import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, EmailVerification } from '../models/User.js';
import { StudentProfile, StaffProfile } from '../models/Profiles.js';
import { AuthRequest } from '../types/index.js';
import { sendEmail, getEmailTemplate } from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'lms_jwt_secret_token_key_for_auth_321';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lms_jwt_refresh_secret_token_key_for_auth_987';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Helper to generate JWT tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Helper to determine if Email OTP is required from environment variable
export const isEmailOtpRequired = (): boolean => {
  /* =========================================================================
   * TEMPORARILY DISABLED: Email Verification Code (OTP) functionality.
   * Kept safely commented out so it can be enabled again later.
   * =========================================================================
  const val = process.env.EMAIL_OTP_REQUIRED;
  if (val === undefined || val === null || val.trim() === '') {
    return true; // Default to true for security if missing
  }
  const normalized = val.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  return true; // Default to true for security if invalid
  ========================================================================= */
  return false;
};

// Safe public authentication configuration endpoint
export const getAuthConfig = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    emailOtpRequired: isEmailOtpRequired(),
  });
};

// Safe Admin Initialization Function
export const seedDefaultAdmin = async (): Promise<void> => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@lms.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (adminExists) {
      // Preserve existing admin account and password without overwriting
      console.log(`Admin account [${adminEmail}] is verified and active.`);
      return;
    }

    // In production, avoid creating arbitrary accounts without explicit approval/credentials
    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
      console.warn('Production notice: Default admin does not exist. Set ADMIN_EMAIL and ADMIN_PASSWORD to initialize.');
      return;
    }

    const initialPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(initialPassword, salt);

    await User.create({
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      isEmailVerified: true,
      isFirstLogin: true,
    });

    console.log(`Initial admin user created successfully: ${adminEmail}`);
  } catch (err) {
    console.error('Failed to verify or seed admin account:', err);
  }
};

// Login User
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Verify password first
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check account status
    if (user.status === 'inactive') {
      res.status(403).json({ message: 'Your account is inactive. Please contact administration.' });
      return;
    }

    if (user.status === 'pending') {
      res.status(403).json({ message: 'Your account is pending approval. Please wait for an administrator or staff member to activate your account.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ message: 'Your account is suspended. Contact administration.' });
      return;
    }

    if (user.status === 'disabled') {
      res.status(403).json({ message: 'Your account is disabled.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ message: `Account is ${user.status}. Access denied.` });
      return;
    }

    /* =========================================================================
     * TEMPORARILY DISABLED: Email Verification Code (OTP) generation during login.
     * Keep all code safely commented out so it can be enabled again later.
     * =========================================================================
    // Check if Email OTP verification is required for login
    const otpRequired = isEmailOtpRequired();

    if (otpRequired) {
      // Generate short 6-digit verification code
      const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();
      await EmailVerification.create({
        userId: user._id,
        verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // Send verification email
      const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const mailTemplate = getEmailTemplate('verifyEmail', {
        name: `${user.firstName} ${user.lastName}`,
        verifyUrl,
      });
      // Inject code directly in HTML template body
      mailTemplate.html = mailTemplate.html.replace(
        'Verify Email',
        `Verification Code: ${verificationToken}`
      );
      await sendEmail(user.email, `Verification Code: ${verificationToken}`, mailTemplate.html);

      res.status(200).json({
        status: 'pending_verification',
        email: user.email,
        emailOtpRequired: true,
        message: 'Please verify your email address to log in.',
      });
      return;
    }
    ========================================================================= */

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        status: user.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Register Staff / Student (Strict RBAC inside controllers or routes)
export const registerUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const creator = req.user;
    if (!creator) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      firstName,
      lastName,
      email,
      role,
      phone,
      password, // custom initial password from admin
      address,
      gender,
      dateOfBirth,
      // Profiles specific
      registrationNumber, // student
      guardianName,      // student
      guardianPhone,     // student
      guardianEmail,     // student
      academicYear,      // student
      staffId,           // staff
      department,        // staff
      designation,       // staff
      qualifications,    // staff
    } = req.body;

    // RBAC validation
    if (role === 'staff' && creator.role !== 'admin') {
      res.status(403).json({ message: 'Only administrators can register staff members' });
      return;
    }
    if (role === 'student' && creator.role !== 'admin' && creator.role !== 'staff') {
      res.status(403).json({ message: 'Only Admin or Staff can register students' });
      return;
    }
    if (role === 'admin' && creator.role !== 'admin') {
      res.status(403).json({ message: 'Only Admin can register other Admin accounts' });
      return;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists with this email' });
      return;
    }

    // Generate a temporary random password if none is provided
    const tempPassword = password || (crypto.randomBytes(6).toString('hex') + 'A@1');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);


    // Create the core User
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
      gender,
      dateOfBirth,
      status: 'pending',
      isEmailVerified: false,
      isFirstLogin: true,
    });

    // Create sub-profile depending on role
    if (role === 'student') {
      await StudentProfile.create({
        userId: newUser._id,
        registrationNumber: registrationNumber || `ST-${Date.now().toString().slice(-6)}`,
        guardianName: guardianName || 'Parent / Guardian',
        guardianPhone: guardianPhone || phone || '0000000000',
        guardianEmail,
        academicYear: academicYear || new Date().getFullYear().toString(),
      });
    } else if (role === 'staff') {
      await StaffProfile.create({
        userId: newUser._id,
        staffId: staffId || `STF-${Date.now().toString().slice(-5)}`,
        department: department || 'General Education',
        designation: designation || 'Lecturer',
        qualifications: qualifications ? qualifications.split(',') : [],
      });
    }

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await EmailVerification.create({
      userId: newUser._id,
      verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send verification email
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const mailTemplate = getEmailTemplate('verifyEmail', {
      name: `${firstName} ${lastName}`,
      verifyUrl,
    });
    await sendEmail(email, mailTemplate.subject, mailTemplate.html);

    // Also send credentials welcome email (so the user knows their temp pass)
    const loginUrl = `${FRONTEND_URL}/login`;
    const welcomeTemplate = getEmailTemplate('welcome', {
      name: `${firstName} ${lastName}`,
      role,
      email,
      password: tempPassword,
      loginUrl,
    });
    await sendEmail(email, welcomeTemplate.subject, welcomeTemplate.html);

    res.status(201).json({
      message: `Successfully registered ${role}. Verification email sent.`,
      user: {
        id: newUser._id,
        firstName,
        lastName,
        email,
        role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Verify Email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  /* =========================================================================
   * TEMPORARILY DISABLED: OTP verification code used during login.
   * Kept safely commented out so it can be re-enabled later.
   * =========================================================================
  try {
    const { token } = req.body;

    const verification = await EmailVerification.findOne({
      verificationToken: token,
      isVerified: false,
    });

    if (!verification) {
      res.status(400).json({ message: 'Invalid or expired verification token' });
      return;
    }

    if (new Date() > verification.expiresAt) {
      res.status(400).json({ message: 'Token has expired. Please request a new verification email.' });
      return;
    }

    // Activate User
    const user = await User.findById(verification.userId);
    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    // Ensure OTP endpoints cannot be used to bypass account status checks
    if (user.status === 'inactive') {
      res.status(403).json({ message: 'Your account is inactive. Please contact administration.' });
      return;
    }

    if (user.status === 'pending') {
      verification.isVerified = true;
      await verification.save();
      user.isEmailVerified = true;
      await user.save();
      res.status(403).json({ message: 'Your account is pending approval. Please wait for an administrator or staff member to activate your account.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ message: 'Your account is suspended. Contact administration.' });
      return;
    }

    if (user.status === 'disabled') {
      res.status(403).json({ message: 'Your account is disabled.' });
      return;
    }

    user.isEmailVerified = true;
    user.lastLogin = new Date();
    await user.save();

    verification.isVerified = true;
    await verification.save();

    // Issue authentication tokens only after successful verification
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.status(200).json({
      message: 'Email verified successfully. Login successful.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        status: user.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
  ========================================================================= */

  res.status(200).json({
    message: 'Email OTP verification is temporarily disabled. Please log in directly with your registered Email and Password.',
  });
};

// Resend Verification Email
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({ message: 'Email is already verified' });
      return;
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await EmailVerification.create({
      userId: user._id,
      verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const mailTemplate = getEmailTemplate('verifyEmail', {
      name: `${user.firstName} ${user.lastName}`,
      verifyUrl,
    });
    await sendEmail(email, mailTemplate.subject, mailTemplate.html);

    res.status(200).json({ message: 'Verification email resent.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Force Change Password (First Login)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password || '');
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect current password' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isFirstLogin = false; // Mark first login password change done
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Forgot Password Flow
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'User not found with this email' });
      return;
    }

    // Re-use verificationToken mechanics or build separate resetToken
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Store in verification schema with verificationToken
    await EmailVerification.create({
      userId: user._id,
      verificationToken: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailTemplate = getEmailTemplate('forgotPassword', {
      resetUrl,
    });
    await sendEmail(email, mailTemplate.subject, mailTemplate.html);

    res.status(200).json({ message: 'Password reset email sent.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Reset Password Flow
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    const resetRequest = await EmailVerification.findOne({
      verificationToken: token,
      isVerified: false,
    });

    if (!resetRequest) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    if (new Date() > resetRequest.expiresAt) {
      res.status(400).json({ message: 'Token has expired' });
      return;
    }

    const user = await User.findById(resetRequest.userId);
    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    resetRequest.isVerified = true;
    await resetRequest.save();

    res.status(200).json({ message: 'Password reset successful. You can now log in.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Refresh Token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const decoded: any = jwt.verify(token, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ message: 'Invalid token user' });
      return;
    }

    if (user.status === 'inactive' || user.status === 'pending' || user.status === 'suspended' || user.status === 'disabled') {
      res.status(403).json({ message: `Account is ${user.status}. Access denied.` });
      return;
    }

    const tokens = generateTokens(user._id.toString());
    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// Get profile details (Includes specific role profiles)
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let profileData: any = { user };

    if (user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: user._id });
      profileData.profile = studentProfile;
    } else if (user.role === 'staff') {
      const staffProfile = await StaffProfile.findOne({ userId: user._id });
      profileData.profile = staffProfile;
    }

    res.status(200).json(profileData);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Update Profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { phone, address, gender, dateOfBirth, guardianName, guardianPhone, guardianEmail, bio } = req.body;

    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.gender = gender || user.gender;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;

    // Handle profile photo upload as memory Buffer
    if (req.file) {
      user.profileImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    await user.save();

    if (user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: user._id });
      if (studentProfile) {
        studentProfile.guardianName = guardianName || studentProfile.guardianName;
        studentProfile.guardianPhone = guardianPhone || studentProfile.guardianPhone;
        studentProfile.guardianEmail = guardianEmail || studentProfile.guardianEmail;
        await studentProfile.save();
      }
    } else if (user.role === 'staff') {
      const staffProfile = await StaffProfile.findOne({ userId: user._id });
      if (staffProfile) {
        staffProfile.bio = bio || staffProfile.bio;
        await staffProfile.save();
      }
    }

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get profile image file stream
export const getProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user || !user.profileImage || !user.profileImage.data) {
      res.status(404).json({ message: 'Image not found' });
      return;
    }

    res.set('Content-Type', user.profileImage.contentType);
    res.send(user.profileImage.data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
