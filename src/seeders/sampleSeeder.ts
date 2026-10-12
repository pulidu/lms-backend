import { User } from '../models/User.js';
import { StudentProfile, StaffProfile } from '../models/Profiles.js';

export const seedSampleData = async (): Promise<void> => {
  try {
    // Clean up mock users from DB
    const mockEmails = ['lecturer@lms.com', 'student@lms.com'];
    for (const email of mockEmails) {
      const user = await User.findOne({ email });
      if (user) {
        await StudentProfile.deleteOne({ userId: user._id });
        await StaffProfile.deleteOne({ userId: user._id });
        await User.deleteOne({ _id: user._id });
        console.log(`Successfully removed mock user: ${email}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up mock users:', error);
  }
};
