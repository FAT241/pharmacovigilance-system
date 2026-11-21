import { Router } from 'express'
import { z } from 'zod'
import { database } from '../../database'
import { HttpError } from '../../http'
import { lockEncounter, transact } from '../prescriptions/transaction'
import { effectiveAt } from '../prescriptions/course'
import { scheduleSlots } from '../prescriptions/schedule'
import { generateDraft } from './local-model'

export const explanationsRouter = Router({ mergeParams: true })
const scope = z.object({ id: z.string().uuid(), patientId: z.string().uuid(), itemId: z.string().uuid() })
const confirmedDrug = z.object({ id: z.string(), name: z.string(), strength: z.string() })

explanationsRouter.post('/generate', async (req, res) => {
  const { itemId, ...where } = scope.parse(req.params)
  const { revision, regimen, excerpt } = await transact(async tx => {
    const encounter = await lockEncounter(tx, where, res.locals.account.id)
    if (encounter.dischargedAt) throw new HttpError(409, 'Đợt đã xuất viện.')
    const item = await tx.prescriptionItem.findUniqueOrThrow({ where: { id: itemId, encounterId: where.id, ...effectiveAt(new Date()) },
      include: { medication: true, explanation: true, checks: { where: { confirmedAt: { not: null } }, take: 1 } } })
    const previous = item.explanation
    if (previous?.status === 'APPROVED') throw new HttpError(409, 'Y lệnh đã có giải thích được duyệt.')
    if (previous?.status === 'GENERATING' && Date.now() - previous.updatedAt.getTime() < 180000) throw new HttpError(409, 'Đang soạn giải thích.')
    const source = item.medication.referenceSource, excerpt = item.medication.referenceText
    if (!source || !excerpt) throw new HttpError(422, 'Cần quản trị viên nhập nguồn và trích đoạn đã kiểm tra trong danh mục thuốc.')
    const snapshot = z.object({ orders: z.array(confirmedDrug) }).parse(item.checks[0]?.contextSnapshot)
    const drug = snapshot.orders.find(row => row.id === itemId)
    if (!drug) throw new HttpError(409, 'Không tìm thấy y lệnh trong bản xác nhận.')
    const { timesPerDay, slots } = z.object({ timesPerDay: z.number().int().positive(), slots: scheduleSlots.optional() }).parse(item.schedule)
    const data = { source, excerpt, status: 'GENERATING' as const, failure: null, draft: null }
    const row = await tx.explanation.upsert({ where: { itemId }, create: { itemId, ...data }, update: { ...data, revision: { increment: 1 } } })
    return { revision: row.revision, excerpt, regimen: { medication: drug.name, strength: drug.strength, dose: item.dose.toString(),
      unit: item.doseUnit === 'ML' ? 'mL' : 'viên', route: item.route, timesPerDay, slots, durationDays: item.durationDays } }
  })
  let draft: string
  try { draft = await generateDraft(regimen, excerpt) } catch (error) {
    const failure = error instanceof Error ? error.message : 'AI chưa soạn được nội dung.'
    await database.explanation.updateMany({ where: { itemId, revision, status: 'GENERATING' }, data: { status: 'FAILED', failure } })
    throw new HttpError(503, failure)
  }
  const saved = await database.explanation.updateMany({ where: { itemId, revision, status: 'GENERATING' }, data: { status: 'DRAFT', draft } })
  if (!saved.count) throw new HttpError(409, 'Đã có lần soạn mới hơn.')
  res.json({ status: 'DRAFT', revision })
})

explanationsRouter.post(['/approve', '/edit'], async (req, res) => {
  const { itemId, ...where } = scope.parse(req.params)
  const { text, revision } = z.object({ text: z.string().trim().min(1).max(5000), revision: z.number().int().positive() }).parse(req.body)
  const doctorId = res.locals.account.id
  res.json(await transact(async tx => {
    const encounter = await lockEncounter(tx, where, doctorId)
    if (encounter.dischargedAt) throw new HttpError(409, 'Đợt đã xuất viện.')
    const item = await tx.prescriptionItem.findUniqueOrThrow({ where: { id: itemId, encounterId: where.id, ...effectiveAt(new Date()) }, include: { explanation: true, medication: true } })
    if (item.explanation?.status !== 'DRAFT' || item.explanation.revision !== revision ||
        item.explanation.source !== item.medication.referenceSource || item.explanation.excerpt !== item.medication.referenceText) {
      throw new HttpError(409, 'Bản nháp hoặc nguồn đã thay đổi. Vui lòng soạn và kiểm tra lại.')
    }
    if (req.path === '/edit') return tx.explanation.update({ where: { itemId, revision },
      data: { draft: text, revision: { increment: 1 } }, select: { status: true, revision: true } })
    return tx.explanation.update({ where: { itemId, revision }, data: {
      status: 'APPROVED', approvedText: text, approvedBy: doctorId, approvedAt: new Date(), revision: { increment: 1 },
    }, select: { status: true, approvedAt: true } })
  }))
})
