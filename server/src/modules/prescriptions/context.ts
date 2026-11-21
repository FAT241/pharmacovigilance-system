import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { HttpError } from '../../http'
import { effectiveAt } from './course'

import { scheduleSlots } from './schedule'

const fixed = z.object({ slots: scheduleSlots.optional(), schemaVersion: z.literal(1), type: z.literal('FIXED'), timesPerDay: z.number().int().positive().max(24) })

export async function readContext(tx: Prisma.TransactionClient, encounterId: string, itemId: string | null) {
  const encounter = await tx.encounter.findUniqueOrThrow({ where: { id: encounterId }, select: {
    patient: { select: { conditions: { orderBy: { code: 'asc' } } } },
    allergyStatus: true, allergens: { orderBy: { code: 'asc' } }, diagnoses: { orderBy: { code: 'asc' } },
    weights: { orderBy: [{ measuredAt: 'desc' }, { id: 'asc' }], take: 1 },
    reconciliation: { where: { decision: 'PENDING' }, select: { id: true }, orderBy: { id: 'asc' } },
    orders: { where: itemId ? { OR: [{ id: itemId }, effectiveAt(new Date())] } : effectiveAt(new Date()), orderBy: { id: 'asc' }, include: {
      medication: { include: { groups: { orderBy: { code: 'asc' } }, allergens: { orderBy: { code: 'asc' } }, activeIngredients: {
        include: { ingredient: true }, orderBy: { ingredientId: 'asc' },
      } } },
    } },
  } })
  const candidate = encounter.orders.find(i => i.id === itemId)
  if (itemId && candidate?.status !== 'DRAFT') throw new HttpError(409, 'Y lệnh không còn ở trạng thái nháp.')
  if (!encounter.orders.length) throw new HttpError(409, 'Chưa có y lệnh đang hiệu lực để đánh giá.')
  if (candidate && (!candidate.medication.active || candidate.doseUnit !== candidate.medication.baseUnit)) {
    throw new HttpError(409, 'Thuốc đã ngừng sử dụng hoặc đổi đơn vị. Vui lòng chọn lại thuốc.')
  }
  if (candidate?.replacesItemId && !encounter.orders.some(i => i.id === candidate.replacesItemId && i.status === 'ACTIVE')) {
    throw new HttpError(409, 'Y lệnh cần thay thế đã kết thúc.')
  }
  const orders = encounter.orders.filter(i => i.id !== candidate?.replacesItemId).map(i => {
    const schedule = fixed.safeParse(i.schedule)
    return { id: i.id, medicationId: i.medicationId, name: i.medication.name, code: i.medication.code, strength: i.medication.strength,
      dose: i.dose.toString(), unit: i.doseUnit, baseUnit: i.medication.baseUnit,
      timesPerDay: schedule.success ? schedule.data.timesPerDay : null,
      ...(schedule.success && schedule.data.slots?.length ? { slots: schedule.data.slots } : {}),
      route: i.route, durationDays: i.durationDays, groups: i.medication.groups.map(g => g.code), allergens: i.medication.allergens.map(a => a.code),
      ingredients: i.medication.activeIngredients.map(a => ({ key: a.ingredient.nameKey, amount: a.amount.toString() })),
    }
  })
  const rules = await tx.alertRule.findMany({ where: { active: true }, include: { scopes: { orderBy: { diseaseCode: 'asc' } } }, orderBy: { code: 'asc' } })
  if (!rules.length) throw new HttpError(503, 'Chưa có luật kiểm tra đang hoạt động.')
  return {
    itemId, replacesItemId: candidate?.replacesItemId ?? null, orders, rules,
    pending: encounter.reconciliation.map(r => r.id), allergyStatus: encounter.allergyStatus,
    allergens: encounter.allergens.map(a => a.code), diagnoses: [...new Set([...encounter.diagnoses, ...encounter.patient.conditions].map(d => d.code))].sort(),
    kilograms: encounter.weights[0]?.kilograms.toString() ?? null,
  }
}
export type CheckContext = Awaited<ReturnType<typeof readContext>>
