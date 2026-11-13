import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { JwtUserPayload } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : (req.query?.token as string | undefined);

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Akses ditolak: Silakan login terlebih dahulu.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Sesi kedaluwarsa atau token tidak valid. Silakan login kembali.',
    });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Silakan login terlebih dahulu.',
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Hanya Admin yang berwenang melakukan tindakan ini.',
    });
    return;
  }

  next();
};
