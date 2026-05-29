import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (jwtError: any) {
      // Log specific JWT error for debugging
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
      } else {
        return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_VERIFICATION_FAILED' });
      }
    }
  } catch (error: any) {
    console.error('[AUTH] Unexpected error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

