import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { database } from '../../database'
import { HttpError } from '../../http'
import { accountSelect, requireSession, signSession } from './session'

export const authRouter = Router()
const credentials = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('staff'), username: z.string().trim().min(1).max(80), password: z.string().min(1).max(72) }),
  z.object({ kind: z.literal('patient'), patientCode: z.string().trim().min(1).max(40) }),
])
const dummyHash = bcrypt.hashSync('dacs4-unknown-account', 10)

authRouter.post('/login', rateLimit({
  windowMs: 60_000,
  limit: 20,
  message: { message: 'Bạn đã thử đăng nhập nhiều lần. Vui lòng thử lại sau.' },
}), async (request, response) => {
  const input = credentials.parse(request.body)
  const user = input.kind === 'staff'
    ? await database.user.findFirst({
        where: { username: input.username.toLowerCase() },
        select: { ...accountSelect, passwordHash: true, sessionVersion: true },
      })
    : await database.user.findFirst({
        where: {
          OR: [
            { username: input.patientCode.toLowerCase() },
            { username: input.patientCode },
            { patient: { patientCode: { equals: input.patientCode, mode: 'insensitive' } } },
          ],
        },
        select: { ...accountSelect, passwordHash: true, sessionVersion: true },
      })
  const passwordValid = input.kind === 'staff'
    ? await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash)
    : true
  if (!user || user.status !== 'ACTIVE' || !passwordValid ||
      (input.kind === 'staff' && (user.role === 'PATIENT' || !user.passwordHash)) ||
      (input.kind === 'patient' && (user.role !== 'PATIENT' || !user.patient))) {
    throw new HttpError(401, 'Thông tin đăng nhập không hợp lệ hoặc tài khoản đã bị khóa.')
  }
  const { passwordHash: _hash, sessionVersion, ...account } = user
  response.json({ token: signSession(user.id, sessionVersion), account })
})

authRouter.get('/me', requireSession(), (_request, response) => {
  response.json(response.locals.account)
})
