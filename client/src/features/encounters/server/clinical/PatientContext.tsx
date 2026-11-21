import { Alert, Card, Tag } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import type { ClinicalRecord } from './types'

export const allergyText = {
  UNKNOWN: 'Chưa xác minh',
  REPORTED: 'Đã ghi nhận dị ứng',
  NONE_REPORTED: 'Đã hỏi, chưa ghi nhận dị ứng',
}

export function PatientContext({ record }: { record: ClinicalRecord }) {
  const active = record.orders.filter((o) => o.status === 'ACTIVE')
  const weight = record.weights[0]
  const formatNum = (v: any) => (isNaN(Number(v)) ? v : Number(v).toString())

  // Dược cảnh giác chủ động (Active Pharmacovigilance)
  const allNotesText = (record.progressNotes || []).map((p) => p.body.toLowerCase()).join(' ')
  const isTakingAmlo = active.some((o) => {
    const n = o.medication.name.toLowerCase()
    return n.includes('amlo') || n.includes('amlor')
  })
  const isTakingAcei = active.some((o) => {
    const n = o.medication.name.toLowerCase()
    return n.includes('enalapril') || n.includes('renitec')
  })
  const isTakingStatin = active.some((o) => {
    const n = o.medication.name.toLowerCase()
    return n.includes('atorvastatin') || n.includes('lipitor')
  })

  const hasEdema = allNotesText.includes('phù') || allNotesText.includes('sưng chân') || allNotesText.includes('edema')
  const hasCough = allNotesText.includes('ho khan') || allNotesText.includes('ho kéo dài')
  const hasMyalgia = allNotesText.includes('đau cơ') || allNotesText.includes('mỏi cơ') || allNotesText.includes('tiêu cơ')

  const initialWeight = record.weights.length > 0 ? Number(record.weights[record.weights.length - 1].kilograms) : null
  const currentWeight = record.weights.length > 0 ? Number(record.weights[0].kilograms) : null
  const weightGain = initialWeight && currentWeight ? Number((currentWeight - initialWeight).toFixed(1)) : 0
  const hasWeightGainAmlo = isTakingAmlo && weightGain >= 2

  const hasAmloEdema = isTakingAmlo && (hasEdema || hasWeightGainAmlo)
  const hasAceiCough = isTakingAcei && hasCough
  const hasStatinMyo = isTakingStatin && hasMyalgia

  return (
    <Card size="small" title="Ngữ cảnh bệnh nhân">
      <dl className="ward-context">
        <dt>Chẩn đoán</dt>
        <dd>{record.diagnoses.map((d) => d.code + ' · ' + d.name).join(', ') || 'Chưa ghi nhận'}</dd>
        <dt>Bệnh nền</dt>
        <dd>{record.patient.conditions.map((c) => c.name).join(', ') || 'Chưa ghi nhận'}</dd>
        <dt>Dị ứng</dt>
        <dd>
          <Tag color={record.allergyStatus === 'REPORTED' ? 'red' : record.allergyStatus === 'UNKNOWN' ? 'orange' : 'green'}>
            {allergyText[record.allergyStatus]}
          </Tag>
          {record.allergens.map((a) => a.name).join(', ')}
        </dd>
        <dt>Cân nặng gần nhất</dt>
        <dd>
          {weight ? (
            <span>
              <strong>{formatNum(weight.kilograms)} kg</strong> · {new Date(weight.measuredAt).toLocaleString('vi-VN')}
              {weightGain >= 2 && (
                <Tag color="red" style={{ marginLeft: 6 }}>
                  +{weightGain}kg (Tăng so với nhập viện)
                </Tag>
              )}
            </span>
          ) : (
            'Chưa đo'
          )}
        </dd>
        <dt>Thuốc đang dùng trong đợt</dt>
        <dd>
          {active.length ? (
            <ul>
              {active.map((o) => (
                <li key={o.id}>
                  {o.medication.name} · {o.dose} {o.doseUnit === 'ML' ? 'mL' : 'viên'}/lần
                </li>
              ))}
            </ul>
          ) : (
            'Chưa có y lệnh hiệu lực'
          )}
        </dd>
      </dl>

      {/* Cảnh báo Dược cảnh giác phát hiện tức thời */}
      {(hasAmloEdema || hasAceiCough || hasStatinMyo) && (
        <div style={{ marginTop: 12 }}>
          {hasAmloEdema && (
            <Alert
              type="error"
              showIcon
              icon={<ExclamationCircleFilled style={{ color: '#dc2626' }} />}
              message={<strong style={{ fontSize: 13 }}>🚨 Dược cảnh giác: Nghi ngờ ADR Phù ngoại vi do Amlodipine</strong>}
              description={
                <div style={{ fontSize: 12.5 }}>
                  {hasEdema && <div>• Ghi nhận triệu chứng phù/sưng chân trong diễn biến bệnh.</div>}
                  {hasWeightGainAmlo && <div>• Cân nặng tăng <strong>+{weightGain} kg</strong> nghi ngờ tích dịch do thuốc chẹn Calci.</div>}
                  <div style={{ marginTop: 4, color: '#b91c1c', fontWeight: 600 }}>
                    👉 Khuyến cáo bác sĩ: Xem xét giảm liều Amlodipine (2.5mg - 5mg) hoặc chuyển đổi nhóm thuốc trước khi xác nhận đơn.
                  </div>
                </div>
              }
              style={{ borderRadius: 8, marginBottom: 8, background: '#fef2f2', border: '1px solid #fecaca' }}
            />
          )}

          {hasAceiCough && (
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleFilled style={{ color: '#d97706' }} />}
              message={<strong style={{ fontSize: 13 }}>⚠️ Dược cảnh giác: Nghi ngờ ADR Ho khan do Enalapril</strong>}
              description={
                <div style={{ fontSize: 12.5, color: '#b45309' }}>
                  Ghi nhận ho khan kéo dài trong diễn biến điều trị. Khuyến cáo đổi sang nhóm Chẹn thụ thể ARB (Losartan / Cozaar).
                </div>
              }
              style={{ borderRadius: 8, marginBottom: 8, background: '#fffbeb', border: '1px solid #fde68a' }}
            />
          )}

          {hasStatinMyo && (
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleFilled style={{ color: '#d97706' }} />}
              message={<strong style={{ fontSize: 13 }}>⚠️ Dược cảnh giác: Nghi ngờ ADR Đau mỏi cơ do Atorvastatin</strong>}
              description={
                <div style={{ fontSize: 12.5, color: '#b45309' }}>
                  Ghi nhận triệu chứng đau mỏi cơ bắp. Khuyến cáo chỉ định xét nghiệm men cơ CK và xem xét giảm liều Statin.
                </div>
              }
              style={{ borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}
            />
          )}
        </div>
      )}
    </Card>
  )
}
