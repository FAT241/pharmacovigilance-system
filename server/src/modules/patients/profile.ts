import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { database } from '../../database'

export const patientProfile = z.object({
  fullName: z.string().trim().min(1).max(120),
  birthDate: z.string().date().refine(date => date <= new Date().toISOString().slice(0, 10)).transform(date => new Date(date)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().trim().regex(/^(\+?[0-9 ]{8,15})?$/).optional(),
  idCard: z.string().trim().regex(/^(\d{12})?$/).optional(),
  address: z.string().trim().max(250).optional(),
})

export const patientSelect = {
  id: true, patientCode: true, birthDate: true, gender: true,
  phone: true, idCard: true, address: true, user: { select: { fullName: true } },
} as const

export async function createPatient(input: unknown) {
  const { fullName, idCard, ...data } = patientProfile.parse(input)
  const patientCode = 'BN-' + randomBytes(12).toString('hex').toUpperCase()
  return database.patient.create({
    data: {
      ...data, patientCode, idCard: idCard || null,
      user: { create: { role: 'PATIENT', username: patientCode.toLowerCase(), fullName } },
    },
    select: patientSelect,
  })
}
