import { useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { GroupCatalog, type DrugGroup } from './GroupCatalog'
import { ApiError, requestApi } from './api'
import type { MedicationRow } from './types'

type Fields = Pick<MedicationRow, 'code' | 'name' | 'strength' | 'dosageForm' | 'baseUnit'> & {
  ingredients: { name: string; amount: number }[]
  allergenCodes: string[]
  groupCodes: string[]
}
const required = { required: true, message: 'Vui lòng nhập thông tin.' }

export function Medications({ token, onExpired, readOnly }: { token: string; onExpired: () => void; readOnly: boolean }) {
  const { message, modal } = App.useApp()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<MedicationRow[]>([])
  const [allergens, setAllergens] = useState<MedicationRow['allergens']>([])
  const [groups, setGroups] = useState<DrugGroup[]>([])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [editing, setEditing] = useState<MedicationRow | null>()
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm<Fields>()

  function report(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onExpired()
    else modal.error({
      title: 'Không thể hoàn tất thao tác',
      content: cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.',
      okText: 'Đóng',
    })
  }

  useEffect(() => {
    let cancelled = false
    requestApi<DrugGroup[]>('/medications/groups', token).then(result => { if (!cancelled) setGroups(result) }).catch(cause => { if (!cancelled) report(cause) })
    if (!readOnly) requestApi<MedicationRow['allergens']>('/medications/allergens', token).then(data => {
      if (!cancelled) setAllergens(data)
    }).catch(cause => { if (!cancelled) report(cause) })
    requestApi<MedicationRow[]>('/medications', token).then(data => {
      if (!cancelled) setRows(data)
    }).catch(cause => {
      if (!cancelled) report(cause)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [token])

  function open(row: MedicationRow | null) {
    setEditing(row)
  }

  function replace(row: MedicationRow) {
    setRows(previous => previous.some(item => item.id === row.id)
      ? previous.map(item => item.id === row.id ? row : item)
      : [row, ...previous])
  }

  async function save(values: Fields) {
    setBusy(true)
    try {
      replace(await requestApi<MedicationRow>(editing ? '/medications/' + editing.id : '/medications',
        token, editing ? 'PUT' : 'POST', values))
      setEditing(undefined)
      message.success('Đã lưu thuốc.')
    } catch (cause) { report(cause) }
    finally { setBusy(false) }
  }

  function confirmStatus(row: MedicationRow) {
    modal.confirm({
      title: row.active ? 'Ngừng sử dụng ' + row.name : 'Kích hoạt ' + row.name,
      okText: 'Xác nhận', cancelText: 'Hủy',
      onOk: async () => {
        try {
          replace(await requestApi<MedicationRow>('/medications/' + row.id + '/status', token, 'PATCH', { active: !row.active }))
          message.success(row.active ? 'Đã ngừng sử dụng ' + row.name + '.' : 'Đã kích hoạt ' + row.name + '.')
        }
        catch (cause) { report(cause) }
      },
    })
  }

  async function deleteMedication(row: MedicationRow) {
    try {
      await requestApi('/medications/' + row.id, token, 'DELETE')
      setRows(previous => previous.filter(r => r.id !== row.id))
      message.success('Đã xóa thuốc ' + row.name + ' khỏi danh mục.')
    } catch (cause) {
      report(cause)
    }
  }

  return <Card>
    {!readOnly && <Button type="primary" onClick={() => open(null)} style={{ marginBottom: 16 }}>Thêm thuốc</Button>}
    {!readOnly && <Button onClick={() => setCatalogOpen(true)}>Nhóm dược lý</Button>}
    {catalogOpen && <GroupCatalog groups={groups} token={token} onClose={() => setCatalogOpen(false)} onExpired={onExpired}
      onSave={updated => setGroups(old => [...old.filter(g => g.code !== updated.code), updated].sort((a, b) => a.name.localeCompare(b.name, 'vi')))} />}
    <Input.Search style={{ maxWidth: 430, marginBlock: 12, display: 'block' }} allowClear aria-label="Tìm thuốc" placeholder="Tên thuốc, mã, hoạt chất hoặc nhóm" value={query} onChange={e => setQuery(e.target.value)} />
    <Table<MedicationRow>
      rowKey="id"
      dataSource={rows.filter(r => [r.name, r.code, ...r.activeIngredients.map(a => a.ingredient.name), ...r.groups.map(g => g.name)].join(' ').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))}
      loading={loading}
      scroll={{ x: 760 }}
      expandable={{
        expandedRowRender: (row) => (
          <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: 6 }}>
              <strong>Nguồn tài liệu tham chiếu (DrugBank VN / Dược thư):</strong>{' '}
              <span style={{ color: '#0369a1' }}>{row.referenceSource || 'Chưa ghi nhận nguồn.'}</span>
            </div>
            {row.referenceText && (
              <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', background: '#ffffff', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #0284c7' }}>
                "{row.referenceText}"
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Tác nhân dị ứng liên quan: {row.allergens.map(a => a.name).join(', ') || 'Không có'}
            </div>
          </div>
        ),
      }}
      columns={[
      { title: 'Mã', dataIndex: 'code' },
      { title: 'Tên thuốc', dataIndex: 'name' },
      { title: 'Nhóm dược lý', render: (_, row) => row.groups.map(g => groups.find(x => x.code === g.code)?.name ?? g.name).join(', ') },
      { title: 'Dạng bào chế', dataIndex: 'dosageForm' },
      { title: 'Hoạt chất', render: (_, row) => row.activeIngredients.map(item =>
        item.ingredient.name + ' ' + item.amount + ' mg/' + (row.baseUnit === 'ML' ? 'ml' : 'viên')).join(', ') },
      { title: 'Trạng thái', render: (_, row) => <Tag color={row.active ? 'green' : 'default'}>{row.active ? 'Đang sử dụng' : 'Đã ngừng'}</Tag> },
      ...(!readOnly ? [{ title: 'Thao tác', render: (_: unknown, row: MedicationRow) =>
        <Space wrap>
          <Button onClick={() => open(row)}>Sửa</Button>
          <Button danger={row.active} onClick={() => confirmStatus(row)}>{row.active ? 'Ngừng sử dụng' : 'Kích hoạt'}</Button>
          {(row._count?.orders || row._count?.homeMedications) ?
            <span>Đã có trong hồ sơ điều trị</span> : <Popconfirm
            title="Xóa thuốc khỏi danh mục"
            description={`Bạn có chắc muốn xóa thuốc "${row.name}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMedication(row)}
          >
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>}
        </Space> }] : []),
    ]} />
    {editing !== undefined && <Modal open title={editing ? 'Sửa thuốc' : 'Thêm thuốc'} okText="Lưu thuốc" cancelText="Hủy"
      confirmLoading={busy} onOk={() => form.submit()} onCancel={() => { if (!busy) setEditing(undefined) }}>
      <Form form={form} preserve={false} layout="vertical" onFinish={save} initialValues={editing
        ? { ...editing, groupCodes: editing.groups.map(g => g.code), referenceSource: editing.referenceSource ?? '', referenceText: editing.referenceText ?? '', allergenCodes: editing.allergens.map(a => a.code), ingredients: editing.activeIngredients.map(item => ({ name: item.ingredient.name, amount: Number(item.amount) })) }
        : { baseUnit: 'TABLET', ingredients: [{}] }}>
        <Form.Item label="Mã thuốc" name="code" rules={[required]}><Input /></Form.Item>
        <Form.Item label="Tên thuốc" name="name" rules={[required]}><Input /></Form.Item>
        <Form.Item label="Hàm lượng hiển thị" name="strength" rules={[required]}><Input /></Form.Item>
        <Form.Item label="Dạng bào chế" name="dosageForm" rules={[required]}><Input /></Form.Item>
        <Form.Item label="Đơn vị cơ sở" name="baseUnit" rules={[required]}>
          <Select options={[{ value: 'TABLET', label: 'Viên' }, { value: 'ML', label: 'ml' }]} />
        </Form.Item>
        <Form.Item label="Tác nhân dị ứng liên quan" name="allergenCodes">
          <Select mode="multiple" optionFilterProp="label" options={allergens.map(a => ({ value: a.code, label: a.name }))} />
        </Form.Item>
        <Form.Item label="Mã nhóm thuốc" name="groupCodes"><Select mode="multiple" optionFilterProp="label" options={groups.map(g => ({ value: g.code, label: g.code + ' · ' + g.name }))} /></Form.Item>
        <Form.Item name="referenceSource" label="Nguồn tài liệu thuốc"><Input maxLength={300} /></Form.Item>
        <Form.Item name="referenceText" label="Trích đoạn đã kiểm tra để soạn giải thích"><Input.TextArea maxLength={2400} rows={3} /></Form.Item>
        <Form.List name="ingredients">
          {(fields, { add, remove }) => <>
            {fields.map(field => <Space key={field.key} align="baseline" wrap>
              <Form.Item name={[field.name, 'name']} label="Hoạt chất" rules={[required]}><Input /></Form.Item>
              <Form.Item name={[field.name, 'amount']} label="mg trên 1 đơn vị" rules={[required]}>
                <InputNumber min={0.000001} precision={6} />
              </Form.Item>
              <Button disabled={fields.length === 1} onClick={() => remove(field.name)}>Bỏ</Button>
            </Space>)}
            <Button onClick={() => add()}>Thêm hoạt chất</Button>
          </>}
        </Form.List>
      </Form>
    </Modal>}
  </Card>
}
