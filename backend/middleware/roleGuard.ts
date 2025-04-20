import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface RequestWithUser extends Request {
  user: {
    username: string;
    nameID: string;
    groups: string[];
    firstName: string;
  };
}

export const roleGuard = (allowedGroups: string[]): RequestHandler => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as RequestWithUser['user'];
      (req as RequestWithUser).user = decoded;

      // Check if user has any of the allowed groups
      const userGroups = decoded.groups || [];
      const hasAllowedRole = allowedGroups.some(group => userGroups.includes(group));

      // Special case: if user is in 'Admin' or 'SuperAdmin' group, they have access to everything
      const isAdmin = userGroups.includes('Admin');
      const isSuperAdmin = userGroups.includes('SuperAdmin');

      if (!hasAllowedRole && !isAdmin && !isSuperAdmin) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
  };