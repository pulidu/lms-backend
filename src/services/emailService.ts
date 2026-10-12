import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter: nodemailer.Transporter | null = null;

if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.log('EmailService: Credentials not set. Emails will be logged to console.');
}

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: `"LMS System" <${EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`Email successfully sent to ${to}: ${subject}`);
      return true;
    } else {
      console.log('--- EMAIL SIMULATION ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML Length: ${html.length} chars`);
      console.log('------------------------');
      return true;
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Beautiful Templates
export const getEmailTemplate = (
  type: string,
  params: { [key: string]: any }
): { subject: string; html: string } => {
  const brandColor = '#0284c7';
  const header = `
    <div style="background-color: ${brandColor}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-family: 'Inter', sans-serif; font-size: 24px;">Enterprise LMS</h1>
    </div>
  `;
  const footer = `
    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; font-family: 'Inter', sans-serif;">
      <p>This is an automated notification. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Enterprise LMS. All rights reserved.</p>
    </div>
  `;

  let subject = '';
  let content = '';

  switch (type) {
    case 'verifyEmail':
      subject = 'Verify Your Email Address';
      content = `
        <p>Dear ${params.name},</p>
        <p>Welcome to our Learning Management System! To complete your account activation, please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${params.verifyUrl}" style="background-color: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: 'Inter', sans-serif; display: inline-block;">Verify Email</a>
        </div>
        <p>This link will expire in 24 hours. If you did not request this, please ignore this email.</p>
      `;
      break;

    case 'welcome':
      subject = 'Welcome to the LMS Portal';
      content = `
        <p>Dear ${params.name},</p>
        <p>Your account has been successfully created. You can now log in using the credentials below:</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace;">
          <p style="margin: 5px 0;"><strong>Role:</strong> ${params.role.toUpperCase()}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${params.email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${params.password}</p>
        </div>
        <p style="color: #ea580c; font-weight: 600;">Important: You will be required to change your password upon your first login.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${params.loginUrl}" style="background-color: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: 'Inter', sans-serif; display: inline-block;">Go to Login</a>
        </div>
      `;
      break;

    case 'forgotPassword':
      subject = 'Reset Your Password';
      content = `
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${params.resetUrl}" style="background-color: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: 'Inter', sans-serif; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>
      `;
      break;

    case 'resultPublished':
      subject = 'Exam Results Published';
      content = `
        <p>Dear ${params.name},</p>
        <p>Your results for <strong>${params.subjectName}</strong> (${params.subjectCode}) have been published.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 5px 0; font-size: 16px;"><strong>Exam:</strong> ${params.examTitle}</p>
          <p style="margin: 5px 0; font-size: 24px; color: #166534;"><strong>Grade:</strong> ${params.grade} (${params.marks}/${params.totalMarks})</p>
        </div>
        <p>Log in to the portal to view full details and class statistics.</p>
      `;
      break;

    case 'attendanceWarning':
      subject = 'URGENT: Low Attendance Warning';
      content = `
        <p>Dear ${params.name},</p>
        <p>This is an automated warning regarding your class attendance in <strong>${params.subjectName}</strong>.</p>
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 5px 0; font-size: 16px;">Current Attendance Percentage:</p>
          <p style="margin: 5px 0; font-size: 28px; color: #c2410c; font-weight: bold;">${params.percentage}%</p>
        </div>
        <p>A minimum of 75% attendance is required to sit for the final examinations. Please contact your lecturer or department head immediately.</p>
      `;
      break;

    default:
      subject = params.subject || 'System Notification';
      content = `<p>${params.message}</p>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          ${header}
          <div style="padding: 20px 10px;">
            ${content}
          </div>
          ${footer}
        </div>
      </body>
    </html>
  `;

  return { subject, html };
};
