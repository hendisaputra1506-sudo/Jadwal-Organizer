import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Read list pengguna dapat diakses oleh seluruh pengguna terotentikasi (untuk tag petugas kegiatan)
router.get('/', authenticateToken, getAllUsers);

// Modifikasi akun (buat, ubah, hapus) strictly ADMIN only
router.post('/', authenticateToken, requireAdmin, createUser);
router.put('/:id', authenticateToken, requireAdmin, updateUser);
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

export default router;
