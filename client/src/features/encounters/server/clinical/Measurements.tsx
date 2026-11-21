import { Button, Form, Input, InputNumber, List, Select } from 'antd'
import type { ClinicalData, SaveChange } from './types'

export function Measurements({ data, editable, onSave }: { data: ClinicalData; editable: boolean; onSave: SaveChange }) {
  const [form] = Form.useForm<{ kind: string; value: number; time?: string }>()
  const kind = Form.useWatch('kind', form)
  return <>
    {editable && <Form form={form} layout="vertical" onFinish={async ({ kind, value, time }) => {
      if (await onSave({ action: 'OBSERVATION', kind, value, measuredAt: new Date(time || Date.now()).toISOString() })) form.resetFields()
    }}>
      <Form.Item name="kind" label="Chỉ số" rules={[{ required: true }]}><Select options={Object.entries(data.observationKinds).map(([value, [label]]) => ({ value, label }))} /></Form.Item>
      <Form.Item name="value" label="Kết quả" rules={[{ required: true }]}><InputNumber min={0} precision={3} addonAfter={data.observationKinds[kind]?.[1]} /></Form.Item>
      <Form.Item name="time" label="Thời điểm đo" extra="Để trống để ghi nhận thời điểm hiện tại."><Input type="datetime-local" /></Form.Item>
      <Button type="primary" htmlType="submit">Lưu kết quả đo</Button>
    </Form>}
    <List dataSource={data.record.observations} locale={{ emptyText: 'Chưa có kết quả đo' }} renderItem={row =>
      <List.Item><List.Item.Meta title={data.observationKinds[row.kind]?.[0] ?? row.kind} description={new Date(row.measuredAt).toLocaleString('vi-VN')} />{row.value} {row.unit}</List.Item>} />
  </>
}
