import { Router } from 'express';
import {
  getWeekly,
  getMonthly,
  getAll,
  getTentative,
  getById,
  create,
  update,
  remove,
  cancel,
} from '../controllers/eventController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Read routes (both ADMIN and USER)
router.get('/weekly', authenticateToken, getWeekly);
router.get('/monthly', authenticateToken, getMonthly);
router.get('/tentative', authenticateToken, getTentative);
router.get('/', authenticateToken, getAll);
router.get('/:id', authenticateToken, getById);

// Write routes (ADMIN only)
router.post('/', authenticateToken, requireAdmin, create);
router.put('/:id', authenticateToken, requireAdmin, update);
router.delete('/:id', authenticateToken, requireAdmin, remove);
router.patch('/:id/cancel', authenticateToken, requireAdmin, cancel);

export default router;
