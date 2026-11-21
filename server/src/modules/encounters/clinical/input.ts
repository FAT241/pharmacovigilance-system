import { z } from 'zod'
import { scheduleSlots } from '../../prescriptions/schedule'
import { orderRoutes } from '../../prescriptions/course'

const codes = z.array(z.string().trim().min(1).max(50)).max(50)
  .refine(items => new Set(items).size === items.length)
const version = z.number().int().nonnegative()
export const observationKinds = {
  BP_SYS: ['Huyết áp tâm thu', 'mmHg'], BP_DIA: ['Huyết áp tâm trương', 'mmHg'],
  HEART_RATE: ['Nhịp tim', 'lần/phút'], TEMPERATURE: ['Nhiệt độ', '°C'],
  GLUCOSE: ['Glucose máu', 'mmol/L'], HBA1C: ['HbA1c', '%'],
  CREATININE: ['Creatinine', 'µmol/L'], EGFR: ['eGFR', 'mL/phút/1,73 m²'],
} as const
export const clinicalParams = z.object({ patientId: z.string().uuid(), id: z.string().uuid() })
export const clinicalChange = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('PROFILE'), version, diagnoses: codes, allergens: codes,
    conditions: codes.optional(), historyNote: z.string().trim().max(3000).optional(),
    allergyStatus: z.enum(['UNKNOWN', 'NONE_REPORTED', 'REPORTED']),
    kilograms: z.number().positive().max(9999.99).multipleOf(0.01).optional(),
  }),
  z.object({ action: z.literal('OBSERVATION'), version, kind: z.enum(Object.keys(observationKinds) as [keyof typeof observationKinds]),
    value: z.number().nonnegative().max(999999999).multipleOf(0.001), measuredAt: z.string().datetime() }),
  z.object({ action: z.literal('PROGRESS_NOTE'), version, body: z.string().trim().min(1).max(3000) }),
  z.object({ action: z.literal('PUBLISH'), version, advice: z.string().trim().max(3000) }),
  z.object({ action: z.literal('ADD_MEDICATION'), version, medicationId: z.string().uuid() }),
  z.object({ action: z.literal('REMOVE_MEDICATION'), version, reviewId: z.string().uuid() }),
  z.object({ action: z.literal('STOP'), version, reviewId: z.string().uuid(), reason: z.string().trim().min(1).max(500).optional() }),
  z.object({
    action: z.literal('CONTINUE'), version, reviewId: z.string().uuid(),
    dose: z.number().positive().max(99999999).multipleOf(0.0001),
    slots: scheduleSlots.optional(), route: z.enum(orderRoutes).optional(), durationDays: z.number().int().min(1).max(365).nullish(),
    timesPerDay: z.number().int().min(1).max(24),
  }),
])
export type ClinicalChange = z.infer<typeof clinicalChange>
