import { useState } from 'react'
import { Alert, Button, Form, Input, Modal, Result, Select, Typography } from 'antd'
import { UserAddOutlined } from '@ant-design/icons'
import { ApiError, requestApi } from '../api'
import type { PatientRow } from '../types'

export function CreatePatientAccount({ token, onExpired, onSaved }: { token: string; onExpired: () => void; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<PatientRow>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form] = Form.useForm()
  async function submit(values: object) {
    setBusy(true); setError('')
    try { setCreated(await requestApi<PatientRow>('/accounts/patients', token, 'POST', values)); onSaved() }
    catch (e) { if (e instanceof ApiError && e.status === 401) onExpired(); else setError(e instanceof Error ? e.message : 'Không thể cấp mã.') }
    finally { setBusy(false) }
  }
  return <><Button icon={<UserAddOutlined />} onClick={() => { setError(''); setCreated(undefined); setOpen(true) }}>Cấp tài khoản bệnh nhân</Button>
    <Modal open={open} title="Cấp tài khoản bệnh nhân" destroyOnHidden onCancel={() => { if (!busy) setOpen(false) }}
      okText={created ? 'Đóng' : 'Cấp mã'} cancelText="Hủy" confirmLoading={busy} onOk={() => created ? setOpen(false) : form.submit()}>
      {error && <Alert type="error" message={error} showIcon />}
      {created ? <Result status="success" title={created.user.fullName} subTitle={<Typography.Text copyable>{created.patientCode}</Typography.Text>} /> :
        <Form form={form} preserve={false} layout="vertical" onFinish={submit}>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, whitespace: true }]}><Input maxLength={120} /></Form.Item>
          <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="gender" label="Giới tính" rules={[{ required: true }]}><Select options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} /></Form.Item>
          <Form.Item name="idCard" label="CCCD" rules={[{ pattern: /^\d{12}$/, message: 'Nhập đủ 12 chữ số.' }]}><Input maxLength={12} /></Form.Item>
        </Form>}
    </Modal></>
}
