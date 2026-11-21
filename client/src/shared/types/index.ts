export type Role = 'DOCTOR' | 'ADMIN' | 'PATIENT'

export interface User {
  id: string
  role: Role
  username: string
  fullName: string
  status: 'ACTIVE' | 'DISABLED'
  disabledReason?: string
  patientCode?: string // If patient
  title?: string // e.g. "BS. CK1", "Quản trị viên hệ thống"
  department?: string // e.g. "Khoa Nội tổng hợp"
}
