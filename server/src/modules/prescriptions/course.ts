import { database } from '../../database'
import type { Prisma } from '@prisma/client'

export const orderRoutes = ['Uống', 'Ngậm dưới lưỡi', 'Qua ống thông'] as const
export function effectiveAt(now: Date) {
  return { status: 'ACTIVE' as const, OR: [{ endedAt: null }, { endedAt: { gt: now } }] }
}
export function closeExpired(scope: Prisma.PrescriptionItemWhereInput) {
  return database.prescriptionItem.updateMany({ where: { ...scope, status: 'ACTIVE', endedAt: { lte: new Date() } },
    data: { status: 'ENDED', endReason: 'COURSE_COMPLETE' } })
}
