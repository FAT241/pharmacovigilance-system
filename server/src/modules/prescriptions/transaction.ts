import { Prisma } from '@prisma/client'
import { database } from '../../database'
import { HttpError } from '../../http'

export async function lockEncounter(tx: Prisma.TransactionClient, where: { id: string; patientId: string }, doctorId: string) {
  await tx.$queryRaw`SELECT id FROM encounters WHERE id = ${where.id}::uuid AND patient_id = ${where.patientId}::uuid FOR UPDATE`
  const encounter = await tx.encounter.findUniqueOrThrow({ where })
  if (encounter.doctorId !== doctorId) throw new HttpError(403, 'Chỉ bác sĩ phụ trách được thao tác trong đợt này.')
  return encounter
}
export function requireCurrent(encounter: { version: number; dischargedAt: Date | null }, expected: number) {
  if (encounter.dischargedAt || encounter.version !== expected) throw new HttpError(409, 'Hồ sơ đã thay đổi. Hãy tải lại và kiểm tra lại y lệnh.')
}

// A serializable snapshot also covers simultaneous changes to medication composition and active rules.
export async function transact<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try { return await database.$transaction(work, { isolationLevel: 'Serializable' }) }
    catch (cause) {
      if (!(cause instanceof Prisma.PrismaClientKnownRequestError) || cause.code !== 'P2034') throw cause
      if (attempt >= 2) throw new HttpError(409, 'Hồ sơ đang được cập nhật. Vui lòng thử lại.')
    }
  }
}
