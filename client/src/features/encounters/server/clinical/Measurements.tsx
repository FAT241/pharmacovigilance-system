import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Row,
  Space,
  Tag,
  Typography,
  message,
  notification,
} from 'antd'
import {
  DeleteOutlined,
  ExclamationCircleFilled,
  HeartOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import type { ClinicalData, SaveChange } from './types'

function formatObservationValue(value: string | number): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  return isNaN(num) ? String(value) : num.toString()
}

function getBpSysAlert(val: number | undefined) {
  if (!val) return null
  if (val >= 180) return { type: 'error', text: 'Cơn tăng HA cấp cứu (≥180)' }
  if (val >= 140) return { type: 'warning', text: 'Tăng huyết áp tâm thu (≥140)' }
  if (val < 90) return { type: 'warning', text: 'Tụt huyết áp tâm thu (<90)' }
  return null
}

function getBpDiaAlert(val: number | undefined) {
  if (!val) return null
  if (val >= 110) return { type: 'error', text: 'Cơn tăng HA tâm trương (≥110)' }
  if (val >= 90) return { type: 'warning', text: 'Tăng HA tâm trương (≥90)' }
  if (val < 60) return { type: 'warning', text: 'Tụt HA tâm trương (<60)' }
  return null
}

function getHeartRateAlert(val: number | undefined) {
  if (!val) return null
  if (val > 100) return { type: 'warning', text: 'Nhịp tim nhanh (>100 ck/phút)' }
  if (val < 60) return { type: 'warning', text: 'Nhịp tim chậm (<60 ck/phút)' }
  return null
}

function getTempAlert(val: number | undefined) {
  if (!val) return null
  if (val >= 39) return { type: 'error', text: 'Sốt cao nguy kịch (≥39.0 °C)' }
  if (val >= 38) return { type: 'warning', text: 'Sốt (≥38.0 °C)' }
  if (val < 35.5) return { type: 'warning', text: 'Hạ thân nhiệt (<35.5 °C)' }
  return null
}

function getGlucoseAlert(val: number | undefined) {
  if (!val) return null
  if (val >= 11.1) return { type: 'warning', text: 'Tăng đường huyết (≥11.1 mmol/L)' }
  if (val < 3.9) return { type: 'error', text: 'Hạ đường huyết nguy hiểm (<3.9 mmol/L)' }
  return null
}

function getCreatinineAlert(val: number | undefined) {
  if (!val) return null
  if (val > 115) return { type: 'warning', text: 'Creatinine tăng cao (>115 µmol/L)' }
  return null
}

function getEgfrAlert(val: number | undefined) {
  if (!val) return null
  if (val < 60) return { type: 'warning', text: 'Suy giảm mức lọc cầu thận (<60 mL/phút)' }
  return null
}

