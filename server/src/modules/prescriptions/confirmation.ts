import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import { HttpError } from '../../http'
import { lockEncounter, transact } from './transaction'
import { readContext } from './context'
import { checkDraft, refreshCheckedDrafts } from './draft-check'

const uuid = z.string().uuid().toLowerCase()
export const confirmation = z.object({
  checkId: uuid, idempotencyKey: uuid, reason: z.string().trim().max(1000).default(''),
})
const receipt = { id: true, itemId: true, status: true, confirmedAt: true, overrideReason: true } as const

export async function confirmOrder(where: { id: string; patientId: string }, itemId: string, doctorId: string, input: z.infer<typeof confirmation>) {
  const { checkId, idempotencyKey, reason } = input
  const hash = createHash('sha256').update(JSON.stringify([where.patientId.toLowerCase(), where.id.toLowerCase(), itemId.toLowerCase(), checkId, reason])).digest('hex')
  const result = await transact(async tx => {
    const encounter = await lockEncounter(tx, where, doctorId)
    const saved = await tx.prescription.findUnique({
      where: { doctorId_idempotencyKey: { doctorId, idempotencyKey } }, select: { requestHash: true, check: { select: receipt } },
    })
    if (saved) {
      if (saved.requestHash !== hash) throw new HttpError(409, 'Khóa xác nhận đã được dùng cho yêu cầu có nội dung khác.')
      return saved.check
    }
    const checked = await tx.ruleCheck.findUniqueOrThrow({
      where: { id: checkId, itemId, encounterId: where.id, requestedBy: doctorId }, include: { prescription: true },
    })
    if (checked.confirmedAt) {
      if (checked.prescription?.idempotencyKey || (checked.overrideReason ?? '') !== reason) {
        throw new HttpError(409, 'Y lệnh đã được xác nhận bằng yêu cầu khác.')
      }
      // Migrated confirmations predate client keys. Bind the first matching retry.
      await tx.prescription.update({ where: { checkId }, data: { idempotencyKey, requestHash: hash } })
      return tx.ruleCheck.findUniqueOrThrow({ where: { id: checkId }, select: receipt })
    }
    const item = await tx.prescriptionItem.findUniqueOrThrow({ where: { id: itemId, encounterId: where.id } })
    if (encounter.dischargedAt || item.status !== 'DRAFT') throw new HttpError(409, 'Đợt đã đóng hoặc y lệnh không còn là bản nháp.')
    if (checked.status === 'ERROR') throw new HttpError(409, 'Lần kiểm tra gặp lỗi. Cần thử lại trước khi xác nhận.')
    const stale = async () => {
      await checkDraft(tx, where.id, itemId, doctorId, encounter.version)
      return null
    }
    if (checked.encounterVersion !== encounter.version) return stale()
    let context
    try { context = await readContext(tx, where.id, itemId) } catch (error) {
      if (error instanceof HttpError) return stale()
      throw error
    }
    if (!isDeepStrictEqual(checked.contextSnapshot, JSON.parse(JSON.stringify(context)))) return stale()
    if (checked.status !== 'NO_ALERT' && !reason) throw new HttpError(400, 'Cần ghi lý do trước khi tiếp tục kê.')
    const confirmedAt = new Date()
    const updated = await tx.encounter.updateMany({ where: { ...where, version: checked.encounterVersion, dischargedAt: null }, data: { version: { increment: 1 } } })
    if (!updated.count) throw new HttpError(409, 'Hồ sơ vừa thay đổi. Vui lòng tải lại hồ sơ.')
    if (context.replacesItemId) await tx.prescriptionItem.update({
      where: { id: context.replacesItemId, encounterId: where.id, status: 'ACTIVE' },
      data: { status: 'REPLACED', endedAt: confirmedAt, endReason: 'REPLACED' },
    })
    await tx.prescriptionItem.update({ where: { id: itemId, status: 'DRAFT' }, data: { status: 'ACTIVE', startedAt: confirmedAt,
      endedAt: item.durationDays ? new Date(confirmedAt.getTime() + item.durationDays * 86400000) : null } })
    await tx.prescription.create({ data: { encounterId: where.id, doctorId, checkId, confirmedAt, idempotencyKey, requestHash: hash } })
    const response = await tx.ruleCheck.update({ where: { id: checkId }, data: { confirmedAt, overrideReason: reason || null }, select: receipt })
    await refreshCheckedDrafts(tx, where.id, doctorId, encounter.version + 1)
    return response
  })
  // Return the conflict after commit so the doctor can review the newly persisted check.
  if (!result) throw new HttpError(409, 'Dữ liệu đã thay đổi. Hãy xem kết quả kiểm tra mới trước khi xác nhận lại.')
  return result
}
