export type CheckStatus = 'NO_ALERT' | 'HAS_ALERT' | 'INSUFFICIENT_DATA' | 'ERROR'
export const statusText: Record<CheckStatus, string> = {
  NO_ALERT: 'Không có cảnh báo từ bộ luật thí điểm', HAS_ALERT: 'Có cảnh báo',
  INSUFFICIENT_DATA: 'Thiếu dữ liệu', ERROR: 'Lỗi kiểm tra',
}
export type Checked = {
  id: string; status: CheckStatus; encounterVersion: number; checkedAt: string; confirmedAt: string | null; overrideReason: string | null
  results: { ruleCode: string; ruleVersion: number; outcome: 'MATCHED' | 'NOT_MATCHED' | 'INSUFFICIENT_DATA' | 'ERROR'; message: string;
    evidence: Record<string, unknown>; missingFields: string[] }[]
}
export type Order = {
  route: string | null; durationDays: number | null; endReason: string | null
  explanation: { status: 'GENERATING' | 'DRAFT' | 'APPROVED' | 'FAILED'; revision: number; draft: string | null;
    approvedText: string | null; source: string; excerpt: string; failure: string | null; updatedAt: string } | null
  id: string; reviewId: string | null; status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'REPLACED'; medicationId: string
  medication: { name: string; code: string; strength: string }; dose: string; doseUnit: 'TABLET' | 'ML'
  schedule: { timesPerDay: number; slots?: string[] }; checks: Checked[]; replacesItemId: string | null
  startedAt: string | null; endedAt: string | null
}
export type OrderInput = { slots?: string[];  medicationId: string; dose: number; timesPerDay: number; route: string; durationDays?: number | null }
export type OrderEditor = { kind: 'NEW' } | { kind: 'EDIT' | 'REPLACE'; item: Order }
