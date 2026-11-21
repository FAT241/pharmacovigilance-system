import { useState } from 'react'
import { Alert, Button, Form, Input, List, Modal } from 'antd'
import { ApiError, requestApi } from './api'
export type DrugGroup = { code: string; name: string }

export function GroupCatalog({ groups, token, onSave, onClose, onExpired }: {
  groups: DrugGroup[]; token: string; onSave: (group: DrugGroup) => void; onClose: () => void; onExpired: () => void
}) {
  const [editing, setEditing] = useState<DrugGroup>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form] = Form.useForm<DrugGroup>()
  function edit(row?: DrugGroup) {
    setEditing(row)
    form.setFieldsValue(row || { name: '', code: '' })
  }
  async function save(values: DrugGroup) {
    setBusy(true)
    setError('')
    try {
      onSave(await requestApi<DrugGroup>('/medications/groups' + (editing ? '/' + encodeURIComponent(editing.code) : ''), token, editing ? 'PUT' : 'POST', values))
      edit()
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired()
      else setError(e instanceof Error ? e.message : 'Không lưu được nhóm thuốc.')
    } finally { setBusy(false) }
  }
  return <Modal open title="Nhóm dược lý" onCancel={() => { if (!busy) onClose() }} footer={null}>
    {error && <Alert showIcon type="error" message={error} />}
    <List dataSource={groups} renderItem={g => <List.Item actions={[<Button key="edit" disabled={busy} onClick={() => edit(g)}>Sửa</Button>]}>{g.code} · {g.name}</List.Item>} />
    <Form layout="vertical" form={form} onFinish={save}>
      <Form.Item name="code" label="Mã nhóm" rules={[{ required: true }, { pattern: /^[a-z\d_-]{1,60}$/i }]}><Input disabled={!!editing} /></Form.Item>
      <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, whitespace: true }]}><Input maxLength={150} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={busy}>{editing ? 'Lưu tên nhóm' : 'Thêm nhóm'}</Button>
      {editing && <Button disabled={busy} onClick={() => edit()}>Hủy sửa</Button>}
    </Form>
  </Modal>
}
