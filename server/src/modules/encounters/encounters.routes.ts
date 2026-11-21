import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { database } from '../../database'
import { HttpError } from '../../http'
import { requireSession } from '../auth/session'
import { clinicalRouter } from './clinical/clinical.routes'
import { prescriptionsRouter } from '../prescriptions/prescriptions.routes'
import { checkHistoryRouter } from '../prescriptions/check-history.routes'
import { closeExpired, effectiveAt } from '../prescriptions/course'
import { explanationsRouter } from '../explanations/explanations.routes'

export const encountersRouter = Router({ mergeParams: true })
const patientParams = z.object({ patientId: z.string().uuid() })
const encounterParams = patientParams.extend({ id: z.string().uuid() })
const admission = z.object({ admissionNote: z.string().trim().max(1000).optional(), diagnoses: z.array(z.string().trim().min(1).max(50)).max(50).default([]), progress: z.string().trim().max(3000).optional() })
const include = { doctor: { select: { fullName: true } } } as const

const readEncounter = requireSession('DOCTOR', 'ADMIN')
const writeEncounter = requireSession('DOCTOR')
encountersRouter.use((req, res, next) => {
  const authorize = ['GET', 'HEAD'].includes(req.method) ? readEncounter : writeEncounter
  return authorize(req, res, next)
})
encountersRouter.get('/admission-options', async (_req, res) => {
  res.json(await database.disease.findMany({ orderBy: { code: 'asc' } }))
})
encountersRouter.use('/:id', async (req, _res, next) => {
  const { id, patientId } = encounterParams.parse(req.params)
  await closeExpired({ encounterId: id, encounter: { patientId } })
  next()
})
encountersRouter.use('/:id/clinical', clinicalRouter)
encountersRouter.use('/:id/orders', prescriptionsRouter)
encountersRouter.use('/:id/orders/:itemId/explanation', explanationsRouter)
encountersRouter.use('/:id/checks', checkHistoryRouter)

encountersRouter.get('/', async (request, response) => {
  const { patientId } = patientParams.parse(request.params)
  const patient = await database.patient.findUniqueOrThrow({
    where: { id: patientId },
    select: { encounters: { include, orderBy: { admittedAt: 'desc' } } },
  })
  response.json(patient.encounters)
})

encountersRouter.post('/', async (request, response) => {
  const { patientId } = patientParams.parse(request.params)
  const { admissionNote, diagnoses, progress } = admission.parse(request.body)
  try {
    const encounter = await database.$transaction(async tx => {
      if (await tx.disease.count({ where: { code: { in: diagnoses } } }) !== diagnoses.length) throw new HttpError(400, 'Chẩn đoán nhập viện trùng hoặc không tồn tại.')
      const created = await tx.encounter.create({
        data: { patientId, doctorId: response.locals.account.id, admissionNote: admissionNote || null,
          diagnoses: { connect: diagnoses.map(code => ({ code })) }, progressNotes: progress ? { create: { body: progress } } : undefined },
      })
      const previous = await tx.encounter.findFirst({
        where: { patientId, dischargedAt: { not: null } }, orderBy: { dischargedAt: 'desc' },
        select: { allergyStatus: true, allergens: { select: { code: true } } },
      })
      const home = await tx.patientMedication.findMany({ where: { patientId, endedAt: null }, select: { id: true } })
      return tx.encounter.update({ where: { id: created.id }, data: {
        allergyStatus: previous?.allergyStatus, allergens: { connect: previous?.allergens ?? [] },
        reconciliation: { create: home.map(row => ({ patientMedicationId: row.id })) },
      }, include })
    })
    response.status(201).json(encounter)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new HttpError(409, 'Bệnh nhân đang có một đợt điều trị mở.')
      if (error.code === 'P2003') throw new HttpError(404, 'Không tìm thấy hồ sơ tiếp nhận.')
    }
    throw error
  }
})

encountersRouter.post('/:id/discharge', async (request, response) => {
  const { patientId, id } = encounterParams.parse(request.params)
  const doctorId = response.locals.account.id
  const details = z.object({ condition: z.string().trim().max(2000).optional(), followUp: z.string().trim().max(3000).optional(), version: z.number().int().nonnegative().optional() }).parse(request.body ?? {})
  const encounter = await database.$transaction(async tx => {
    const where = { id, patientId }
    const current = await tx.encounter.findUniqueOrThrow({ where, include })
    if (current.doctorId !== doctorId) throw new HttpError(403, 'Chỉ bác sĩ phụ trách được xác nhận xuất viện.')
    if (current.dischargedAt) return current
    const dischargedAt = new Date()
    const closed = await tx.encounter.updateMany({
      where: { ...where, doctorId, dischargedAt: null, version: details.version },
      data: { dischargedAt, dischargeCondition: details.condition || null, followUpAdvice: details.followUp || null, version: { increment: 1 } },
    })
    if (!closed.count && !(await tx.encounter.findUniqueOrThrow({ where })).dischargedAt) throw new HttpError(409, 'Hồ sơ đã thay đổi. Vui lòng mở lại tóm tắt xuất viện.')
    if (closed.count) await tx.prescriptionItem.updateMany({
      where: { encounterId: id, ...effectiveAt(dischargedAt) }, data: { status: 'ENDED', endedAt: dischargedAt, endReason: 'DISCHARGE' },
    })
    return tx.encounter.findUniqueOrThrow({ where, include })
  })
  response.json(encounter)
})
