import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';

export const authorize = (...roles: ('admin' | 'staff' | 'student' | 'lecturer')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized, no user object' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Role (${req.user.role}) is not authorized to access this resource`,
      });
      return;
    }

    next();
  };
};