export function Measurements({ data, editable, onSave }: { data: ClinicalData; editable: boolean; onSave: SaveChange }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const bpSys = Form.useWatch('bpSys', form)
  const bpDia = Form.useWatch('bpDia', form)
  const heartRate = Form.useWatch('heartRate', form)
  const temperature = Form.useWatch('temperature', form)
  const glucose = Form.useWatch('glucose', form)
  const creatinine = Form.useWatch('creatinine', form)
  const egfr = Form.useWatch('egfr', form)
  const weight = Form.useWatch('weight', form)

  const baselineWeight = data.record.weights.length > 0 ? Number(data.record.weights[data.record.weights.length - 1].kilograms) : undefined
  const latestWeightNum = data.record.weights.length > 0 ? Number(data.record.weights[0].kilograms) : undefined

  let weightDeltaTag: { type: 'error' | 'warning' | 'info'; text: string } | null = null
  if (weight && baselineWeight) {
    const diff = Number((Number(weight) - baselineWeight).toFixed(1))
    if (diff >= 2) {
      weightDeltaTag = {
        type: 'error',
        text: `Tăng +${diff} kg so với ban đầu (${baselineWeight} kg) ⚠️ Nghi ngờ tích dịch / phù do thuốc!`,
      }
    } else if (diff > 0) {
      weightDeltaTag = {
        type: 'warning',
        text: `Tăng +${diff} kg so với ban đầu (${baselineWeight} kg)`,
      }
    } else if (diff < 0) {
      weightDeltaTag = {
        type: 'info',
        text: `Giảm ${Math.abs(diff)} kg so với ban đầu (${baselineWeight} kg)`,
      }
    }
  }

  const sysAlert = getBpSysAlert(bpSys)
  const diaAlert = getBpDiaAlert(bpDia)
  const hrAlert = getHeartRateAlert(heartRate)
  const tempAlert = getTempAlert(temperature)
  const gluAlert = getGlucoseAlert(glucose)
  const crAlert = getCreatinineAlert(creatinine)
  const egfrAlert = getEgfrAlert(egfr)

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
      weight: 'WEIGHT',
    }

    for (const [field, kind] of Object.entries(mapping)) {
      if (values[field] !== undefined && values[field] !== null && values[field] !== '') {
        items.push({ kind, value: Number(values[field]) })
      }
    }

    if (items.length === 0) {
      message.warning({
        content: 'Chưa có chỉ số nào được nhập! Vui lòng điền ít nhất một ô để lưu.',
        icon: <ExclamationCircleFilled style={{ color: '#faad14' }} />,
      })
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
        notification.success({
          message: 'Lưu thành công',
          description: `Đã ghi nhận ${items.length} chỉ số sinh hiệu & xét nghiệm vào hồ sơ bệnh nhân.`,
          placement: 'topRight',
        })
      }
    } catch (err: any) {
      message.error(err instanceof Error ? err.message : 'Không lưu được kết quả đo')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteObservation(observationId: string) {
    setDeletingId(observationId)
    try {
      const ok = await onSave({
        action: 'DELETE_OBSERVATION',
        observationId,
      })
      if (ok) {
        message.success('Đã xóa kết quả đo thành công.')
      }
    } catch (err: any) {
      message.error(err instanceof Error ? err.message : 'Không thể xóa kết quả đo')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {!editable && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleFilled />}
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
                <Form.Item
                  name="bpSys"
                  label={
                    <Space size={4}>
                      <span>Huyết áp tâm thu (Tối đa)</span>
                      {sysAlert && (
                        <Tag icon={<ExclamationCircleFilled />} color={sysAlert.type === 'error' ? 'red' : 'gold'}>
                          {sysAlert.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  dependencies={['bpDia']}
                  rules={[
                    { type: 'number', min: 30, max: 300, message: 'Tâm thu hợp lệ từ 30 - 300 mmHg' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const dia = getFieldValue('bpDia')
                        if (value && dia && Number(value) <= Number(dia)) {
                          return Promise.reject(new Error('Tâm thu phải lớn hơn tâm trương!'))
                        }
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <InputNumber min={30} max={300} style={{ width: '100%' }} placeholder="VD: 120" addonAfter="mmHg" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="bpDia"
                  label={
                    <Space size={4}>
                      <span>Huyết áp tâm trương (Tối thiểu)</span>
                      {diaAlert && (
                        <Tag icon={<ExclamationCircleFilled />} color={diaAlert.type === 'error' ? 'red' : 'gold'}>
                          {diaAlert.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  dependencies={['bpSys']}
                  rules={[
                    { type: 'number', min: 20, max: 200, message: 'Tâm trương hợp lệ từ 20 - 200 mmHg' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const sys = getFieldValue('bpSys')
                        if (value && sys && Number(value) >= Number(sys)) {
                          return Promise.reject(new Error('Tâm trương phải nhỏ hơn tâm thu!'))
                        }
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <InputNumber min={20} max={200} style={{ width: '100%' }} placeholder="VD: 80" addonAfter="mmHg" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="heartRate"
                  label={
                    <Space size={4}>
                      <span>Nhịp tim / Mạch</span>
                      {hrAlert && (
                        <Tag icon={<ExclamationCircleFilled />} color="gold">
                          {hrAlert.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  rules={[{ type: 'number', min: 30, max: 250, message: 'Nhịp tim hợp lệ từ 30 - 250 lần/phút' }]}
                >
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
                <Form.Item
                  name="temperature"
                  label={
                    <Space size={4}>
                      <span>Nhiệt độ cơ thể</span>
                      {tempAlert && (
                        <Tag icon={<ExclamationCircleFilled />} color={tempAlert.type === 'error' ? 'red' : 'gold'}>
                          {tempAlert.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  rules={[{ type: 'number', min: 30, max: 45, message: 'Thân nhiệt hợp lệ từ 30.0 - 45.0 °C' }]}
                >
                  <InputNumber min={30} max={45} step={0.1} precision={1} style={{ width: '100%' }} placeholder="VD: 37.0" addonAfter="°C" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="glucose"
                  label={
                    <Space size={4}>
                      <span>Glucose máu (Đường huyết)</span>
                      {gluAlert && (
                        <Tag icon={<ExclamationCircleFilled />} color={gluAlert.type === 'error' ? 'red' : 'gold'}>
                          {gluAlert.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  rules={[{ type: 'number', min: 0.5, max: 50, message: 'Đường huyết hợp lệ từ 0.5 - 50.0 mmol/L' }]}
                >
                  <InputNumber min={0.5} max={50} step={0.1} precision={2} style={{ width: '100%' }} placeholder="VD: 6.5" addonAfter="mmol/L" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="hba1c"
                  label="Chỉ số HbA1c"
                  rules={[{ type: 'number', min: 3, max: 20, message: 'HbA1c hợp lệ từ 3.0 - 20.0 %' }]}
                >
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
                <Form.Item
                  name="creatinine"
                  label={
                    <Space size={4}>
                      <span>Creatinine huyết thanh</span>
                      {crAlert && (
                        <Tag icon={<ExclamationCircleFilled />} color="gold">
                          {crAlert.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  rules={[{ type: 'number', min: 10, max: 2000, message: 'Creatinine hợp lệ từ 10 - 2000 µmol/L' }]}
                >
                  <InputNumber min={10} max={2000} step={1} style={{ width: '100%' }} placeholder="VD: 95" addonAfter="µmol/L" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={12}>
                <Form.Item
                  name="egfr"
                  label={
                    <Space size={4}>
                      <span>Mức lọc cầu thận ước tính (eGFR)</span>
                      {egfrAlert && (
                        <Tag icon={<ExclamationCircleFilled />} color="gold">
                          {egfrAlert.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  rules={[{ type: 'number', min: 5, max: 200, message: 'eGFR hợp lệ từ 5 - 200 mL/phút' }]}
                >
                  <InputNumber min={5} max={200} step={1} style={{ width: '100%' }} placeholder="VD: 85" addonAfter="mL/phút" />
                </Form.Item>
              </Col>
            </Row>

            {/* Nhóm Cân nặng & Theo dõi phù / biến động cân nặng */}
            <Typography.Text strong style={{ color: '#0f172a', display: 'block', marginTop: 10, marginBottom: 10 }}>
              4. Cân nặng & Giám sát phù ngoại vi (Biến động thể trạng):
            </Typography.Text>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={12}>
                <Form.Item
                  name="weight"
                  label={
                    <Space size={4}>
                      <span>Cân nặng hôm nay</span>
                      {weightDeltaTag && (
                        <Tag
                          icon={<ExclamationCircleFilled />}
                          color={weightDeltaTag.type === 'error' ? 'red' : weightDeltaTag.type === 'warning' ? 'gold' : 'blue'}
                        >
                          {weightDeltaTag.text}
                        </Tag>
                      )}
                    </Space>
                  }
                  rules={[{ type: 'number', min: 1, max: 500, message: 'Cân nặng hợp lệ từ 1 đến 500 kg' }]}
                  extra={
                    baselineWeight
                      ? `Cân nặng ban đầu lúc nhập viện: ${baselineWeight} kg · Lần cân gần nhất: ${latestWeightNum} kg`
                      : 'Chưa có dữ liệu cân nặng ban đầu để so sánh biến động.'
                  }
                >
                  <InputNumber min={1} max={500} step={0.5} precision={1} style={{ width: '100%' }} placeholder="VD: 63.5" addonAfter="kg" />
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

            <Space size="middle" wrap>
              <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={saving} style={{ background: '#0284c7' }}>
                Lưu tất cả sinh hiệu & xét nghiệm
              </Button>
              <Popconfirm
                title="Xác nhận xóa trắng"
                description="Bạn có chắc chắn muốn xóa sạch các chỉ số đang nhập trên phiếu này?"
                okText="Xóa trắng"
                cancelText="Hủy"
                onConfirm={() => {
                  form.resetFields()
                  message.info('Đã xóa trắng các ô nhập.')
                }}
              >
                <Button size="large" icon={<ReloadOutlined />}>
                  Đặt lại ô nhập
                </Button>
              </Popconfirm>
            </Space>
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
            <List.Item
              actions={[
                editable && (
                  <Popconfirm
                    key="delete"
                    title="Xóa kết quả đo"
                    description={`Bạn có chắc muốn xóa bản ghi "${data.observationKinds[row.kind]?.[0] ?? row.kind}: ${formatObservationValue(row.value)} ${row.unit}"?`}
                    okText="Xóa bản ghi"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true, loading: deletingId === row.id }}
                    onConfirm={() => handleDeleteObservation(row.id)}
                  >
                    <Button type="link" danger icon={<DeleteOutlined />} size="small">
                      Xóa
                    </Button>
                  </Popconfirm>
                ),
              ].filter(Boolean)}
            >
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
