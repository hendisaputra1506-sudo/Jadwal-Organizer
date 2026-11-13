import { Router } from 'express';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Everyone logged in can read categories
router.get('/', authenticateToken, getAllCategories);

// Only ADMIN can create, update, or delete categories
router.post('/', authenticateToken, requireAdmin, createCategory);
router.put('/:id', authenticateToken, requireAdmin, updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, deleteCategory);

export default router;
