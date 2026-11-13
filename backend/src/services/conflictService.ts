import { prisma } from '../config/db.js';
import {
  ConflictCheckResult,
  ConflictItem,
  CandidateConflictStatus,
  ConflictLevel,
} from '../types/index.js';

interface CheckConflictParams {
  eventIdToExclude?: string;
  locationId?: string | null;
  locationName?: string | null;
  datePrecision: string;
  eventDate?: string | Date | null;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay?: boolean;
  candidateDates?: (string | Date)[];
  estimatedMonth?: string | null;
}

/**
 * Checks if two time ranges overlap.
 * Format expected: "HH:mm" (e.g. "09:00", "14:30")
 * If either is all day or times are missing, they are treated as overlapping.
 */
function isTimeOverlapping(
  startA?: string | null,
  endA?: string | null,
  isAllDayA: boolean = false,
  startB?: string | null,
  endB?: string | null,
  isAllDayB: boolean = false
): boolean {
  if (isAllDayA || isAllDayB || !startA || !endA || !startB || !endB) {
    return true; // Treat missing time or all-day as whole day occupancy
  }

  // Convert HH:mm to minutes from midnight
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const aStart = toMinutes(startA);
  let aEnd = toMinutes(endA);
  if (aEnd <= aStart) aEnd += 24 * 60; // Handle overnight

  const bStart = toMinutes(startB);
  let bEnd = toMinutes(endB);
  if (bEnd <= bStart) bEnd += 24 * 60; // Handle overnight

  return aStart < bEnd && aEnd > bStart;
}

