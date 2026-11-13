import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import * as letterService from '../services/letterService.js';

export async function getLetters(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const letters = await letterService.getAllLetters();
    res.json({
      success: true,
      data: letters,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLetter(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const letter = await letterService.getLetterById(id);

    if (!letter) {
      res.status(404).json({
        success: false,
        message: 'Arsip surat tidak ditemukan.',
      });
      return;
    }

    res.json({
      success: true,
      data: letter,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveLetter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Tidak terautentikasi.',
      });
      return;
    }

    const { id, template_type, title, reference_no, event_id, payload_json } = req.body;

    if (!template_type || !title || !payload_json) {
      res.status(400).json({
        success: false,
        message: 'Data surat belum lengkap (template_type, title, payload_json wajib diisi).',
      });
      return;
    }

    let result;
    if (id) {
      // Update existing record
      result = await letterService.updateLetter(id, {
        template_type,
        title,
        reference_no,
        event_id,
        payload_json: typeof payload_json === 'string' ? payload_json : JSON.stringify(payload_json),
      });
    } else {
      // Create new record
      result = await letterService.createLetter({
        template_type,
        title,
        reference_no,
        event_id,
        created_by_id: userId,
        payload_json: typeof payload_json === 'string' ? payload_json : JSON.stringify(payload_json),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Arsip surat berhasil disimpan.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeLetter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await letterService.getLetterById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Arsip surat tidak ditemukan.',
      });
      return;
    }

    await letterService.deleteLetter(id);

    res.json({
      success: true,
      message: 'Arsip surat berhasil dihapus.',
    });
  } catch (error) {
    next(error);
  }
}
