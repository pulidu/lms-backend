import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { connectDB, sanitizeMongoUri } from './config/db.js';

const app = express();

// Standard Security & Helper Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading profile image binary files directly
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Root Health Check (responds immediately without waiting for database)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Database readiness middleware for serverless & traditional environments
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error: any) {
    const safeError = sanitizeMongoUri(error?.message || 'Database connection error');
    res.status(503).json({
      message: 'Database connection is currently unavailable. Please verify Atlas cluster status and network access.',
      error: safeError,
    });
  }
});

// API Entry Points
app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notice', noticeRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;

