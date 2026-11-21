import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { database } from '../../database'
import { HttpError } from '../../http'
import { createPatient } from '../patients/profile'
import { accountSelect, requireSession } from '../auth/session'

export const accountsRouter = Router()
accountsRouter.use(requireSession('ADMIN'))

const profile = z.object({
  username: z.string().trim().min(3).max(80).regex(/^[a-z0-9_.-]+$/i).transform(value => value.toLowerCase()),
  fullName: z.string().trim().min(1).max(120),
  department: z.string().trim().min(1).max(120),
  title: z.string().trim().max(120).optional(),
  password: z.string().min(8).max(72).refine(value => Buffer.byteLength(value) <= 72).optional(),
})
const status = z.discriminatedUnion('active', [
  z.object({ active: z.literal(true) }),
  z.object({ active: z.literal(false), reason: z.string().trim().min(1).max(500) }),
])

accountsRouter.get('/', async (_request, response) => {
  response.json(await database.user.findMany({ select: accountSelect, orderBy: { fullName: 'asc' } }))
})

accountsRouter.post('/patients', async (request, response) => {
  response.status(201).json(await createPatient(request.body))
})
accountsRouter.put('/patients/:id', async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const data = z.object({ fullName: z.string().trim().min(1).max(120) }).parse(request.body)
  response.json(await database.user.update({ where: { id, role: 'PATIENT' }, data, select: accountSelect }))
})

accountsRouter.post('/doctors', async (request, response) => {
  const { password, ...data } = profile.parse(request.body)
  if (!password) throw new HttpError(400, 'Vui lòng đặt mật khẩu cho bác sĩ.')
  const account = await database.user.create({
    data: { ...data, role: 'DOCTOR', passwordHash: await bcrypt.hash(password, 10) },
    select: accountSelect,
  })
  response.status(201).json(account)
})

accountsRouter.put('/doctors/:id', async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const { password, ...data } = profile.parse(request.body)
  response.json(await database.user.update({
    where: { id, role: 'DOCTOR' },
    data: {
      ...data,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } } : {}),
    },
    select: accountSelect,
  }))
})

accountsRouter.patch('/:id/status', async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const change = status.parse(request.body)
  response.json(await database.user.update({
    where: { id, role: { in: ['DOCTOR', 'PATIENT'] } },
    data: {
      status: change.active ? 'ACTIVE' : 'DISABLED',
      disabledReason: change.active ? null : change.reason,
      sessionVersion: { increment: 1 },
    },
    select: accountSelect,
  }))
})

accountsRouter.delete('/:id', async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const user = await database.user.findUnique({ where: { id }, include: { patient: true } })
  if (!user) throw new HttpError(404, 'Tài khoản không tồn tại.')
  if (user.role === 'ADMIN') throw new HttpError(400, 'Không thể xóa tài khoản Quản trị viên.')
  if (user.id === response.locals.account.id) throw new HttpError(400, 'Không thể tự xóa tài khoản của chính mình.')

  const encounterCount = await database.encounter.count({ where: { doctorId: id } })
  if (encounterCount > 0) {
    throw new HttpError(
      409,
      `Không thể xóa bác sĩ này vì đã phụ trách ${encounterCount} đợt điều trị. Vui lòng chọn "Vô hiệu hóa" để bảo toàn lịch sử bệnh án.`,
    )
  }

  if (user.patient) {
    const patientEncCount = await database.encounter.count({ where: { patientId: user.patient.id } })
    if (patientEncCount > 0) {
      throw new HttpError(
        409,
        `Không thể xóa bệnh nhân này vì đã có ${patientEncCount} đợt điều trị nội trú. Vui lòng chọn "Vô hiệu hóa" để bảo toàn lịch sử bệnh án.`,
      )
    }
    await database.$transaction([
      database.patientMedication.deleteMany({ where: { patientId: user.patient.id } }),
      database.patient.delete({ where: { id: user.patient.id } }),
      database.user.delete({ where: { id } }),
    ])
    return response.json({ success: true, message: 'Đã xóa tài khoản bệnh nhân.' })
  }

  await database.user.delete({ where: { id } })
  response.json({ success: true, message: 'Đã xóa tài khoản thành công.' })
})
