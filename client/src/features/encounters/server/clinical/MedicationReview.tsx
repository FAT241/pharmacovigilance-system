import { useState } from 'react'
import { Alert, Button, Form, Input, InputNumber, List, Modal, Popconfirm, Select, Space, Typography } from 'antd'
import { PlusOutlined, MedicineBoxOutlined, DeleteOutlined } from '@ant-design/icons'
import { ScheduleFields } from '../../../prescriptions/server/ScheduleFields'
import type { ClinicalData, DrugReview, SaveChange } from './types'

export function MedicationReview({ data, editable, onSave }: { data: ClinicalData; editable: boolean; onSave: SaveChange }) {
  const [selected, setSelected] = useState<string>()
  const [stopping, setStopping] = useState<DrugReview>()
  const [reason, setReason] = useState('')
  const [continuing, setContinuing] = useState<DrugReview>()
  const [form] = Form.useForm<{ dose: number; timesPerDay: number }>()
  const pending = data.record.reconciliation.filter(row => row.decision === 'PENDING').length
  return <Space direction="vertical" style={{ width: '100%' }} size="middle">
    {pending > 0 && <Alert type="warning" showIcon message={'Còn ' + pending + ' thuốc chờ đối chiếu'} />}
    {editable && <div>
      <label htmlFor="home-medication">Thuốc bệnh nhân đang dùng</label>
      <Space.Compact style={{ width: '100%', marginTop: 6 }}>
        <Select id="home-medication" style={{ flex: 1 }} showSearch optionFilterProp="label"
          placeholder="Chọn thuốc trong danh mục" value={selected} onChange={setSelected}
          options={data.medications.map(m => ({ value: m.id, label: m.code + ' · ' + m.name + ' ' + m.strength }))} />
        <Button icon={<PlusOutlined />} disabled={!selected} onClick={async () => {
          if (selected && await onSave({ action: 'ADD_MEDICATION', medicationId: selected })) setSelected(undefined)
        }}>Ghi nhận</Button>
      </Space.Compact>
    </div>}
    <List dataSource={data.record.reconciliation} locale={{ emptyText: 'Chưa ghi nhận thuốc đang dùng' }}
      renderItem={row => {
        const drug = row.homeMedication.medication
        const draft = row.draftItem
        return <List.Item><Space direction="vertical" size={4}>
          <Typography.Text strong><MedicineBoxOutlined /> {drug.name} · {drug.strength}</Typography.Text>
          <Typography.Text type="secondary">{row.decision === 'STOP' ? 'Đã ngừng' + (row.stopReason ? ' · ' + row.stopReason : '') : draft
            ? { DRAFT: 'Y lệnh nháp', ACTIVE: 'Đang hiệu lực', ENDED: 'Đã kết thúc', REPLACED: 'Đã thay thế' }[draft.status] + ' · ' + draft.dose + (draft.doseUnit === 'ML' ? ' mL' : ' viên') + '/lần · ' + draft.schedule.timesPerDay + ' lần/ngày'
            : 'Chờ đối chiếu'}</Typography.Text>
          {row.decision === 'PENDING' && editable && <Space wrap>
            <Button disabled={!drug.active} onClick={() => setContinuing(row)}>Tiếp tục</Button>
            <Button onClick={() => { setReason(''); setStopping(row) }}>Ngừng</Button>
            <Popconfirm
              title="Xóa dòng thuốc tại nhà"
              description={`Xóa thuốc "${drug.name}" khỏi danh sách đối chiếu?`}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => onSave({ action: 'REMOVE_MEDICATION', reviewId: row.id })}
            >
              <Button danger icon={<DeleteOutlined />}>Xóa</Button>
            </Popconfirm>
          </Space>}
        </Space></List.Item>
      }} />
    {stopping && <Modal open title={'Ngừng · ' + stopping.homeMedication.medication.name} okText="Xác nhận ngừng" cancelText="Hủy"
      okButtonProps={{ disabled: !reason.trim() }} onCancel={() => setStopping(undefined)} onOk={async () => {
        if (await onSave({ action: 'STOP', reviewId: stopping.id, reason: reason.trim() })) setStopping(undefined)
      }}><label>Lý do ngừng thuốc tại nhà<Input.TextArea rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label></Modal>}
    {continuing && <Modal open title={'Tiếp tục · ' + continuing.homeMedication.medication.name}
      okText="Tạo y lệnh nháp" cancelText="Hủy" onOk={() => form.submit()} onCancel={() => setContinuing(undefined)}>
      <Form layout="vertical" form={form} initialValues={{ route: 'Uống' }} preserve={false} onFinish={async values => {
        if (await onSave({ action: 'CONTINUE', reviewId: continuing.id, ...values })) setContinuing(undefined)
      }}>
        <Form.Item name="dose" label="Liều mỗi lần" rules={[{ required: true }]}>
          <InputNumber min={0.0001} max={99999999} precision={4} addonAfter={continuing.homeMedication.medication.baseUnit === 'ML' ? 'mL' : 'viên'} />
        </Form.Item>
        <Form.Item name="route" label="Đường dùng" rules={[{ required: true }]}><Select options={['Uống', 'Ngậm dưới lưỡi', 'Qua ống thông'].map(value => ({ value }))} /></Form.Item>
        <Form.Item name="durationDays" label="Số ngày dùng"><InputNumber min={1} max={365} precision={0} /></Form.Item>
        <ScheduleFields />
      </Form>
    </Modal>}
  </Space>
}
