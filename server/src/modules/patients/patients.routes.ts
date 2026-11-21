import { createPatient, patientProfile as profile, patientSelect as select } from './profile'
import { Router } from 'express'
import { z } from 'zod'
import { database } from '../../database'
import { HttpError } from '../../http'
import { requireSession } from '../auth/session'
import { patientTreatment } from './treatment'

export const patientsRouter = Router()

patientsRouter.get('/', requireSession('DOCTOR', 'ADMIN'), async (_request, response) => {
  response.json(await database.patient.findMany({ select: { ...select, encounters: { orderBy: { admittedAt: 'desc' }, take: 1,
    select: { id: true, admittedAt: true, dischargedAt: true, allergyStatus: true, doctor: { select: { fullName: true } } } } }, orderBy: { patientCode: 'asc' } }))
})

patientsRouter.get('/me', requireSession('PATIENT'), async (_request, response) => {
  const patient = await database.patient.findUnique({ where: { userId: response.locals.account.id }, select })
  if (!patient) throw new HttpError(404, 'Không tìm thấy hồ sơ bệnh nhân.')
  response.json(patient)
})

patientsRouter.get('/me/treatment', requireSession('PATIENT'), async (_request, response) => {
  response.json(await patientTreatment(response.locals.account.id))
})

patientsRouter.post('/', requireSession('DOCTOR'), async (request, response) => {
  response.status(201).json(await createPatient(request.body))
})

patientsRouter.put('/:id', requireSession('DOCTOR'), async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const { fullName, idCard, ...data } = profile.parse(request.body)
  response.json(await database.patient.update({
    where: { id },
    data: { ...data, idCard: idCard || null, user: { update: { fullName } } },
    select,
  }))
})
