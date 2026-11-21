import { Card, Tag } from 'antd'
import type { ClinicalRecord } from './types'
export const allergyText = { UNKNOWN: 'Chưa xác minh', REPORTED: 'Đã ghi nhận dị ứng', NONE_REPORTED: 'Đã hỏi, chưa ghi nhận dị ứng' }

export function PatientContext({ record }: { record: ClinicalRecord }) {
  const active = record.orders.filter(o => o.status === 'ACTIVE')
  const weight = record.weights[0]
  return <Card size="small" title="Ngữ cảnh bệnh nhân"><dl className="ward-context">
    <dt>Chẩn đoán</dt><dd>{record.diagnoses.map(d => d.code + ' · ' + d.name).join(', ') || 'Chưa ghi nhận'}</dd>
    <dt>Bệnh nền</dt><dd>{record.patient.conditions.map(c => c.name).join(', ') || 'Chưa ghi nhận'}</dd>
    <dt>Dị ứng</dt><dd><Tag color={record.allergyStatus === 'REPORTED' ? 'red' : record.allergyStatus === 'UNKNOWN' ? 'orange' : 'green'}>{allergyText[record.allergyStatus]}</Tag>{record.allergens.map(a => a.name).join(', ')}</dd>
    <dt>Cân nặng gần nhất</dt><dd>{weight ? weight.kilograms + ' kg · ' + new Date(weight.measuredAt).toLocaleString('vi-VN') : 'Chưa đo'}</dd>
    <dt>Thuốc đang dùng trong đợt</dt><dd>{active.length ? <ul>{active.map(o => <li key={o.id}>{o.medication.name} · {o.dose} {o.doseUnit === 'ML' ? 'mL' : 'viên'}/lần</li>)}</ul> : 'Chưa có y lệnh hiệu lực'}</dd>
  </dl></Card>
}
