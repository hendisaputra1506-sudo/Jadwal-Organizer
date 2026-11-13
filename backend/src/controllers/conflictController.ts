import { Request, Response } from 'express';
import { checkScheduleConflicts } from '../services/conflictService.js';

export async function checkConflicts(req: Request, res: Response): Promise<void> {
  try {
    const {
      eventIdToExclude,
      locationId,
      locationName,
      datePrecision,
      eventDate,
      startTime,
      endTime,
      isAllDay,
      candidateDates,
      estimatedMonth,
    } = req.body;

    const result = await checkScheduleConflicts({
      eventIdToExclude,
      locationId,
      locationName: locationName || req.body.location_name,
      datePrecision: datePrecision || 'EXACT',
      eventDate,
      startTime,
      endTime,
      isAllDay: Boolean(isAllDay),
      candidateDates: candidateDates || [],
      estimatedMonth,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan pengecekan bentrok jadwal.',
    });
  }
}
