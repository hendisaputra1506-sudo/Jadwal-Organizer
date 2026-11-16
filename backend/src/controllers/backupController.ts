import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function downloadDatabaseBackup(req: AuthenticatedRequest, res: Response) {
  try {
    const [users, categories, locations, events, candidateDates, attachments, letters] =
      await Promise.all([
        prisma.user.findMany(),
        prisma.category.findMany(),
        prisma.location.findMany(),
        prisma.event.findMany({ include: { candidate_dates: true, attachments: true } }),
        prisma.eventCandidateDate.findMany(),
        prisma.eventAttachment.findMany(),
        prisma.letterRecord.findMany(),
      ]);

    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        creator: req.user?.username || 'admin',
        total_records: {
          users: users.length,
          categories: categories.length,
          locations: locations.length,
          events: events.length,
          candidate_dates: candidateDates.length,
          attachments: attachments.length,
          letters: letters.length,
        },
      },
      tables: {
        users,
        categories,
        locations,
        events,
        candidateDates,
        attachments,
        letters,
      },
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `backup-jadwal-kampus-utd-${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    console.error('Backup download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat cadangan database: ' + (error.message || 'Unknown error'),
    });
  }
}
