import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

interface JwtPayload {
  id: string;
  username: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload & { email?: string };
    if (!decoded || !decoded.id || !decoded.username) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    req.user = {
      id: decoded.id,
      username: decoded.username,
      roles: decoded.roles || []
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Не авторизован' });
  }
}; 