import { prisma } from '../config/db.js';
import { checkScheduleConflicts } from './conflictService.js';
import { getEffectiveDocumentSlots, resolveAttachmentSlotKey } from '../utils/documentSlots.js';

export interface EventFilterQuery {
  search?: string;
  categoryId?: string;
  status?: string;
  locationId?: string;
  datePrecision?: string;
  startDate?: string;
  endDate?: string;
  month?: string; // YYYY-MM
  isTentativeOnly?: boolean;
}

export async function getWeeklyEvents(startDateStr: string, endDateStr: string) {
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endDateStr}T23:59:59.999Z`);

  const events = await prisma.event.findMany({
    where: {
      is_deleted: false,
      date_precision: 'EXACT',
      event_date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      category: true,
      location: true,
      candidate_dates: true,
    },
    orderBy: [
      { event_date: 'asc' },
      { start_time: 'asc' },
    ],
  });

  return events;
}

export async function getMonthlyEvents(year: number, month: number) {
  // month is 1-12
  const paddedMonth = String(month).padStart(2, '0');
  const monthStr = `${year}-${paddedMonth}`;
  const start = new Date(`${monthStr}-01T00:00:00.000Z`);
  const lastDay = new Date(year, month, 0).getDate();
  const end = new Date(`${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`);

  // 1. Exact events for this month
  const exactEvents = await prisma.event.findMany({
    where: {
      is_deleted: false,
      date_precision: 'EXACT',
      event_date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      category: true,
      location: true,
      candidate_dates: true,
    },
    orderBy: [
      { event_date: 'asc' },
      { start_time: 'asc' },
    ],
  });

  // 2. Tentative events for this month (month/week estimate or candidates)
  const tentativeEvents = await prisma.event.findMany({
    where: {
      is_deleted: false,
      status: { not: 'CANCELLED' },
      OR: [
        { estimated_month: monthStr },
        {
          candidate_dates: {
            some: {
              candidate_date: {
                gte: start,
                lte: end,
              },
            },
          },
        },
      ],
    },
    include: {
      category: true,
      location: true,
      candidate_dates: true,
    },
  });

  return {
    exactEvents,
    tentativeEvents,
  };
}

export async function getAllEvents(filters: EventFilterQuery) {
  const {
    search,
    categoryId,
    status,
    locationId,
    datePrecision,
    startDate,
    endDate,
    month,
    isTentativeOnly,
  } = filters;

  const whereClause: any = {
    is_deleted: false,
  };

  if (categoryId) {
    whereClause.category_id = categoryId;
  }

  if (status) {
    whereClause.status = status;
  }

  if (locationId) {
    whereClause.location_id = locationId;
  }

  if (datePrecision) {
    whereClause.date_precision = datePrecision;
  }

  if (isTentativeOnly) {
    whereClause.OR = [
      { date_precision: { in: ['UNKNOWN', 'MONTH', 'WEEK', 'CANDIDATES'] } },
      { status: { in: ['DRAFT', 'WAITING_CONFIRMATION'] } },
    ];
  }

  if (month) {
    whereClause.OR = [
      { estimated_month: month },
      {
        event_date: {
          gte: new Date(`${month}-01T00:00:00.000Z`),
          lte: new Date(new Date(`${month}-01`).getFullYear(), new Date(`${month}-01`).getMonth() + 1, 0, 23, 59, 59),
        },
      },
    ];
  } else if (startDate && endDate) {
    whereClause.event_date = {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    };
  }

  if (search && search.trim()) {
    const q = search.trim();
    whereClause.AND = [
      {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { location_name: { contains: q, mode: 'insensitive' } },
          { location: { name: { contains: q, mode: 'insensitive' } } },
          { contact_info: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const events = await prisma.event.findMany({
    where: whereClause,
    include: {
      category: true,
      location: true,
      candidate_dates: true,
    },
    orderBy: [
      { event_date: 'asc' },
      { start_time: 'asc' },
      { created_at: 'desc' },
    ],
  });

  return events;
}

export async function getTentativeEvents() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const events = await prisma.event.findMany({
    where: {
      is_deleted: false,
      OR: [
        { date_precision: { in: ['UNKNOWN', 'MONTH', 'WEEK', 'CANDIDATES'] } },
        { status: { in: ['DRAFT', 'WAITING_CONFIRMATION'] } },
      ],
    },
    include: {
      category: true,
      location: true,
      candidate_dates: {
        orderBy: { candidate_date: 'asc' },
      },
      created_by: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { created_at: 'desc' },
    ],
  });

  // Check which events are overdue (e.g. estimated_month < currentMonthStr)
  return events.map((event) => {
    let isOverdue = false;
    if (event.estimated_month && event.estimated_month < currentMonthStr) {
      isOverdue = true;
    }
    return {
      ...event,
      isOverdue,
    };
  });
}

export async function getEventById(id: string) {
  const event = await prisma.event.findFirst({
    where: { id, is_deleted: false },
    include: {
      category: true,
      location: true,
      candidate_dates: {
        orderBy: { candidate_date: 'asc' },
      },
      attachments: {
        orderBy: { created_at: 'desc' },
      },
      created_by: {
        select: { id: true, name: true, username: true },
      },
      updated_by: {
        select: { id: true, name: true, username: true },
      },
    },
  });

  if (!event) return null;

  // Run a conflict check against other active events
  const conflictReport = await checkScheduleConflicts({
    eventIdToExclude: event.id,
    locationId: event.location_id,
    datePrecision: event.date_precision,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    isAllDay: event.is_all_day,
    candidateDates: event.candidate_dates.map((c) => c.candidate_date),
    estimatedMonth: event.estimated_month,
  });

  return {
    ...event,
    category: event.category
      ? {
          ...event.category,
          effective_document_slots: getEffectiveDocumentSlots(event.category),
        }
      : event.category,
    conflictReport,
  };
}

export interface ArchiveFilterQuery {
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  search?: string;
  categoryId?: string;
  month?: string; // YYYY-MM
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  docFilter?: 'all' | 'has_media' | 'has_pdf' | 'complete' | 'missing';
}

function isMediaAttachment(fileName: string, mimeType?: string | null): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime === 'application/vnd.google-apps.folder' ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)
  );
}

function isPdfAttachment(fileName: string, mimeType?: string | null): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || '').toLowerCase();
  return mime.includes('pdf') || ext === 'pdf';
}

/**
 * Mengambil arsip kegiatan yang sudah terlaksana / lewat tanggal secara ringan:
 * - Server-side pagination (default 12 item/halaman)
 * - Hanya mengembalikan ringkasan lampiran & maksimal 1 cover thumbnail ringan (bukan seluruh daftar file)
 */
export async function getArchivedEvents(filters: ArchiveFilterQuery) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 12));
  const sortDir: 'asc' | 'desc' = filters.sort === 'asc' ? 'asc' : 'desc';

  // Hitung awal hari ini (WIB / UTC+7) agar kegiatan hari ini belum masuk arsip kecuali statusnya COMPLETED
  const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayStrWib = nowWib.toISOString().split('T')[0];
  const startOfTodayUtc = new Date(`${todayStrWib}T00:00:00.000Z`);

  const andConditions: any[] = [
    { is_deleted: false },
    { status: { not: 'CANCELLED' } },
    {
      OR: [
        { status: 'COMPLETED' },
        {
          AND: [
            { date_precision: 'EXACT' },
            { event_date: { lt: startOfTodayUtc } },
          ],
        },
      ],
    },
  ];

  if (filters.categoryId) {
    andConditions.push({ category_id: filters.categoryId });
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { location_name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { contact_info: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    const [yr, mo] = filters.month.split('-').map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const start = new Date(`${filters.month}-01T00:00:00.000Z`);
    const end = new Date(`${filters.month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`);
    andConditions.push({
      event_date: { gte: start, lte: end },
    });
  } else if (filters.startDate || filters.endDate) {
    const dateRange: any = {};
    if (filters.startDate) dateRange.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
    if (filters.endDate) dateRange.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
    andConditions.push({ event_date: dateRange });
  }

  // Filter kelengkapan dokumentasi di level PostgreSQL bila memungkinkan
  const mediaPrismaCondition = {
    OR: [
      { mime_type: { startsWith: 'image/' } },
      { mime_type: { startsWith: 'video/' } },
      { mime_type: 'application/vnd.google-apps.folder' },
    ],
  };
  const pdfPrismaCondition = {
    OR: [
      { mime_type: { contains: 'pdf' } },
      { file_name: { endsWith: '.pdf', mode: 'insensitive' as const } },
    ],
  };

  // Base where tanpa docFilter (untuk menghitung summary statistik cepat)
  const baseWhere = { AND: [...andConditions] };

  const filteredConditions = [...andConditions];
  if (filters.docFilter === 'has_media') {
    filteredConditions.push({ attachments: { some: mediaPrismaCondition } });
  } else if (filters.docFilter === 'has_pdf') {
    filteredConditions.push({ attachments: { some: pdfPrismaCondition } });
  } else if (filters.docFilter === 'complete') {
    filteredConditions.push({ attachments: { some: mediaPrismaCondition } });
    filteredConditions.push({ attachments: { some: pdfPrismaCondition } });
  } else if (filters.docFilter === 'missing') {
    filteredConditions.push({ attachments: { none: {} } });
  }

  const finalWhere = { AND: filteredConditions };

  const [totalItems, totalArchived, withMediaCount, withPdfCount, missingDocCount, rows] =
    await Promise.all([
      prisma.event.count({ where: finalWhere }),
      prisma.event.count({ where: baseWhere }),
      prisma.event.count({
        where: { AND: [...andConditions, { attachments: { some: mediaPrismaCondition } }] },
      }),
      prisma.event.count({
        where: { AND: [...andConditions, { attachments: { some: pdfPrismaCondition } }] },
      }),
      prisma.event.count({
        where: { AND: [...andConditions, { attachments: { none: {} } }] },
      }),
      prisma.event.findMany({
        where: finalWhere,
        select: {
          id: true,
          name: true,
          status: true,
          date_precision: true,
          event_date: true,
          start_time: true,
          end_time: true,
          is_all_day: true,
          location_name: true,
          contact_info: true,
          category: {
            select: { id: true, name: true, color: true, document_slots: true },
          },
          location: {
            select: { id: true, name: true },
          },
          attachments: {
            select: {
              id: true,
              file_name: true,
              mime_type: true,
              slot_key: true,
              slot_label: true,
              drive_file_id: true,
              drive_view_url: true,
            },
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: [
          { event_date: { sort: sortDir, nulls: 'last' } },
          { updated_at: sortDir },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

  const items = rows.map((row) => {
    const slots = getEffectiveDocumentSlots(row.category);
    let mediaCount = 0;
    let pdfCount = 0;
    let docCount = 0;
    const docLabelSet = new Set<string>();
    let coverThumb: {
      file_name: string;
      mime_type: string | null;
      drive_file_id: string | null;
      drive_view_url: string;
    } | null = null;

    for (const att of row.attachments) {
      const resolvedSlotKey = resolveAttachmentSlotKey(att, slots);
      const isMedia = resolvedSlotKey === 'MEDIA' || isMediaAttachment(att.file_name, att.mime_type);
      const isPdf = isPdfAttachment(att.file_name, att.mime_type);
      if (isMedia) {
        mediaCount++;
        // Prioritaskan foto sebagai cover thumbnail, fallback ke video
        if (!coverThumb) {
          coverThumb = {
            file_name: att.file_name,
            mime_type: att.mime_type,
            drive_file_id: att.drive_file_id,
            drive_view_url: att.drive_view_url,
          };
        } else if (
          !(coverThumb.mime_type || '').startsWith('image/') &&
          (att.mime_type || '').startsWith('image/')
        ) {
          coverThumb = {
            file_name: att.file_name,
            mime_type: att.mime_type,
            drive_file_id: att.drive_file_id,
            drive_view_url: att.drive_view_url,
          };
        }
      } else {
        docCount++;
        if (isPdf) pdfCount++;
        const matchedSlot = slots.find((s) => s.key === resolvedSlotKey);
        const label = matchedSlot?.label || att.slot_label || (isPdf ? 'PDF' : 'Dokumen');
        docLabelSet.add(label);
      }
    }

    const { attachments: _dropped, ...eventSummary } = row;
    return {
      ...eventSummary,
      docSummary: {
        mediaCount,
        pdfCount,
        docCount,
        docLabels: Array.from(docLabelSet).slice(0, 3),
        totalAttachments: row.attachments.length,
        coverThumb,
      },
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
    summary: {
      totalArchived,
      withMediaCount,
      withPdfCount,
      missingDocCount,
    },
  };
}
