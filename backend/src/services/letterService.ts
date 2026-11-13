import { prisma } from '../config/db.js';

export interface CreateLetterDTO {
  template_type: string;
  title: string;
  reference_no?: string | null;
  event_id?: string | null;
  created_by_id: string;
  payload_json: string;
}

export async function getAllLetters(userId?: string) {
  return prisma.letterRecord.findMany({
    where: userId ? { created_by_id: userId } : undefined,
    include: {
      created_by: {
        select: { id: true, name: true, username: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getLetterById(id: string) {
  return prisma.letterRecord.findUnique({
    where: { id },
    include: {
      created_by: {
        select: { id: true, name: true, username: true },
      },
    },
  });
}

export async function createLetter(dto: CreateLetterDTO) {
  return prisma.letterRecord.create({
    data: {
      template_type: dto.template_type,
      title: dto.title,
      reference_no: dto.reference_no,
      event_id: dto.event_id,
      created_by_id: dto.created_by_id,
      payload_json: dto.payload_json,
    },
    include: {
      created_by: {
        select: { id: true, name: true, username: true },
      },
    },
  });
}

export async function updateLetter(id: string, dto: Partial<CreateLetterDTO>) {
  return prisma.letterRecord.update({
    where: { id },
    data: {
      template_type: dto.template_type,
      title: dto.title,
      reference_no: dto.reference_no,
      event_id: dto.event_id,
      payload_json: dto.payload_json,
    },
    include: {
      created_by: {
        select: { id: true, name: true, username: true },
      },
    },
  });
}

export async function deleteLetter(id: string) {
  return prisma.letterRecord.delete({
    where: { id },
  });
}
