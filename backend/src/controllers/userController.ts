import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Mengambil daftar seluruh pengguna/staf kampus (Khusus ADMIN)
 */
export async function getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        created_at: true,
        _count: {
          select: {
            events_created: true,
            letters_created: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Error on getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar pengguna.',
    });
  }
}

/**
 * Membuat akun baru untuk staf atau admin (Khusus ADMIN)
 */
export async function createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, username, password, role = 'USER' } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi.' });
      return;
    }

    if (!username || !username.trim()) {
      res.status(400).json({ success: false, message: 'Username wajib diisi.' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      res.status(400).json({ success: false, message: 'Username minimal 3 karakter.' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    // Cek apakah username sudah dipakai
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: `Username '${cleanUsername}' sudah digunakan. Silakan pilih username lain.`,
      });
      return;
    }

    // Hash kata sandi
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        password_hash: passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        created_at: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Akun untuk ${newUser.name} berhasil dibuat.`,
      data: newUser,
    });
  } catch (error: any) {
    console.error('Error on createUser:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat membuat akun pengguna.',
    });
  }
}

/**
 * Memperbarui akun staf / reset kata sandi (Khusus ADMIN)
 */
export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, role, newPassword } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (role && (role === 'ADMIN' || role === 'USER')) {
      // Mencegah admin mendegradasi dirinya sendiri jika sedang login
      if (req.user?.userId === id && role !== 'ADMIN') {
        res.status(400).json({
          success: false,
          message: 'Anda tidak dapat mengubah role akun Anda sendiri menjadi Staff.',
        });
        return;
      }
      updateData.role = role;
    }

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        res.status(400).json({
          success: false,
          message: 'Kata sandi baru minimal 6 karakter.',
        });
        return;
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(newPassword.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        created_at: true,
      },
    });

    res.json({
      success: true,
      message: `Data pengguna ${updated.name} berhasil diperbarui.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error on updateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data pengguna.',
    });
  }
}

/**
 * Menghapus akun pengguna (Khusus ADMIN)
 */
export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const currentAdminId = req.user?.userId;

    if (!currentAdminId) {
      res.status(401).json({
        success: false,
        message: 'Sesi tidak valid. Silakan login kembali.',
      });
      return;
    }

    // Mencegah admin menghapus akunnya sendiri
    if (id === currentAdminId) {
      res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.',
      });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    // Alihkan relasi kegiatan & surat ke Admin aktif agar jadwal tidak hilang
    // dan tidak memicu error Foreign Key Constraint (500) saat akun staf dihapus
    await prisma.$transaction([
      prisma.event.updateMany({
        where: { created_by_id: id },
        data: { created_by_id: currentAdminId },
      }),
      prisma.event.updateMany({
        where: { updated_by_id: id },
        data: { updated_by_id: null },
      }),
      prisma.letterRecord.updateMany({
        where: { created_by_id: id },
        data: { created_by_id: currentAdminId },
      }),
      prisma.user.delete({
        where: { id },
      }),
    ]);

    res.json({
      success: true,
      message: `Akun ${existing.name} (@${existing.username}) berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error on deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus pengguna.',
    });
  }
}
