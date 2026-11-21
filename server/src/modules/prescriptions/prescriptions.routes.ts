import { confirmation, confirmOrder } from './confirmation'
import { Router } from 'express'
import { lockEncounter, requireCurrent, transact } from './transaction'
import { z } from 'zod'

import { HttpError } from '../../http'
import { checkDraft, refreshCheckedDrafts } from './draft-check'
import { fixedSchedule, scheduleSlots } from './schedule'
import { orderRoutes, effectiveAt } from './course'

export const prescriptionsRouter = Router({ mergeParams: true })
const uuid = z.string().uuid()
const scope = z.object({ id: uuid, patientId: uuid })
const version = z.object({ version: z.number().int().nonnegative() })
const draft = version.extend({
  medicationId: uuid, dose: z.number().positive().max(99999999).multipleOf(0.0001),
  timesPerDay: z.number().int().min(1).max(24), replacesItemId: uuid.optional(),
  slots: scheduleSlots.optional(), route: z.enum(orderRoutes).optional(), durationDays: z.number().int().min(1).max(365).nullish(),
})

async function saveDraft(where: z.infer<typeof scope>, doctorId: string, data: z.infer<typeof draft>, itemId?: string) {
  if (data.slots?.length && data.slots.length !== data.timesPerDay) throw new HttpError(400, 'Số buổi dùng và số lần mỗi ngày chưa khớp.')
  return transact(async tx => {
    requireCurrent(await lockEncounter(tx, where, doctorId), data.version)
    const medication = await tx.medication.findUniqueOrThrow({ where: { id: data.medicationId, active: true } })
    if (data.replacesItemId) await tx.prescriptionItem.findUniqueOrThrow({
      where: { id: data.replacesItemId, encounterId: where.id, status: 'ACTIVE' },
    })
    const values = { medicationId: medication.id, dose: data.dose, doseUnit: medication.baseUnit, route: data.route, durationDays: data.durationDays,
      schedule: fixedSchedule(data.timesPerDay, data.slots) }
    let savedId = itemId
    if (itemId) {
      const current = await tx.prescriptionItem.findUniqueOrThrow({ where: { id: itemId, encounterId: where.id, status: 'DRAFT' } })
      if (current.reviewId && current.medicationId !== medication.id) throw new HttpError(409, 'Y lệnh từ đối chiếu phải giữ thuốc đã quyết định tiếp tục.')
      await tx.prescriptionItem.update({ where: { id: itemId, encounterId: where.id, status: 'DRAFT' }, data: values })
    } else {
      const created = await tx.prescriptionItem.create({ data: { ...values, encounterId: where.id, replacesItemId: data.replacesItemId } })
      savedId = created.id
    }
    const updated = await tx.encounter.update({ where, data: { version: { increment: 1 } }, select: { version: true } })
    await refreshCheckedDrafts(tx, where.id, doctorId, updated.version, itemId)
    return { ...updated, itemId: savedId }
  })
}
prescriptionsRouter.post('/', async (req, res) => {
  res.status(201).json(await saveDraft(scope.parse(req.params), res.locals.account.id, draft.parse(req.body)))
})
prescriptionsRouter.put('/:itemId', async (req, res) => {
  res.json(await saveDraft(scope.parse(req.params), res.locals.account.id, draft.parse(req.body), uuid.parse(req.params.itemId)))
})

prescriptionsRouter.delete('/:itemId', async (req, res) => {
  const where = scope.parse(req.params), itemId = uuid.parse(req.params.itemId)
  const doctorId = res.locals.account.id
  res.json(await transact(async tx => {
    const enc = await lockEncounter(tx, where, doctorId)
    if (enc.dischargedAt) throw new HttpError(409, 'Đợt điều trị đã đóng.')
    const item = await tx.prescriptionItem.findUniqueOrThrow({
      where: { id: itemId, encounterId: where.id, status: 'DRAFT' },
    })
    await tx.ruleCheck.deleteMany({ where: { itemId: item.id } })
    if (item.reviewId) {
      await tx.medicationReview.update({
        where: { id: item.reviewId },
        data: { decision: 'PENDING' },
      })
    }
    await tx.prescriptionItem.delete({ where: { id: item.id } })
    const updated = await tx.encounter.update({
      where,
      data: { version: { increment: 1 } },
      select: { version: true },
    })
    await refreshCheckedDrafts(tx, where.id, doctorId, updated.version)
    return { success: true, version: updated.version, deletedId: itemId }
  }))
})

prescriptionsRouter.post('/:itemId/check', async (req, res) => {
  const where = scope.parse(req.params), itemId = uuid.parse(req.params.itemId)
  const expected = version.parse(req.body).version
  const doctorId = res.locals.account.id
  res.status(201).json(await transact(async tx => {
    requireCurrent(await lockEncounter(tx, where, doctorId), expected)
    await tx.prescriptionItem.findUniqueOrThrow({ where: { id: itemId, encounterId: where.id, status: 'DRAFT' } })
    return checkDraft(tx, where.id, itemId, doctorId, expected)
  }))
})

prescriptionsRouter.post('/:itemId/stop', async (req, res) => {
  const where = scope.parse(req.params), id = uuid.parse(req.params.itemId)
  const input = version.extend({ reason: z.string().trim().min(1).max(500) }).parse(req.body)
  res.json(await transact(async tx => {
    requireCurrent(await lockEncounter(tx, where, res.locals.account.id), input.version)
    const endedAt = new Date()
    const result = await tx.prescriptionItem.updateMany({ where: { id, encounterId: where.id, ...effectiveAt(endedAt) },
      data: { status: 'ENDED', endedAt, endReason: input.reason } })
    if (!result.count) throw new HttpError(409, 'Y lệnh đã kết thúc hoặc không thuộc đợt này.')
    const updated = await tx.encounter.update({ where, data: { version: { increment: 1 } }, select: { version: true } })
    await refreshCheckedDrafts(tx, where.id, res.locals.account.id, updated.version)
    return updated
  }))
})

prescriptionsRouter.post('/:itemId/confirm', async (req, res) => {
  const where = scope.parse(req.params), itemId = uuid.parse(req.params.itemId)
  res.json(await confirmOrder(where, itemId, res.locals.account.id, confirmation.parse(req.body)))
})
