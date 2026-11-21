import { z } from 'zod'
import { database } from '../../database'
import { closeExpired } from '../prescriptions/course'

const snapshot = z.object({ orders: z.array(z.object({ id: z.string(), name: z.string(), strength: z.string() })) })
export async function patientTreatment(userId: string) {
  await closeExpired({ encounter: { patient: { userId } } })
  const encounters = await database.encounter.findMany({ where: { patient: { userId } }, orderBy: { admittedAt: 'desc' },
    select: { id: true, admittedAt: true, dischargedAt: true, dischargeCondition: true, followUpAdvice: true, publishedAt: true, publishedDiagnoses: true, publishedAdvice: true,
      orders: { where: { startedAt: { not: null }, status: { not: 'DRAFT' } }, orderBy: { startedAt: 'desc' }, select: {
        id: true, status: true, startedAt: true, endedAt: true, dose: true, doseUnit: true, route: true, durationDays: true, schedule: true,
        medication: { select: { name: true, strength: true } },
        explanation: { select: { status: true, approvedText: true } },
        checks: { where: { confirmedAt: { not: null } }, take: 1, select: { contextSnapshot: true } },
      } },
    },
  })
  return encounters.map(({ orders, ...encounter }) => ({ ...encounter, orders: orders.map(({ checks, medication, explanation, ...order }) => {
    const saved = snapshot.safeParse(checks[0]?.contextSnapshot)
    const original = saved.success && saved.data.orders.find(o => o.id === order.id)
    return { ...order, name: original ? original.name : medication.name, strength: original ? original.strength : medication.strength,
      explanation: explanation?.status === 'APPROVED' ? explanation.approvedText : null }
  }) }))
}
