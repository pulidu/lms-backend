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

const app = express();

// Standard Security & Helper Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading profile image binary files directly
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// API Entry Points
app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notice', noticeRoutes);

// Root Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Error handling middleware
app.use(errorHandler);

export default app;
