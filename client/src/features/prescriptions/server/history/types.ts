import type { Checked } from '../types'

export const triggerText = {
  PRESCRIBING: 'Kiểm tra khi kê đơn',
  ADMISSION: 'Khi nhập viện',
  CLINICAL_CHANGE: 'Diễn biến hoặc xét nghiệm mới',
  BEFORE_DISCHARGE: 'Trước xuất viện',
}
export type Trigger = keyof typeof triggerText
export type Summary = Omit<Checked, 'results'> & {
  trigger: Trigger; itemId: string | null; doctor: { fullName: string }
}
export type SavedOrder = { id: string; code: string; name: string; strength: string; dose: string; unit: string; timesPerDay: number | null }
export type Detail = Summary & Pick<Checked, 'results'> & {
  contextSnapshot: { error?: string; orders?: SavedOrder[]; rules?: { code: string; title: string }[]; kilograms?: string | null; diagnoses?: string[] }
}
export const time = (value: string) => new Date(value).toLocaleString('vi-VN')
