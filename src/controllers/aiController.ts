import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { chatWithAcademicAssistant } from '../services/aiService.js';

export const askAssistant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    const { message } = req.body;

    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!message) {
      res.status(400).json({ message: 'Message text is required' });
      return;
    }

    const response = await chatWithAcademicAssistant(studentId.toString(), message);
    res.status(200).json({ response });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
