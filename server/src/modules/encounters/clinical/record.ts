import { Prisma } from '@prisma/client'
import { database } from '../../../database'
import { HttpError } from '../../../http'
import { refreshCheckedDrafts } from '../../prescriptions/draft-check'
import { fixedSchedule } from '../../prescriptions/schedule'
import { observationKinds, type ClinicalChange } from './input'

export const clinicalSelect = {
  orders: { orderBy: { id: 'asc' }, include: {
    explanation: { select: { status: true, draft: true, approvedText: true, source: true, excerpt: true, failure: true, revision: true, updatedAt: true } },
    medication: { select: { name: true, code: true, strength: true } },
    checks: { orderBy: [{ encounterVersion: 'desc' }, { checkedAt: 'desc' }, { id: 'desc' }], select: {
      id: true, encounterVersion: true, checkedAt: true, status: true, confirmedAt: true, overrideReason: true,
      results: { orderBy: { ruleCode: 'asc' }, select: { ruleCode: true, ruleVersion: true, outcome: true, message: true,
        evidence: true, missingFields: true } },
    } },
  } },
  progressNotes: { orderBy: { recordedAt: 'desc' } },
  admissionNote: true, admittedAt: true, dischargeCondition: true, followUpAdvice: true, doctor: { select: { fullName: true } },
  checks: { orderBy: { checkedAt: 'desc' }, take: 1, select: { checkedAt: true, status: true } },
  version: true, dischargedAt: true, doctorId: true, diagnoses: { orderBy: { code: 'asc' } },
  patient: { select: { patientCode: true, historyNote: true, conditions: { orderBy: { code: 'asc' } } } },
  observations: { orderBy: { measuredAt: 'desc' } },
  publishedAdvice: true, publishedAt: true, publishedDiagnoses: true,
  allergyStatus: true, allergens: { orderBy: { name: 'asc' } },
  weights: { orderBy: { measuredAt: 'desc' } },
  reconciliation: {
    orderBy: { homeMedication: { recordedAt: 'asc' } },
    include: { draftItem: true, homeMedication: { include: { medication: {
      select: { id: true, name: true, code: true, strength: true, baseUnit: true, active: true },
    } } } },
  },
} satisfies Prisma.EncounterSelect

