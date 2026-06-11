import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../shared/types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    name: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权访问' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '无效的令牌' });
  }
};

export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未授权访问' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    next();
  };
};

export const generateToken = (user: { id: string; username: string; role: UserRole; name: string }): string => {
  return Buffer.from(JSON.stringify(user)).toString('base64');
};