function formatDateString(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export async function checkScheduleConflicts(
  params: CheckConflictParams
): Promise<ConflictCheckResult> {
  const {
    eventIdToExclude,
    locationId,
    locationName,
    datePrecision,
    eventDate,
    startTime,
    endTime,
    isAllDay = false,
    candidateDates = [],
    estimatedMonth,
  } = params;

  const trimmedLoc = locationName?.trim();

  // If no location is specified, location-based conflict cannot be established
  if (!locationId && !trimmedLoc) {
    return {
      hasConflict: false,
      highestLevel: 'NONE',
      conflicts: [],
    };
  }

  const locationWhere = trimmedLoc
    ? {
        OR: [
          { location_name: { equals: trimmedLoc, mode: 'insensitive' as const } },
          ...(locationId ? [{ location_id: locationId }] : []),
        ],
      }
    : { location_id: locationId! };

  const conflicts: ConflictItem[] = [];

  // 1. Check for EXACT Date Conflicts
  if (datePrecision === 'EXACT' && eventDate) {
    const targetDateStr = formatDateString(eventDate);
    const targetDateStart = new Date(`${targetDateStr}T00:00:00.000Z`);
    const targetDateEnd = new Date(`${targetDateStr}T23:59:59.999Z`);

    // Find other non-deleted, non-cancelled events on the same location & exact date
    const sameDateEvents = await prisma.event.findMany({
      where: {
        id: eventIdToExclude ? { not: eventIdToExclude } : undefined,
        ...locationWhere,
        is_deleted: false,
        status: { not: 'CANCELLED' },
        date_precision: 'EXACT',
        event_date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
      },
      include: {
        location: true,
      },
    });

    for (const other of sameDateEvents) {
      const overlap = isTimeOverlapping(
        startTime,
        endTime,
        isAllDay,
        other.start_time,
        other.end_time,
        other.is_all_day
      );

      if (overlap) {
        const isDefinite = other.status === 'CONFIRMED';
        const timeDisplay = other.is_all_day
          ? 'Sepanjang Hari'
          : other.start_time && other.end_time
          ? `${other.start_time} - ${other.end_time}`
          : 'Waktu belum diisi (Sepanjang Hari)';

        conflicts.push({
          eventId: other.id,
          eventName: other.name,
          eventDate: targetDateStr,
          timeRange: timeDisplay,
          locationName: other.location_name || other.location?.name || null,
          level: isDefinite ? 'DEFINITE' : 'POTENTIAL',
          reason: isDefinite
            ? `Konflik Pasti: Bentrok jadwal dan lokasi dengan kegiatan "${other.name}" (${timeDisplay})`
            : `Potensi Konflik: Waktu dan lokasi beririsan dengan kegiatan "${other.name}"`,
        });
      }
    }

    // Also check if any other event has this date as one of its CANDIDATE dates at this location
    const candidateMatches = await prisma.eventCandidateDate.findMany({
      where: {
        candidate_date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
        event: {
          id: eventIdToExclude ? { not: eventIdToExclude } : undefined,
          ...locationWhere,
          is_deleted: false,
          status: { not: 'CANCELLED' },
        },
      },
      include: {
        event: {
          include: { location: true },
        },
      },
    });

    for (const match of candidateMatches) {
      conflicts.push({
        eventId: match.event.id,
        eventName: match.event.name,
        eventDate: targetDateStr,
        timeRange: 'Kandidat Tanggal',
        locationName: match.event.location_name || match.event.location?.name || null,
        level: 'POTENTIAL',
        reason: `Potensi Konflik: Tanggal ini adalah salah satu opsi kandidat untuk kegiatan "${match.event.name}"`,
      });
    }
  }

  // 2. Check for CANDIDATE Dates Conflicts
  let allCandidatesConflict = false;
  let candidatesBreakdown: CandidateConflictStatus[] | undefined = undefined;

  if (datePrecision === 'CANDIDATES' && candidateDates.length > 0) {
    candidatesBreakdown = [];
    let conflictingCandidatesCount = 0;

    for (const candDate of candidateDates) {
      const candDateStr = formatDateString(candDate);
      const candStart = new Date(`${candDateStr}T00:00:00.000Z`);
      const candEnd = new Date(`${candDateStr}T23:59:59.999Z`);

      // Find exact events on this candidate date
      const exactOnCand = await prisma.event.findMany({
        where: {
          id: eventIdToExclude ? { not: eventIdToExclude } : undefined,
          ...locationWhere,
          is_deleted: false,
          status: { not: 'CANCELLED' },
          date_precision: 'EXACT',
          event_date: {
            gte: candStart,
            lte: candEnd,
          },
        },
        include: { location: true },
      });

      const candConflicts: ConflictItem[] = [];

      for (const ev of exactOnCand) {
        const timeDisplay = ev.is_all_day
          ? 'Sepanjang Hari'
          : ev.start_time && ev.end_time
          ? `${ev.start_time} - ${ev.end_time}`
          : 'Waktu belum diisi';

        candConflicts.push({
          eventId: ev.id,
          eventName: ev.name,
          eventDate: candDateStr,
          timeRange: timeDisplay,
          locationName: ev.location_name || ev.location?.name || null,
          level: 'POTENTIAL',
          reason: `Bentrok dengan kegiatan pasti "${ev.name}" pada ${candDateStr} (${timeDisplay})`,
        });

        // Also push to overall conflicts
        conflicts.push({
          eventId: ev.id,
          eventName: ev.name,
          eventDate: candDateStr,
          timeRange: timeDisplay,
          locationName: ev.location_name || ev.location?.name || null,
          level: 'POTENTIAL',
          reason: `Opsi kandidat ${candDateStr} berpotensi bentrok dengan "${ev.name}"`,
        });
      }

      if (candConflicts.length > 0) {
        conflictingCandidatesCount++;
        candidatesBreakdown.push({
          candidateDate: candDateStr,
          hasConflict: true,
          level: 'POTENTIAL',
          conflicts: candConflicts,
        });
      } else {
        candidatesBreakdown.push({
          candidateDate: candDateStr,
          hasConflict: false,
          level: 'NONE',
          conflicts: [],
        });
      }
    }

    if (
      candidatesBreakdown.length > 0 &&
      conflictingCandidatesCount === candidatesBreakdown.length
    ) {
      allCandidatesConflict = true;
    }
  }

  // 3. Check for MONTH / WEEK Tentative Overlaps
  if ((datePrecision === 'MONTH' || datePrecision === 'WEEK') && estimatedMonth) {
    const tentativeSameMonth = await prisma.event.findMany({
      where: {
        id: eventIdToExclude ? { not: eventIdToExclude } : undefined,
        ...locationWhere,
        is_deleted: false,
        status: { not: 'CANCELLED' },
        estimated_month: estimatedMonth,
        date_precision: { in: ['MONTH', 'WEEK'] },
      },
      include: { location: true },
    });

    for (const ev of tentativeSameMonth) {
      conflicts.push({
        eventId: ev.id,
        eventName: ev.name,
        eventDate: ev.estimated_month,
        timeRange: ev.estimated_week_label || 'Bulan ini',
        locationName: ev.location_name || ev.location?.name || null,
        level: 'POTENTIAL',
        reason: `Potensi Konflik: Kegiatan "${ev.name}" juga diperkirakan berlangsung di lokasi ini pada ${estimatedMonth}`,
      });
    }
  }

  // Determine highest level
  const hasDefinite = conflicts.some((c) => c.level === 'DEFINITE');
  const hasConflict = conflicts.length > 0;
  const highestLevel: ConflictLevel = hasDefinite
    ? 'DEFINITE'
    : hasConflict
    ? 'POTENTIAL'
    : 'NONE';

  return {
    hasConflict,
    highestLevel,
    conflicts,
    allCandidatesConflict,
    candidatesBreakdown,
  };
}
