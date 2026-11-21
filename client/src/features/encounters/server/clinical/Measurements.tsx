import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Input, InputNumber, List, Row, Space, Tag, Typography, message } from 'antd'
import { HeartOutlined, SaveOutlined } from '@ant-design/icons'
import type { ClinicalData, SaveChange } from './types'
import { BloodGlucoseIcon, BloodPressureIcon, HeartbeatPulseIcon, KidneyIcon } from '../../../../shared/components/MedicalIcons'

function formatObservationValue(value: string | number): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  return isNaN(num) ? String(value) : num.toString()
}

export function Measurements({ data, editable, onSave }: { data: ClinicalData; editable: boolean; onSave: SaveChange }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  async function handleFinish(values: any) {
    const items: { kind: string; value: number }[] = []
    const mapping: Record<string, string> = {
      bpSys: 'BP_SYS',
      bpDia: 'BP_DIA',
      heartRate: 'HEART_RATE',
      temperature: 'TEMPERATURE',
      glucose: 'GLUCOSE',
      hba1c: 'HBA1C',
      creatinine: 'CREATININE',
      egfr: 'EGFR',
    }

    for (const [field, kind] of Object.entries(mapping)) {
      if (values[field] !== undefined && values[field] !== null && values[field] !== '') {
        items.push({ kind, value: Number(values[field]) })
      }
    }

    if (items.length === 0) {
      message.warning('Vui lòng nhập ít nhất một chỉ số sinh hiệu hoặc xét nghiệm trước khi lưu.')
      return
    }

    setSaving(true)
    try {
      const measuredAt = values.time ? new Date(values.time).toISOString() : new Date().toISOString()
      const ok = await onSave({
        action: 'OBSERVATIONS_BATCH',
        items,
        measuredAt,
      })
      if (ok) {
        form.resetFields()
        message.success(`Đã lưu thành công ${items.length} chỉ số sinh hiệu & xét nghiệm!`)
      }
    } catch (err: any) {
      message.error(err instanceof Error ? err.message : 'Không lưu được kết quả đo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {!editable && (
        <Alert
          type="warning"
          showIcon
          message="Hồ sơ đang ở chế độ CHỈ XEM"
          description={`Đợt điều trị này do bác sĩ ${data.record.doctor?.fullName || 'khác'} phụ trách (hoặc đã xuất viện). Để ghi sinh hiệu, vui lòng bấm nút "Tiếp nhận phụ trách" ở đầu trang.`}
        />
      )}

      {editable && (
        <Card
          title={
            <Space>
              <HeartOutlined style={{ color: '#dc2626' }} />
              <span>Phiếu ghi Sinh hiệu & Kết quả Xét nghiệm nhanh</span>
            </Space>
          }
          style={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
        >
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            {/* Nhóm Huyết áp & Tim mạch */}
            <Typography.Text strong style={{ color: '#0f172a', display: 'block', marginBottom: 10 }}>
              1. Huyết áp & Tuần hoàn:
            </Typography.Text>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="bpSys" label="Huyết áp tâm thu (Tối đa)">
                  <InputNumber min={30} max={300} style={{ width: '100%' }} placeholder="VD: 120" addonAfter="mmHg" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="bpDia" label="Huyết áp tâm trương (Tối thiểu)">
                  <InputNumber min={20} max={200} style={{ width: '100%' }} placeholder="VD: 80" addonAfter="mmHg" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="heartRate" label="Nhịp tim / Mạch">
                  <InputNumber min={30} max={250} style={{ width: '100%' }} placeholder="VD: 75" addonAfter="lần/phút" />
                </Form.Item>
              </Col>
            </Row>

            {/* Nhóm Thân nhiệt & Chuyển hóa đường huyết */}
            <Typography.Text strong style={{ color: '#0f172a', display: 'block', marginTop: 10, marginBottom: 10 }}>
              2. Thân nhiệt & Chỉ số Đường huyết:
            </Typography.Text>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="temperature" label="Nhiệt độ cơ thể">
                  <InputNumber min={30} max={45} step={0.1} precision={1} style={{ width: '100%' }} placeholder="VD: 37.0" addonAfter="°C" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="glucose" label="Glucose máu (Đường huyết)">
                  <InputNumber min={0.5} max={50} step={0.1} precision={2} style={{ width: '100%' }} placeholder="VD: 6.5" addonAfter="mmol/L" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="hba1c" label="Chỉ số HbA1c">
                  <InputNumber min={3} max={20} step={0.1} precision={1} style={{ width: '100%' }} placeholder="VD: 7.2" addonAfter="%" />
                </Form.Item>
              </Col>
            </Row>

            {/* Nhóm Chức năng thận */}
            <Typography.Text strong style={{ color: '#0f172a', display: 'block', marginTop: 10, marginBottom: 10 }}>
              3. Chức năng thận (Xét nghiệm sinh hóa):
            </Typography.Text>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={12}>
                <Form.Item name="creatinine" label="Creatinine huyết thanh">
                  <InputNumber min={10} max={2000} step={1} style={{ width: '100%' }} placeholder="VD: 95" addonAfter="µmol/L" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={12}>
                <Form.Item name="egfr" label="Mức lọc cầu thận ước tính (eGFR)">
                  <InputNumber min={5} max={200} step={1} style={{ width: '100%' }} placeholder="VD: 85" addonAfter="mL/phút" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="time" label="Thời điểm đo" extra="Để trống để ghi nhận thời điểm đo hiện tại.">
                  <Input type="datetime-local" />
                </Form.Item>
              </Col>
            </Row>

            <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={saving} style={{ background: '#0284c7' }}>
              Lưu tất cả sinh hiệu & xét nghiệm
            </Button>
          </Form>
        </Card>
      )}

      {/* Lịch sử các lần đo */}
      <Card
        title={
          <Space>
            <span>Lịch sử các lần đo sinh hiệu & xét nghiệm ({data.record.observations.length})</span>
          </Space>
        }
        style={{ borderRadius: 10 }}
      >
        <List
          dataSource={data.record.observations}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'Chưa có kết quả đo nào được lưu cho đợt điều trị này' }}
          renderItem={row => (
            <List.Item>
              <List.Item.Meta
                title={<strong>{data.observationKinds[row.kind]?.[0] ?? row.kind}</strong>}
                description={new Date(row.measuredAt).toLocaleString('vi-VN')}
              />
              <Tag color="blue" style={{ fontSize: 14, padding: '4px 10px', fontWeight: 600 }}>
                {formatObservationValue(row.value)} {row.unit}
              </Tag>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  )
}
