import type { Order } from '../../../prescriptions/server/types'
export type CatalogEntry = { code: string; name: string }
export type ClinicalProfile = {
  conditions: string[]; historyNote: string
  diagnoses: string[]
  allergyStatus: 'UNKNOWN' | 'NONE_REPORTED' | 'REPORTED'
  allergens: string[]
  kilograms?: number
}
export type DrugReview = {
  id: string
  stopReason: string | null
  decision: 'PENDING' | 'CONTINUE' | 'STOP'
  homeMedication: { medication: { name: string; strength: string; baseUnit: 'TABLET' | 'ML'; active: boolean } }
  draftItem: Pick<Order, 'dose' | 'doseUnit' | 'status' | 'schedule'> | null
}
export type ClinicalRecord = {
  admittedAt: string; admissionNote: string | null; doctor: { fullName: string }
  checks: { checkedAt: string; status: import('../../../prescriptions/server/types').CheckStatus }[]
  dischargeCondition: string | null; followUpAdvice: string | null
  progressNotes: { id: string; body: string; recordedAt: string }[]
  patient: { patientCode: string; conditions: CatalogEntry[]; historyNote: string }
  observations: { id: string; kind: string; value: string; unit: string; measuredAt: string }[]
  publishedAt: string | null; publishedAdvice: string | null; publishedDiagnoses: string[]
  orders: Order[]
  version: number
  doctorId: string
  dischargedAt: string | null
  diagnoses: CatalogEntry[]
  allergens: CatalogEntry[]
  allergyStatus: ClinicalProfile['allergyStatus']
  weights: { id: string; kilograms: string; measuredAt: string }[]
  reconciliation: DrugReview[]
}
export type ClinicalData = {
  observationKinds: Record<string, [string, string]>
  record: ClinicalRecord
  diseases: CatalogEntry[]
  allergens: CatalogEntry[]
  medications: (CatalogEntry & { dosageForm: string; groups: CatalogEntry[]; activeIngredients: { amount: string; ingredient: { name: string } }[]; id: string; strength: string; baseUnit: 'TABLET' | 'ML' })[]
}
export type Change = ({ action: 'PROFILE' } & ClinicalProfile)
  | { action: 'OBSERVATION'; kind: string; value: number; measuredAt: string }
  | { action: 'OBSERVATIONS_BATCH'; items: { kind: string; value: number }[]; measuredAt: string }
  | { action: 'DELETE_OBSERVATION'; observationId: string }
  | { action: 'PROGRESS_NOTE'; body: string }
  | { action: 'PUBLISH'; advice: string }
  | { action: 'ADD_MEDICATION'; medicationId: string }
  | { action: 'REMOVE_MEDICATION'; reviewId: string }
  | { action: 'STOP'; reviewId: string; reason?: string }
  | { action: 'CONTINUE'; reviewId: string; slots?: string[]; dose: number; timesPerDay: number; route?: string; durationDays?: number | null }
export type SaveChange = (change: Change) => Promise<boolean>
