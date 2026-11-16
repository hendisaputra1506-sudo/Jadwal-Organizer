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

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Kata sandi saat ini dan kata sandi baru wajib diisi.',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Kata sandi baru minimal harus 6 karakter.',
      });
      return;
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'Konfirmasi kata sandi baru tidak cocok.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Kata sandi saat ini salah. Silakan coba kembali.',
      });
      return;
    }

    // Hash kata sandi baru
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash },
    });

    res.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Gunakan kata sandi baru untuk login berikutnya.',
    });
  } catch (error: any) {
    console.error('Error on changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat memperbarui kata sandi.',
    });
  }
}
