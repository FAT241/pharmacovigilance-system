import { Button, Form, Input, Typography } from 'antd'
import type { ClinicalRecord, SaveChange } from './types'

export function Publication({ record, editable, onSave }: { record: ClinicalRecord; editable: boolean; onSave: SaveChange }) {
  return <>
    {record.publishedAt && <section><Typography.Title level={5}>Đã công bố ngày {new Date(record.publishedAt).toLocaleString('vi-VN')}</Typography.Title>
      <p>{record.publishedDiagnoses.join(', ')}</p><p>{record.publishedAdvice}</p></section>}
    {editable && <Form layout="vertical" initialValues={{ advice: record.publishedAdvice || '' }} onFinish={({ advice }) => onSave({ action: 'PUBLISH', advice })}>
      <p>Chẩn đoán sẽ gửi cho bệnh nhân: {record.diagnoses.map(d => d.code + ' · ' + d.name).join(', ') || 'Chưa ghi nhận'}</p>
      <Form.Item name="advice" label="Lời dặn của bác sĩ"><Input.TextArea rows={4} maxLength={3000} showCount /></Form.Item>
      <Button htmlType="submit" type="primary">Công bố cho bệnh nhân</Button>
    </Form>}
    {!editable && !record.publishedAt && <p>Chưa có nội dung được công bố.</p>}
  </>
}
