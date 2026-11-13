import { prisma } from '../config/db.js';
import { checkScheduleConflicts } from './conflictService.js';

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
    conflictReport,
  };
}
