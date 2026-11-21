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

  return (
    <div style={{ display: 'grid', gap: 18 }}>
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
              <Form.Item
                name="body"
                label="Ghi diễn biến mới"
                rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập nội dung diễn biến!' }]}
                style={{ marginBottom: 8 }}
              >
                <Input.TextArea placeholder="Ví dụ: Bệnh nhân bớt đau đầu, huyết áp đo lúc 14h là 135/85 mmHg, không có phản ứng phụ..." rows={2} maxLength={3000} />
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
              renderItem={(note) => (
                <List.Item style={{ padding: '10px 0' }}>
                  <List.Item.Meta
                    title={
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(note.recordedAt).toLocaleString('vi-VN')}
                      </span>
                    }
                    description={
                      <div style={{ color: '#1e293b', fontSize: 13.5, whiteSpace: 'pre-wrap', marginTop: 2 }}>
                        {note.body}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
