import React from 'react'
import { Alert, Button, Card, Col, Form, Input, List, Row, Space, Tag, Typography } from 'antd'
import type { ClinicalData, SaveChange } from './types'
import { PatientContext } from './PatientContext'
import { statusText } from '../../../prescriptions/server/types'
import {
  BloodGlucoseIcon,
  BloodPressureIcon,
  HeartbeatPulseIcon,
  KidneyIcon,
  WeightScaleIcon,
} from '../../../../shared/components/MedicalIcons'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  FileDoneOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons'

function formatNum(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  return isNaN(num) ? String(value) : num.toString()
}

export function ClinicalOverview({
  data,
  editable,
  onSave,
  onNavigate,
}: {
  data: ClinicalData
  editable: boolean
  onSave: SaveChange
  onNavigate: (key: string) => void
}) {
  const { record } = data
  const [form] = Form.useForm()
  const latestCheck = record.checks[0]

  // Extract key vitals
  const sysBp = record.observations.find((o) => o.kind === 'BP_SYS' || o.kind.toLowerCase().includes('tâm thu'))
  const diaBp = record.observations.find((o) => o.kind === 'BP_DIA' || o.kind.toLowerCase().includes('tâm trương'))
  const heartRate = record.observations.find((o) => o.kind === 'HEART_RATE' || o.kind.toLowerCase().includes('nhịp tim') || o.kind.toLowerCase().includes('mạch'))
  const glucose = record.observations.find((o) => o.kind === 'GLUCOSE' || o.kind.toLowerCase().includes('đường huyết') || o.kind.toLowerCase().includes('glucose'))
  const creatinine = record.observations.find((o) => o.kind === 'CREATININE' || o.kind.toLowerCase().includes('creatinine'))
  const latestWeight = record.weights[0]

  const statusColorMap: Record<string, string> = {
    NO_ALERT: 'success',
    HAS_ALERT: 'error',
    INSUFFICIENT_DATA: 'warning',
    ERROR: 'default',
  }

  // Giám sát Dược cảnh giác chủ động (Active Pharmacovigilance)
  const activeOrders = record.orders.filter((o) => o.status === 'ACTIVE')
  const isTakingAmlo = activeOrders.some((o) => {
    const n = o.medication.name.toLowerCase()
    return n.includes('amlo') || n.includes('amlor')
  })
  const isTakingAcei = activeOrders.some((o) => {
    const n = o.medication.name.toLowerCase()
    return n.includes('enalapril') || n.includes('renitec')
  })
  const isTakingStatin = activeOrders.some((o) => {
    const n = o.medication.name.toLowerCase()
    return n.includes('atorvastatin') || n.includes('lipitor')
  })

  const allNotesText = record.progressNotes.map((p) => p.body.toLowerCase()).join(' ')
  const hasEdemaInNotes = allNotesText.includes('phù') || allNotesText.includes('sưng chân') || allNotesText.includes('edema')
  const hasCoughInNotes = allNotesText.includes('ho khan') || allNotesText.includes('ho kéo dài')
  const hasMyalgiaInNotes = allNotesText.includes('đau cơ') || allNotesText.includes('mỏi cơ') || allNotesText.includes('tiêu cơ')

  const hasAmloEdemaSuspected = isTakingAmlo && hasEdemaInNotes
  const hasAceiCoughSuspected = isTakingAcei && hasCoughInNotes
  const hasStatinMyopathySuspected = isTakingStatin && hasMyalgiaInNotes

  const initialWeight = record.weights.length > 0 ? Number(record.weights[record.weights.length - 1].kilograms) : null
  const currentWeight = record.weights.length > 0 ? Number(record.weights[0].kilograms) : null
  const weightGain = initialWeight && currentWeight ? Number((currentWeight - initialWeight).toFixed(1)) : 0
  const hasWeightGainAmlo = isTakingAmlo && weightGain >= 2

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Cảnh báo Dược cảnh giác ADR phát hiện từ Diễn biến lâm sàng / Cân nặng */}
      {hasAmloEdemaSuspected && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleFilled style={{ fontSize: 20, color: '#dc2626' }} />}
          message={<strong style={{ fontSize: 14 }}>Phát hiện nghi ngờ ADR Dược cảnh giác: Phù ngoại vi do Amlodipine</strong>}
          description={
            <div>
              <div>
                Diễn tiến điều trị ghi nhận triệu chứng <strong>phù / sưng chi dưới</strong> trong khi bệnh nhân đang dùng <strong>Amlodipine (Amlor)</strong>.
              </div>
              <div style={{ marginTop: 4, color: '#b91c1c' }}>
                💡 <strong>Khuyến cáo Dược lâm sàng:</strong> Phù do Amlodipine là tác dụng phụ phụ thuộc liều. Khuyến cáo <strong>xem xét giảm liều Amlodipine</strong> (từ 10mg xuống 5mg hoặc 2.5mg), hoặc đổi sang nhóm Ức chế men chuyển (ACEi) / Chẹn thụ thể (ARB) nếu cần.
              </div>
              <div style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  danger
                  onClick={() => onNavigate('orders')}
                  style={{ borderRadius: 6 }}
                >
                  Chuyển sang tab Kê đơn để điều chỉnh / Giảm liều Amlodipine →
                </Button>
              </div>
            </div>
          }
          style={{ borderRadius: 10, border: '1px solid #fca5a5', background: '#fef2f2' }}
        />
      )}

      {hasAceiCoughSuspected && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleFilled style={{ fontSize: 20, color: '#d97706' }} />}
          message={<strong style={{ fontSize: 14 }}>Phát hiện nghi ngờ ADR Dược cảnh giác: Ho khan do Enalapril (ACEi)</strong>}
          description={
            <div>
              <div>
                Diễn tiến điều trị ghi nhận triệu chứng <strong>ho khan kéo dài</strong> trong khi bệnh nhân đang dùng <strong>Enalapril (Renitec)</strong>.
              </div>
              <div style={{ marginTop: 4, color: '#b45309' }}>
                💡 <strong>Khuyến cáo Dược lâm sàng:</strong> Ho khan là tác dụng phụ do ứ đọng Bradykinin của nhóm ức chế men chuyển. Khuyến cáo <strong>xem xét chuyển sang nhóm Chẹn thụ thể ARB (như Losartan / Cozaar)</strong> không gây ho khan.
              </div>
              <div style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => onNavigate('orders')}
                  style={{ borderRadius: 6, background: '#d97706', borderColor: '#d97706' }}
                >
                  Chuyển sang tab Kê đơn để đổi sang Losartan (Cozaar) →
                </Button>
              </div>
            </div>
          }
          style={{ borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb' }}
        />
      )}

      {hasStatinMyopathySuspected && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleFilled style={{ fontSize: 20, color: '#d97706' }} />}
          message={<strong style={{ fontSize: 14 }}>Phát hiện nghi ngờ ADR Dược cảnh giác: Đau mỏi cơ do Atorvastatin</strong>}
          description={
            <div>
              <div>
                Diễn tiến điều trị ghi nhận triệu chứng <strong>đau mỏi cơ bắp</strong> trong khi bệnh nhân đang dùng <strong>Atorvastatin (Lipitor)</strong>.
              </div>
              <div style={{ marginTop: 4, color: '#b45309' }}>
                💡 <strong>Khuyến cáo Dược lâm sàng:</strong> Nguy cơ tổn thương cơ bắp / tiêu cơ vân. Khuyến cáo <strong>xem xét làm xét nghiệm men cơ CK</strong> và cân nhắc giảm liều Lipitor (xuống 10mg) hoặc tạm ngừng.
              </div>
              <div style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => onNavigate('orders')}
                  style={{ borderRadius: 6, background: '#d97706', borderColor: '#d97706' }}
                >
                  Chuyển sang tab Kê đơn để giảm liều Statin →
                </Button>
              </div>
            </div>
          }
          style={{ borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb' }}
        />
      )}

      {hasWeightGainAmlo && !hasAmloEdemaSuspected && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleFilled style={{ fontSize: 20, color: '#d97706' }} />}
          message={<strong style={{ fontSize: 14 }}>Cảnh báo Biến động Cân nặng: Nghi ngờ tích nước / phù do Amlodipine</strong>}
          description={
            <div>
              <div>
                Cân nặng bệnh nhân tăng đột ngột <strong>+{weightGain} kg</strong> so với lúc nhập viện trong khi đang dùng <strong>Amlodipine</strong>. Khuyến cáo kiểm tra ấn lõm mắt cá chân và xem xét giảm liều thuốc.
              </div>
              <div style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  danger
                  onClick={() => onNavigate('orders')}
                  style={{ borderRadius: 6 }}
                >
                  Chuyển sang tab Kê đơn để điều chỉnh liều →
                </Button>
              </div>
            </div>
          }
          style={{ borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb' }}
        />
      )}

      {/* 1. Vital Signs KPI Quick Cards Row */}
      <Row gutter={[16, 16]}>
        {/* Huyết áp */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            hoverable
            onClick={() => onNavigate('measurements')}
            style={{ borderRadius: 10, background: '#fff', border: '1px solid #fee2e2', cursor: 'pointer' }}
            bodyStyle={{ padding: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Huyết áp</span>
              <BloodPressureIcon size={22} color="#dc2626" />
            </div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: '#dc2626' }}>
              {sysBp && diaBp ? `${formatNum(sysBp.value)}/${formatNum(diaBp.value)}` : sysBp ? `${formatNum(sysBp.value)}` : '—'}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 4 }}>mmHg</span>
            </div>
            <div style={{ fontSize: 11, color: sysBp ? '#059669' : '#0284c7', marginTop: 4 }}>
              {sysBp ? `Đo lúc ${new Date(sysBp.measuredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '+ Nhấp để nhập đo'}
            </div>
          </Card>
        </Col>

        {/* Nhịp tim */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            hoverable
            onClick={() => onNavigate('measurements')}
            style={{ borderRadius: 10, background: '#fff', border: '1px solid #fecdd3', cursor: 'pointer' }}
            bodyStyle={{ padding: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Nhịp tim</span>
              <HeartbeatPulseIcon size={24} color="#e11d48" animated={Boolean(heartRate)} />
            </div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: '#e11d48' }}>
              {heartRate ? formatNum(heartRate.value) : '—'}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 4 }}>lần/phút</span>
            </div>
            <div style={{ fontSize: 11, color: heartRate ? '#059669' : '#0284c7', marginTop: 4 }}>
              {heartRate ? `Đo lúc ${new Date(heartRate.measuredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '+ Nhấp để nhập đo'}
            </div>
          </Card>
        </Col>

        {/* Đường huyết */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            hoverable
            onClick={() => onNavigate('measurements')}
            style={{ borderRadius: 10, background: '#fff', border: '1px solid #fef3c7', cursor: 'pointer' }}
            bodyStyle={{ padding: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Đường huyết</span>
              <BloodGlucoseIcon size={22} color="#d97706" />
            </div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: '#d97706' }}>
              {glucose ? formatNum(glucose.value) : '—'}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 4 }}>{glucose?.unit || 'mmol/L'}</span>
            </div>
            <div style={{ fontSize: 11, color: glucose ? '#059669' : '#0284c7', marginTop: 4 }}>
              {glucose ? `Đo lúc ${new Date(glucose.measuredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '+ Nhấp để nhập đo'}
            </div>
          </Card>
        </Col>

        {/* Cân nặng & Thận */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            hoverable
            onClick={() => onNavigate('profile')}
            style={{ borderRadius: 10, background: '#fff', border: '1px solid #e0f2fe', cursor: 'pointer' }}
            bodyStyle={{ padding: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Cân nặng & Thận</span>
              <WeightScaleIcon size={22} color="#0284c7" />
            </div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: '#0284c7' }}>
              {latestWeight ? formatNum(latestWeight.kilograms) : '—'}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 4 }}>kg</span>
              {creatinine && (
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', marginLeft: 10 }}>
                  · Cr {formatNum(creatinine.value)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: latestWeight ? '#059669' : '#0284c7', marginTop: 4 }}>
              {latestWeight ? `Cân lúc nhập viện (${formatNum(latestWeight.kilograms)} kg)` : '+ Nhấp để nhập cân nặng'}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 2. Main 2-Column Overview */}
      <div className="ward-overview">
        {/* Left: Patient Clinical Context */}
        <div style={{ display: 'grid', gap: 16 }}>
          <PatientContext record={record} />

          {/* Card An toàn dùng thuốc */}
          <Card
            size="small"
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: '#0284c7' }} />
                <span>An toàn dùng thuốc & Cảnh giác dược</span>
              </Space>
            }
            extra={
              latestCheck && (
                <Tag color={statusColorMap[latestCheck.status] || 'default'}>
                  {statusText[latestCheck.status]}
                </Tag>
              )
            }
            style={{ borderRadius: 10 }}
          >
            {latestCheck ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ClockCircleOutlined style={{ color: '#64748b' }} />
                  <span style={{ fontSize: 13, color: '#475569' }}>
                    Kiểm tra gần nhất: <strong>{new Date(latestCheck.checkedAt).toLocaleString('vi-VN')}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', padding: '8px 0' }}>
                Chưa chạy lượt kiểm tra an toàn nào trong đợt này.
              </div>
            )}

            <Space wrap style={{ marginTop: 8 }}>
              <Button type="primary" onClick={() => onNavigate('orders')} style={{ background: '#0284c7' }}>
                Kê đơn & Kiểm tra y lệnh
              </Button>
              <Button onClick={() => onNavigate('history')}>Xem lịch sử cảnh báo</Button>
            </Space>
          </Card>
        </div>

        {/* Right: Progress Notes & Clinical Timeline */}
        <Card
          size="small"
          title={
            <Space>
              <FileDoneOutlined style={{ color: '#059669' }} />
              <span>Diễn biến lâm sàng & Nhật ký theo dõi</span>
            </Space>
          }
          style={{ borderRadius: 10 }}
        >
          {record.admissionNote && (
            <Alert
              type="info"
              message="Lý do vào viện:"
              description={record.admissionNote}
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {editable && (
            <Form
              layout="vertical"
              form={form}
              onFinish={async ({ body }) => {
                if (await onSave({ action: 'PROGRESS_NOTE', body })) form.resetFields()
              }}
              style={{ marginBottom: 16 }}
            >
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  Mẫu ghi nhận theo dõi Dược cảnh giác (nhấp để chèn nhanh):
                </div>
                <Space wrap size={[6, 6]}>
                  <Tag
                    color="red"
                    style={{ cursor: 'pointer', borderRadius: 4, fontSize: 11.5 }}
                    onClick={() => {
                      const cur = form.getFieldValue('body') || ''
                      form.setFieldsValue({
                        body: cur
                          ? cur + '; Bệnh nhân than phiền phù hai mu bàn chân, sưng mắt cá'
                          : 'Bệnh nhân than phiền phù hai mu bàn chân, sưng mắt cá',
                      })
                    }}
                  >
                    + Phù chân nghi do Amlodipine
                  </Tag>
                  <Tag
                    color="orange"
                    style={{ cursor: 'pointer', borderRadius: 4, fontSize: 11.5 }}
                    onClick={() => {
                      const cur = form.getFieldValue('body') || ''
                      form.setFieldsValue({
                        body: cur
                          ? cur + '; Bệnh nhân xuất hiện ho khan dai dẳng, ngứa họng ban đêm'
                          : 'Bệnh nhân xuất hiện ho khan dai dẳng, ngứa họng ban đêm',
                      })
                    }}
                  >
                    + Ho khan nghi do Enalapril
                  </Tag>
                  <Tag
                    color="gold"
                    style={{ cursor: 'pointer', borderRadius: 4, fontSize: 11.5 }}
                    onClick={() => {
                      const cur = form.getFieldValue('body') || ''
                      form.setFieldsValue({
                        body: cur
                          ? cur + '; Bệnh nhân kêu đau mỏi cơ bắp vùng đùi hai bên'
                          : 'Bệnh nhân kêu đau mỏi cơ bắp vùng đùi hai bên',
                      })
                    }}
                  >
                    + Đau cơ nghi do Statin
                  </Tag>
                  <Tag
                    color="cyan"
                    style={{ cursor: 'pointer', borderRadius: 4, fontSize: 11.5 }}
                    onClick={() => {
                      const cur = form.getFieldValue('body') || ''
                      form.setFieldsValue({
                        body: cur
                          ? cur + '; Diễn biến ổn định, sinh hiệu trong giới hạn, không có phản ứng phụ'
                          : 'Diễn biến ổn định, sinh hiệu trong giới hạn, không có phản ứng phụ',
                      })
                    }}
                  >
                    + Diễn tiến bình thường
                  </Tag>
                </Space>
              </div>

              <Form.Item
                name="body"
                label="Ghi diễn biến mới"
                rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập nội dung diễn biến!' }]}
                style={{ marginBottom: 8 }}
              >
                <Input.TextArea
                  placeholder="Ví dụ: Bệnh nhân bớt đau đầu, huyết áp đo lúc 14h là 135/85 mmHg, xuất hiện phù nhẹ mắt cá..."
                  rows={2}
                  maxLength={3000}
                />
              </Form.Item>
              <Button type="primary" icon={<PlusOutlined />} htmlType="submit" size="small" style={{ background: '#059669', borderColor: '#059669' }}>
                Lưu diễn biến
              </Button>
            </Form>
          )}

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <List
              dataSource={record.progressNotes}
              locale={{ emptyText: 'Chưa có ghi nhận diễn biến trong đợt' }}
              renderItem={(note) => {
                const lower = note.body.toLowerCase()
                const noteHasEdema = lower.includes('phù') || lower.includes('sưng chân') || lower.includes('edema')
                const noteHasCough = lower.includes('ho khan') || lower.includes('ho kéo dài')
                const noteHasMyo = lower.includes('đau cơ') || lower.includes('mỏi cơ')

                return (
                  <List.Item style={{ padding: '10px 0' }}>
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            {new Date(note.recordedAt).toLocaleString('vi-VN')}
                          </span>
                          {noteHasEdema && (
                            <Tag color="error" style={{ fontSize: 11 }}>
                              🚨 Phát hiện dấu hiệu Phù
                            </Tag>
                          )}
                          {noteHasCough && (
                            <Tag color="warning" style={{ fontSize: 11 }}>
                              ⚠️ Phát hiện dấu hiệu Ho khan
                            </Tag>
                          )}
                          {noteHasMyo && (
                            <Tag color="warning" style={{ fontSize: 11 }}>
                              ⚠️ Dấu hiệu Đau cơ
                            </Tag>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ color: '#1e293b', fontSize: 13.5, whiteSpace: 'pre-wrap', marginTop: 2 }}>
                          {note.body}
                        </div>
                      }
                    />
                  </List.Item>
                )
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
