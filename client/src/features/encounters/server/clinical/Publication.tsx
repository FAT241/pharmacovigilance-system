import { Alert, Button, Form, Input, Popconfirm, Space, Typography, message } from 'antd'
import { CheckCircleOutlined, ExclamationCircleFilled, SendOutlined } from '@ant-design/icons'
import type { ClinicalRecord, SaveChange } from './types'

export function Publication({ record, editable, onSave }: { record: ClinicalRecord; editable: boolean; onSave: SaveChange }) {
  const [form] = Form.useForm()

  async function handleFinish({ advice }: { advice: string }) {
    if (!advice?.trim()) {
      message.warning('Vui lòng nhập nội dung lời dặn trước khi công bố!')
      return
    }
    const ok = await onSave({ action: 'PUBLISH', advice: advice.trim() })
    if (ok) {
      message.success('Đã công bố chẩn đoán và lời dặn cho bệnh nhân thành công!')
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {record.publishedAt && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={`Đã công bố vào lúc ${new Date(record.publishedAt).toLocaleString('vi-VN')}`}
          description={
            <div>
              <p><strong>Chẩn đoán đã công bố:</strong> {record.publishedDiagnoses.join(', ') || 'Chưa có'}</p>
              <p><strong>Lời dặn:</strong> {record.publishedAdvice}</p>
            </div>
          }
        />
      )}
      {editable && (
        <Form form={form} layout="vertical" initialValues={{ advice: record.publishedAdvice || '' }} onFinish={handleFinish}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Chẩn đoán hiện tại sẽ gửi cho bệnh nhân"
            description={record.diagnoses.map(d => `${d.code} · ${d.name}`).join(', ') || 'Chưa ghi nhận chẩn đoán nào'}
          />
          <Form.Item
            name="advice"
            label="Lời dặn của bác sĩ điều trị"
            rules={[{ required: true, message: 'Vui lòng nhập lời dặn của bác sĩ trước khi công bố!' }]}
          >
            <Input.TextArea rows={4} maxLength={3000} showCount placeholder="Ví dụ: Uống thuốc đúng giờ sau ăn, hạn chế ăn mặn, tái khám sau 7 ngày..." />
          </Form.Item>
          <Popconfirm
            title="Xác nhận công bố"
            description="Bác sĩ có chắc chắn muốn công bố chẩn đoán và lời dặn này cho bệnh nhân không?"
            okText="Công bố ngay"
            cancelText="Hủy"
            onConfirm={() => form.submit()}
          >
            <Button type="primary" icon={<SendOutlined />} style={{ background: '#0284c7' }}>
              Công bố cho bệnh nhân
            </Button>
          </Popconfirm>
        </Form>
      )}
      {!editable && !record.publishedAt && <p>Chưa có nội dung được công bố cho bệnh nhân.</p>}
    </Space>
  )
}