export async function updateClinical(where: { patientId: string; id: string }, doctorId: string, change: ClinicalChange) {
  return database.$transaction(async tx => {
    const encounter = await tx.encounter.findUniqueOrThrow({ where })
    if (encounter.doctorId !== doctorId) throw new HttpError(403, 'Chỉ bác sĩ phụ trách được sửa hồ sơ.')
    const locked = await tx.encounter.updateMany({
      where: { ...where, version: change.version, dischargedAt: null }, data: { version: { increment: 1 } },
    })
    if (!locked.count) throw new HttpError(409, 'Đợt điều trị đã thay đổi hoặc đã đóng. Vui lòng tải lại hồ sơ.')

    if (change.action === 'PROFILE') {
      if ((change.allergyStatus === 'REPORTED') !== Boolean(change.allergens.length)) {
        throw new HttpError(400, 'Trạng thái dị ứng và danh sách tác nhân chưa khớp.')
      }
      const diseaseCodes = [...new Set([...change.diagnoses, ...(change.conditions ?? [])])]
      const diseaseCount = await tx.disease.count({ where: { code: { in: diseaseCodes } } })
      const allergenCount = await tx.allergen.count({ where: { code: { in: change.allergens } } })
      if (diseaseCount !== diseaseCodes.length || allergenCount !== change.allergens.length) {
        throw new HttpError(400, 'Mã chẩn đoán hoặc tác nhân dị ứng chưa có trong danh mục.')
      }
      await tx.encounter.update({ where, data: {
        patient: { update: { historyNote: change.historyNote, conditions: { set: change.conditions?.map(code => ({ code })) } } },
        diagnoses: { set: change.diagnoses.map(code => ({ code })) },
        allergyStatus: change.allergyStatus, allergens: { set: change.allergens.map(code => ({ code })) },
        weights: change.kilograms === undefined ? undefined : { create: { kilograms: change.kilograms } },
      } })
    } else if (change.action === 'OBSERVATION') {
      const measuredAt = new Date(change.measuredAt)
      if (measuredAt < encounter.admittedAt || measuredAt.getTime() > Date.now()) throw new HttpError(400, 'Thời điểm đo phải nằm trong đợt điều trị và không ở tương lai.')
      await tx.observation.create({ data: { encounterId: where.id, kind: change.kind, unit: observationKinds[change.kind][1], value: change.value, measuredAt } })
    } else if (change.action === 'OBSERVATIONS_BATCH') {
      const measuredAt = new Date(change.measuredAt)
      if (measuredAt < encounter.admittedAt || measuredAt.getTime() > Date.now()) throw new HttpError(400, 'Thời điểm đo phải nằm trong đợt điều trị và không ở tương lai.')
      for (const item of change.items) {
        await tx.observation.create({
          data: {
            encounterId: where.id,
            kind: item.kind,
            unit: observationKinds[item.kind][1],
            value: item.value,
            measuredAt,
          },
        })
      }
    } else if (change.action === 'DELETE_OBSERVATION') {
      await tx.observation.deleteMany({
        where: { id: change.observationId, encounterId: where.id },
      })
    } else if (change.action === 'PROGRESS_NOTE') {
      await tx.progressNote.create({ data: { encounterId: where.id, body: change.body } })
    } else if (change.action === 'PUBLISH') {
      const diagnoses = await tx.disease.findMany({ where: { encounters: { some: { id: where.id } } }, orderBy: { code: 'asc' } })
      await tx.encounter.update({ where, data: { publishedAdvice: change.advice, publishedAt: new Date(),
        publishedDiagnoses: diagnoses.map(d => d.code + ' · ' + d.name) } })
    } else if (change.action === 'ADD_MEDICATION') {
      const medication = await tx.medication.findFirst({ where: { id: change.medicationId, active: true } })
      if (!medication) throw new HttpError(400, 'Thuốc chưa có trong danh mục đang sử dụng.')
      const duplicate = await tx.medicationReview.findFirst({ where: {
        encounterId: where.id, homeMedication: { medicationId: change.medicationId },
      } })
      if (duplicate) throw new HttpError(409, 'Thuốc đã có trong danh sách đối chiếu của đợt này.')
      await tx.patientMedication.create({ data: {
        patientId: where.patientId, medicationId: medication.id, reviews: { create: { encounterId: where.id } },
      } })
    } else if (change.action === 'REMOVE_MEDICATION') {
      const review = await tx.medicationReview.findUniqueOrThrow({
        where: { id: change.reviewId, encounterId: where.id },
      })
      if (review.decision !== 'PENDING') throw new HttpError(409, 'Chỉ có thể xóa dòng thuốc đang chờ đối chiếu.')
      await tx.medicationReview.delete({ where: { id: review.id } })
    } else {
      const review = await tx.medicationReview.findUniqueOrThrow({
        where: { id: change.reviewId, encounterId: where.id }, include: { homeMedication: { include: { medication: true } } },
      })
      if (review.decision !== 'PENDING') throw new HttpError(409, 'Dòng thuốc này đã được đối chiếu.')
      const medication = review.homeMedication.medication
      if (change.action === 'CONTINUE' && !medication.active) throw new HttpError(409, 'Thuốc đã ngừng sử dụng trong danh mục.')
      if (change.action === 'CONTINUE' && change.slots?.length && change.slots.length !== change.timesPerDay) throw new HttpError(400, 'Số buổi dùng và số lần mỗi ngày chưa khớp.')
      const decidedAt = new Date()
      await tx.medicationReview.update({ where: { id: review.id }, data: {
        decision: change.action, decidedAt, stopReason: change.action === 'STOP' ? change.reason : undefined,
        draftItem: change.action === 'CONTINUE' ? { create: {
          encounterId: where.id, medicationId: medication.id,
          dose: change.dose, doseUnit: medication.baseUnit, route: change.route, durationDays: change.durationDays,
          schedule: fixedSchedule(change.timesPerDay, change.slots),
        } } : undefined,
      } })
      if (change.action === 'STOP') await tx.patientMedication.update({
        where: { id: review.patientMedicationId }, data: { endedAt: decidedAt },
      })
    }
    await refreshCheckedDrafts(tx, where.id, doctorId, change.version + 1)
    return tx.encounter.findUniqueOrThrow({ where, select: clinicalSelect })
  })
}
