import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

export async function getAllLocations(req: Request, res: Response): Promise<void> {
  try {
    const locations = await prisma.location.findMany({
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
      data: locations,
    });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data lokasi.' });
  }
}

export async function createLocation(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Nama lokasi wajib diisi.' });
      return;
    }

    const existing = await prisma.location.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      res.status(400).json({ success: false, message: 'Lokasi dengan nama tersebut sudah ada.' });
      return;
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Lokasi berhasil ditambahkan.',
      data: location,
    });
  } catch (error: any) {
    console.error('Error creating location:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan lokasi.' });
  }
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Nama lokasi wajib diisi.' });
      return;
    }

    const existing = await prisma.location.findFirst({
      where: {
        name: name.trim(),
        id: { not: id },
      },
    });

    if (existing) {
      res.status(400).json({ success: false, message: 'Lokasi dengan nama tersebut sudah ada.' });
      return;
    }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    res.json({
      success: true,
      message: 'Lokasi berhasil diperbarui.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui lokasi.' });
  }
}

export async function deleteLocation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const activeEventsCount = await prisma.event.count({
      where: {
        location_id: id,
        is_deleted: false,
      },
    });

    if (activeEventsCount > 0) {
      res.status(400).json({
        success: false,
        message: `Lokasi tidak dapat dihapus karena masih digunakan oleh ${activeEventsCount} kegiatan.`,
      });
      return;
    }

    await prisma.location.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Lokasi berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Error deleting location:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus lokasi.' });
  }
}
