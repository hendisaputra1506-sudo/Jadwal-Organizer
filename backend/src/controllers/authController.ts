import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { ENV } from '../config/env.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { JwtUserPayload } from '../types/index.js';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: 'Username dan kata sandi wajib diisi.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Username atau kata sandi tidak sesuai.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Username atau kata sandi tidak sesuai.',
      });
      return;
    }

    const payload: JwtUserPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'ADMIN' | 'USER',
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });

    res.json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('Error on login:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada sistem saat proses login.',
    });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Error on getMe:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data user.' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    message: 'Logout berhasil.',
  });
}
