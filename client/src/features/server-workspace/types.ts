import type { User } from '../../shared/types'

export type Account = User
export type PatientRow = {
  id: string
  patientCode: string
  user: { fullName: string }
  birthDate: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  phone?: string
  idCard?: string
  address?: string
  encounters?: { id: string; admittedAt: string; dischargedAt: string | null; allergyStatus: 'UNKNOWN' | 'NONE_REPORTED' | 'REPORTED'; doctor: { fullName: string } }[]
}

export type MedicationRow = {
  groups: { code: string; name: string }[]
  referenceSource: string | null
  referenceText: string | null
  allergens: { code: string; name: string }[]
  id: string
  code: string
  name: string
  strength: string
  dosageForm: string
  baseUnit: 'TABLET' | 'ML'
  active: boolean
  activeIngredients: { amount: string; ingredient: { id: string; name: string } }[]
}
