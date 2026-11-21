import { Button, Card, Form, InputNumber, Select, Space } from 'antd'
import type { ClinicalData } from '../../encounters/server/clinical/types'
import { ScheduleFields } from './ScheduleFields'
import type { OrderEditor, OrderInput } from './types'

export function OrderForm({ editor, drugs, busy, onClose, onSave }: {
  editor: OrderEditor; drugs: ClinicalData['medications']; busy: boolean; onClose: () => void; onSave: (values: OrderInput) => void
}) {
  const [form] = Form.useForm<OrderInput>()
  const selected = Form.useWatch('medicationId', form)
  const item = editor.kind === 'NEW' ? undefined : editor.item
  const drug = drugs.find(m => m.id === selected)
  const unit = drug?.baseUnit ?? item?.doseUnit
  return <Card size="small" title={{ NEW: 'Kê thuốc', EDIT: 'Sửa y lệnh nháp', REPLACE: 'Thay thế y lệnh' }[editor.kind]}
    >
    <Form form={form} layout="vertical" onFinish={v => onSave({ ...v, durationDays: v.durationDays ?? null })} initialValues={item ? {
      medicationId: item.medicationId, dose: Number(item.dose), timesPerDay: item.schedule.timesPerDay, slots: item.schedule.slots, route: item.route, durationDays: item.durationDays,
    } : { route: 'Uống' }}>
      <Form.Item name="medicationId" label="Thuốc" rules={[{ required: true }]}>
        <Select showSearch optionFilterProp="label" disabled={editor.kind === 'EDIT' && !!editor.item.reviewId}
          options={drugs.map(m => ({ value: m.id, label: m.code + ' · ' + m.name + ' ' + m.strength }))} />
      </Form.Item>
      {drug && <p>{drug.dosageForm} · {drug.activeIngredients.map(a => a.ingredient.name + ' ' + a.amount + ' mg/' + (drug.baseUnit === 'ML' ? 'mL' : 'viên')).join(', ')}<br />{drug.groups.map(g => g.name).join(', ')}</p>}
      <Form.Item name="dose" label="Liều mỗi lần" rules={[{ required: true }]}>
        <InputNumber min={0.0001} max={99999999} precision={4} addonAfter={unit ? unit === 'ML' ? 'mL' : 'viên' : undefined} />
      </Form.Item>
      <ScheduleFields />
      <Form.Item name="route" label="Đường dùng" rules={[{ required: true }]}><Select options={['Uống', 'Ngậm dưới lưỡi', 'Qua ống thông'].map(value => ({ value }))} /></Form.Item>
      <Form.Item name="durationDays" label="Số ngày dùng" extra="Để trống nếu dùng đến khi bác sĩ ngừng hoặc xuất viện."><InputNumber min={1} max={365} precision={0} /></Form.Item>
      <Space><Button type="primary" htmlType="submit" loading={busy}>Lưu nháp</Button><Button disabled={busy} onClick={onClose}>Hủy</Button></Space>
    </Form>
  </Card>
}
