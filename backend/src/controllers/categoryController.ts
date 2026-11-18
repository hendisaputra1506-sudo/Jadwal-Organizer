import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import {
  getEffectiveDocumentSlots,
  normalizeDocumentSlots,
} from '../utils/documentSlots.js';

function serializeCategory<T extends { name: string; document_slots?: unknown }>(cat: T) {
  return {
    ...cat,
    effective_document_slots: getEffectiveDocumentSlots(cat),
  };
}

export async function getAllCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            events: {
              where: { is_deleted: false },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: categories.map((cat) => serializeCategory(cat)),
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data kategori.' });
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name, color, icon, document_slots } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
      return;
    }

    const existing = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      res.status(400).json({ success: false, message: 'Kategori dengan nama tersebut sudah ada.' });
      return;
    }

    const normalizedSlots =
      document_slots !== undefined ? normalizeDocumentSlots(document_slots) : null;

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        color: color || '#3B82F6',
        icon: icon || 'Tag',
        document_slots:
          normalizedSlots === null
            ? Prisma.DbNull
            : (normalizedSlots as unknown as Prisma.InputJsonValue),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Kategori berhasil ditambahkan.',
      data: serializeCategory(category),
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan kategori.' });
  }
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, color, icon, document_slots } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
      return;
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        id: { not: id },
      },
    });

    if (existing) {
      res.status(400).json({ success: false, message: 'Kategori dengan nama tersebut sudah ada.' });
      return;
    }

    const updateData: any = {
      name: name.trim(),
      color: color || '#3B82F6',
      icon: icon || 'Tag',
    };

    if (document_slots !== undefined) {
      const normalizedSlots = normalizeDocumentSlots(document_slots);
      updateData.document_slots =
        normalizedSlots === null
          ? Prisma.DbNull
          : (normalizedSlots as unknown as Prisma.InputJsonValue);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Kategori berhasil diperbarui.',
      data: serializeCategory(updated),
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui kategori.' });
  }
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if category has active events
    const activeEventsCount = await prisma.event.count({
      where: {
        category_id: id,
        is_deleted: false,
      },
    });

    if (activeEventsCount > 0) {
      res.status(400).json({
        success: false,
        message: `Kategori tidak dapat dihapus karena masih digunakan oleh ${activeEventsCount} kegiatan.`,
      });
      return;
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Kategori berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
}
