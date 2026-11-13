import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getLetters,
  getLetter,
  saveLetter,
  removeLetter,
} from '../controllers/letterController.js';

const router = express.Router();

router.get('/', authenticateToken, getLetters);
router.get('/:id', authenticateToken, getLetter);
router.post('/', authenticateToken, saveLetter);
router.delete('/:id', authenticateToken, removeLetter);

export default router;
