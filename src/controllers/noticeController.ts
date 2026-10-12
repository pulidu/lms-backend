import { Response } from 'express';
import { Notice, Announcement, Notification } from '../models/Interactions.js';
import { Timetable, Payment, ActivityLog } from '../models/Management.js';
import { User } from '../models/User.js';
import { StudentProfile, StaffProfile } from '../models/Profiles.js';
import { Course, Subject, Enrollment } from '../models/Academics.js';
import { AuthRequest } from '../types/index.js';
import { sendEmail, getEmailTemplate } from '../services/emailService.js';

// --- ANNOUNCEMENTS ---
export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content } = req.body;
    const createdBy = req.user?._id;
    if (!createdBy) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const announcement = await Announcement.create({ title, content, createdBy });

    // Send emails in background
    User.find({ status: 'active' }).then((activeUsers) => {
      const emails = activeUsers.map(u => u.email).filter(Boolean);
      const emailTemplate = getEmailTemplate('announcement', {
        subject: `New Announcement: ${title}`,
        message: `<h3>${title}</h3><p>${content.replace(/\n/g, '<br/>')}</p>`
      });
      emails.forEach((email) => {
        sendEmail(email, emailTemplate.subject, emailTemplate.html);
      });
    }).catch((emailErr) => {
      console.error('Failed to dispatch announcement emails:', emailErr);
    });

    res.status(201).json({ message: 'Announcement published successfully', announcement });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// --- TIMETABLES ---
export const createTimetable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId, batchId, subjectId, dayOfWeek, startTime, endTime, roomNumber, lecturerId } = req.body;
    const entry = await Timetable.create({
      courseId,
      batchId,
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      lecturerId,
    });

    // Send emails to enrolled course/batch students in background
    const enrollmentQuery: any = { courseId, status: 'active' };
    if (batchId) {
      enrollmentQuery.batchId = batchId;
    }

    Promise.all([
      Course.findById(courseId),
      Subject.findById(subjectId),
      User.findById(lecturerId),
      Enrollment.find(enrollmentQuery).populate('studentId')
    ]).then(([course, subject, lecturer, enrollments]) => {
      const studentEmails = enrollments.map((e: any) => e.studentId?.email).filter(Boolean);
      
      const subjectName = subject ? `${subject.code} - ${subject.name}` : 'Subject';
      const courseName = course ? course.name : 'Course';
      const lecturerName = lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : 'TBA';
      
      const emailTemplate = getEmailTemplate('timetableScheduled', {
        subject: `New Lecture Scheduled: ${subjectName}`,
        message: `A new lecture has been scheduled for your course: <strong>${courseName}</strong>.<br/><br/>
          <strong>Subject:</strong> ${subjectName}<br/>
          <strong>Day:</strong> ${dayOfWeek}<br/>
          <strong>Time:</strong> ${startTime} - ${endTime}<br/>
          <strong>Room:</strong> ${roomNumber}<br/>
          <strong>Lecturer:</strong> ${lecturerName}`
      });

      studentEmails.forEach((email) => {
        sendEmail(email, emailTemplate.subject, emailTemplate.html);
      });
    }).catch((emailErr) => {
      console.error('Failed to dispatch timetable schedule emails:', emailErr);
    });

    res.status(201).json({ message: 'Timetable entry added successfully', entry });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getTimetables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { batchId } = req.query;
    
    const query: any = { courseId };
    if (batchId) {
      query.$or = [
        { batchId },
        { batchId: { $exists: false } },
        { batchId: null }
      ];
    }
    
    const timetable = await Timetable.find(query)
      .populate('subjectId', 'code name')
      .populate('lecturerId', 'firstName lastName');
    res.status(200).json(timetable);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// --- PAYMENTS ---
export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, amount, type, referenceId } = req.body;
    const payment = await Payment.create({
      studentId,
      amount,
      type,
      referenceId,
      status: 'completed',
    });
    res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const payments = await Payment.find({ studentId });
    res.status(200).json(payments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// --- NOTIFICATIONS ---
export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const recipientId = req.user?._id;
    if (!recipientId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const notifications = await Notification.find({ recipientId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    res.status(200).json(notification);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// --- USER MANAGEMENT (Admin Only) ---
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let users;
    if (req.user?.role === 'staff' || req.user?.role === 'lecturer') {
      users = await User.find({ role: { $in: ['student', 'staff', 'lecturer'] } }).sort({ createdAt: -1 }).lean();
    } else {
      users = await User.find().sort({ createdAt: -1 }).lean();
    }

    const populatedUsers = await Promise.all(users.map(async (u: any) => {
      if (u.role === 'student') {
        const studentProfile = await StudentProfile.findOne({ userId: u._id }).lean();
        if (studentProfile) {
          u.registrationNumber = studentProfile.registrationNumber;
          u.guardianName = studentProfile.guardianName;
          u.guardianPhone = studentProfile.guardianPhone;
          u.guardianEmail = studentProfile.guardianEmail;
        }
      } else if (u.role === 'staff' || u.role === 'lecturer') {
        const staffProfile = await StaffProfile.findOne({ userId: u._id }).lean();
        if (staffProfile) {
          u.staffId = staffProfile.staffId;
          u.department = staffProfile.department;
          u.designation = staffProfile.designation;
        }
      }
      return u;
    }));

    res.status(200).json(populatedUsers);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (req.user?.role === 'staff' && user.role !== 'student') {
      res.status(403).json({ message: 'Staff can only modify student accounts' });
      return;
    }

    user.status = status;
    await user.save();

    res.status(200).json({ message: `User status changed to ${status}`, user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      role, 
      phone, 
      address, 
      gender,
      department,
      designation,
      staffId,
      registrationNumber,
      guardianName,
      guardianPhone,
      guardianEmail
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (req.user?.role === 'staff') {
      if (user.role !== 'student' || role !== 'student') {
        res.status(403).json({ message: 'Staff can only modify student accounts' });
        return;
      }
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.role = role || user.role;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.gender = gender || user.gender;

    await user.save();

    // Update or create corresponding sub-profile depending on the final role
    if (user.role === 'student') {
      const studentProfileData = {
        registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
        guardianName: guardianName || 'N/A',
        guardianPhone: guardianPhone || 'N/A',
        guardianEmail,
        academicYear: '2026',
        semester: 1
      };
      await StudentProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: studentProfileData },
        { upsert: true, new: true }
      );
    } else if (user.role === 'staff') {
      const staffProfileData = {
        staffId: staffId || `STF-${Date.now().toString().slice(-6)}`,
        department: department || 'General',
        designation: designation || 'Lecturer'
      };
      await StaffProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: staffProfileData },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: 'User details updated successfully', user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
