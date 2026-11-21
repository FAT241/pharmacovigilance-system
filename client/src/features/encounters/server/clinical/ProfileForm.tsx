import { Button, Form, Input, InputNumber, Select, Space, Typography } from 'antd'
import { HeartOutlined, SaveOutlined } from '@ant-design/icons'
import type { ClinicalData, ClinicalProfile, SaveChange } from './types'

const statusOptions = [
  { value: 'UNKNOWN', label: 'Chưa xác minh' },
  { value: 'NONE_REPORTED', label: 'Đã hỏi, chưa ghi nhận dị ứng' },
  { value: 'REPORTED', label: 'Có dị ứng đã ghi nhận' },
]
export function ProfileForm({ data, editable, onSave }: { data: ClinicalData; editable: boolean; onSave: SaveChange }) {
  const [form] = Form.useForm<ClinicalProfile>()
  const status = Form.useWatch('allergyStatus', form)
  const { record } = data
  return <Form form={form} layout="vertical" disabled={!editable}
    initialValues={{ diagnoses: record.diagnoses.map(d => d.code), allergyStatus: record.allergyStatus, allergens: record.allergens.map(a => a.code),
      historyNote: record.patient.historyNote, conditions: record.patient.conditions.map(c => c.code) }}
    onFinish={async values => {
      const ok = await onSave({ ...values, action: 'PROFILE', allergens: values.allergyStatus === 'REPORTED' ? values.allergens : [],
        kilograms: values.kilograms ?? undefined })
      if (ok) form.setFieldValue('kilograms', undefined)
    }}>
    <Form.Item name="historyNote" label="Tiền sử bệnh nhân"><Input.TextArea maxLength={3000} rows={2} /></Form.Item>
    <Form.Item name="conditions" label="Bệnh nền"><Select mode="multiple" optionFilterProp="label"
      options={data.diseases.map(d => ({ value: d.code, label: d.code + ' · ' + d.name }))} /></Form.Item>
    <Form.Item name="diagnoses" label="Chẩn đoán trong đợt">
      <Select mode="multiple" placeholder="Chọn chẩn đoán thí điểm" optionFilterProp="label"
        options={data.diseases.map(d => ({ value: d.code, label: d.code + ' · ' + d.name }))} />
    </Form.Item>
    <Form.Item name="allergyStatus" label="Tiền sử dị ứng"><Select options={statusOptions} /></Form.Item>
    {status === 'REPORTED' && <Form.Item name="allergens" label="Tác nhân dị ứng" rules={[{ required: true, message: 'Chọn ít nhất một tác nhân.' }]}>
      <Select mode="multiple" optionFilterProp="label" options={data.allergens.map(a => ({ value: a.code, label: a.name }))} />
    </Form.Item>}
    {editable && <Form.Item name="kilograms" label="Ghi cân nặng tại thời điểm lưu">
      <InputNumber min={0.01} max={9999.99} precision={2} addonAfter="kg" />
    </Form.Item>}
    {record.weights.length > 0 && <details style={{ marginBottom: 14 }}>
      <summary><HeartOutlined /> Cân nặng gần nhất · {record.weights[0].kilograms} kg</summary>
      <ul>{record.weights.map(w => <li key={w.id}>{new Date(w.measuredAt).toLocaleString('vi-VN')} · {w.kilograms} kg</li>)}</ul>
    </details>}
    <Space>{editable && <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Lưu hồ sơ</Button>}
      {!editable && <Typography.Text type="secondary">Hồ sơ ở chế độ xem.</Typography.Text>}</Space>
  </Form>
}
