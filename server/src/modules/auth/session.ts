import type { Role } from '@prisma/client'
import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { database } from '../../database'
import { HttpError } from '../../http'

export const accountSelect = {
  id: true, username: true, fullName: true, role: true, status: true,
  department: true, title: true, disabledReason: true,
  patient: { select: { patientCode: true } },
} as const

function secret() {
  const value = process.env.DACS4_JWT_SECRET
  if (!value || value.length < 32) throw new HttpError(503, 'Máy chủ chưa cấu hình đăng nhập.')
  return value
}

const issuer = 'dacs4'

export function signSession(id: string, sessionVersion: number) {
  return jwt.sign({ sessionVersion }, secret(), { subject: id, issuer, algorithm: 'HS256', expiresIn: '8h' })
}

export async function authenticatedAccount(token: string, ...roles: Role[]) {
  const key = secret()
  let claims
  try {
    claims = jwt.verify(token, key, { issuer, algorithms: ['HS256'] })
  } catch {
    throw new HttpError(401, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.')
  }
  if (typeof claims === 'string' || !claims.sub) throw new HttpError(401, 'Phiên đăng nhập không hợp lệ.')
  const user = await database.user.findUnique({
    where: { id: claims.sub },
    select: { ...accountSelect, sessionVersion: true },
  })
  if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== claims.sessionVersion) {
    throw new HttpError(401, 'Phiên đăng nhập đã hết hiệu lực.')
  }
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, 'Bạn không có quyền thực hiện thao tác này.')
  const { sessionVersion: _version, ...account } = user
  return account
}

export function requireSession(...roles: Role[]): RequestHandler {
  return async (request, response, next) => {
    const authorization = request.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Vui lòng đăng nhập.')
    response.locals.account = await authenticatedAccount(authorization.slice(7), ...roles)
    next()
  }
}
