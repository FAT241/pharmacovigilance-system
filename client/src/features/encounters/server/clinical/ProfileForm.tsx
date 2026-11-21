import { Alert, Button, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, Typography, message } from 'antd'
import { ExclamationCircleFilled, HeartOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
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
      if (ok) {
        form.setFieldValue('kilograms', undefined)
        message.success('Đã cập nhật thông tin lâm sàng và tiền sử thành công.')
      }
    }}>
    <Form.Item name="historyNote" label="Tiền sử bệnh nhân"><Input.TextArea maxLength={3000} rows={2} placeholder="Ghi nhận tiền sử bệnh, dị ứng gia đình, thói quen sinh hoạt..." /></Form.Item>
    <Form.Item name="conditions" label="Bệnh nền"><Select mode="multiple" optionFilterProp="label"
      placeholder="Chọn hoặc tìm bệnh nền..."
      options={data.diseases.map(d => ({ value: d.code, label: d.code + ' · ' + d.name }))} /></Form.Item>
    <Form.Item name="diagnoses" label="Chẩn đoán trong đợt" rules={[{ required: true, message: 'Vui lòng chọn ít nhất một chẩn đoán trong đợt!' }]}>
      <Select mode="multiple" placeholder="Chọn chẩn đoán điều trị trong đợt" optionFilterProp="label"
        options={data.diseases.map(d => ({ value: d.code, label: d.code + ' · ' + d.name }))} />
    </Form.Item>
    <Form.Item
      name="allergyStatus"
      label={
        <Space size={4}>
          <span>Tiền sử dị ứng</span>
          {status === 'UNKNOWN' && (
            <Tag icon={<ExclamationCircleFilled />} color="orange">
              Chưa xác minh dị ứng - Cần khai thác
            </Tag>
          )}
          {status === 'REPORTED' && (
            <Tag icon={<ExclamationCircleFilled />} color="red">
              Bệnh nhân có tiền sử dị ứng
            </Tag>
          )}
        </Space>
      }
    >
      <Select options={statusOptions} />
    </Form.Item>
    {status === 'REPORTED' && <Form.Item name="allergens" label="Tác nhân dị ứng" rules={[{ required: true, message: 'Vui lòng chọn ít nhất một tác nhân dị ứng!' }]}>
      <Select mode="multiple" optionFilterProp="label" placeholder="Chọn hoạt chất / dị nguyên..." options={data.allergens.map(a => ({ value: a.code, label: a.name }))} />
    </Form.Item>}
    {editable && <Form.Item
      name="kilograms"
      label="Ghi cân nặng tại thời điểm lưu"
      rules={[{ type: 'number', min: 1, max: 500, message: 'Cân nặng hợp lệ từ 1 đến 500 kg!' }]}
    >
      <InputNumber min={1} max={500} precision={1} addonAfter="kg" placeholder="VD: 65.5" style={{ width: '100%' }} />
    </Form.Item>}
    {record.weights.length > 0 && <details style={{ marginBottom: 14 }}>
      <summary><HeartOutlined /> Cân nặng gần nhất · {Number(record.weights[0].kilograms)} kg</summary>
      <ul>{record.weights.map(w => <li key={w.id}>{new Date(w.measuredAt).toLocaleString('vi-VN')} · {Number(w.kilograms)} kg</li>)}</ul>
    </details>}
    <Space>{editable && <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Lưu hồ sơ</Button>}
      {!editable && <Typography.Text type="secondary">Hồ sơ ở chế độ xem.</Typography.Text>}</Space>
  </Form>
}
