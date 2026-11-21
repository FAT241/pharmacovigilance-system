import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ApiError, requestApi } from './api'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'

export type Field = { key: string; label: string; required?: boolean; type?: string; options?: { label: string; value: string }[] }

export function RecordsTable<Row extends { id: string }>({
  token, path, columns, fields, getValues, createPath, editPath, deletePath, onExpired, statusChange, searchText, searchLabel = 'Tìm bệnh nhân', searchHint = 'Tên, mã bệnh nhân hoặc CCCD', createLabel = 'Thêm', editFields, afterCreate, duplicateHint,
}: {
  token: string
  path: string
  columns: ColumnsType<Row>
  createLabel?: string
  editFields?: (row: Row) => Field[] | undefined
  afterCreate?: (row: Row) => void
  duplicateHint?: (rows: Row[], values: Record<string, unknown>) => string | undefined
  searchLabel?: string
  searchHint?: string
  searchText?: (row: Row) => string
  fields?: Field[]
  getValues?: (row: Row) => Record<string, unknown>
  createPath?: string
  editPath?: (row: Row) => string | undefined
  deletePath?: (row: Row) => string | undefined
  onExpired: () => void
  statusChange?: (row: Row) => { path: string; active: boolean; reasonRequired?: boolean } | undefined
}) {
  const { message } = App.useApp()
  const [records, setRecords] = useState<Row[]>([])
  const [query, setQuery] = useState('')
  const [issue, setIssue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Row | null>()
  const [status, setStatus] = useState<ReturnType<NonNullable<typeof statusChange>>>()
  const [reason, setReason] = useState('')
  const [form] = Form.useForm()
  const [warning, setWarning] = useState<string>()
  const [revision, setRevision] = useState(0)

  function report(error: unknown) {
    if (error instanceof ApiError && error.status === 401) onExpired()
    else setIssue(error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.')
  }

  useEffect(() => {
    let cancelled = false
    requestApi<Row[]>(path, token).then(rows => {
      if (!cancelled) setRecords(rows)
    }).catch(error => {
      if (!cancelled) report(error)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [path, token, revision])

  function refresh() {
    setLoading(true)
    setIssue('')
    setRevision(previous => previous + 1)
  }

  function openEditor(row: Row | null) {
    setIssue('')
    setWarning(undefined)
    setEditing(row)
  }

  async function save(values: Record<string, unknown>) {
    const target = editing ? editPath?.(editing) : createPath
    if (!target) return
    setIssue('')
    setSaving(true)
    try {
      const saved = await requestApi<Row>(target, token, editing ? 'PUT' : 'POST', values)
      if (!editing) afterCreate?.(saved)
      message.success('Đã lưu thay đổi.')
      setEditing(undefined)
      refresh()
    } catch (error) { report(error) }
    finally { setSaving(false) }
  }

  async function saveStatus() {
    if (!status) return
    setIssue('')
    setSaving(true)
    try {
      await requestApi(status.path, token, 'PATCH', { active: status.active, reason: reason.trim() })
      setStatus(undefined)
      message.success('Đã cập nhật trạng thái.')
      refresh()
    } catch (error) { report(error) }
    finally { setSaving(false) }
  }

  async function deleteRow(targetPath: string) {
    setIssue('')
    setSaving(true)
    try {
      await requestApi(targetPath, token, 'DELETE')
      message.success('Đã xóa thành công.')
      refresh()
    } catch (error) {
      report(error)
    } finally {
      setSaving(false)
    }
  }

  const actions: ColumnsType<Row> = editPath || statusChange || deletePath ? [{
    title: 'Thao tác',
    width: 140,
    render: (_, row) => {
      const change = statusChange?.(row)
      const delPath = deletePath?.(row)
      return (
        <Space size="small" wrap>
          {editPath?.(row) && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(row)}>
              Sửa
            </Button>
          )}
          {change && (
            <Button
              size="small"
              danger={!change.active}
              onClick={() => {
                setIssue('')
                setReason('')
                setStatus(change)
              }}
            >
              {change.active ? 'Kích hoạt' : 'Vô hiệu hóa'}
            </Button>
          )}
          {delPath && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc chắn muốn xóa bản ghi này khỏi hệ thống?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteRow(delPath)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    },
  }] : []

  return (
    <Card style={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
      <Space wrap style={{ marginBottom: 16 }}>
        {searchText && (
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            aria-label={searchLabel}
            placeholder={searchHint}
            allowClear
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ minWidth: 280, borderRadius: 6 }}
          />
        )}
        {createPath && (
          <Button
            icon={<PlusOutlined />}
            type="primary"
            style={{ background: '#0284c7', borderColor: '#0284c7', borderRadius: 6, fontWeight: 500 }}
            onClick={() => openEditor(null)}
          >
            {createLabel}
          </Button>
        )}
        <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading} style={{ borderRadius: 6 }}>
          Làm mới
        </Button>
      </Space>
      {issue && editing === undefined && !status && <Alert type="error" showIcon message={issue} />}
      <Table rowKey="id" dataSource={searchText && query.trim()
        ? records.filter(row => searchText(row).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
        : records} columns={[...columns, ...actions]} loading={loading} scroll={{ x: 720 }} />
      {editing !== undefined && (
        <Modal open title={editing ? 'Sửa thông tin' : 'Thêm bản ghi'} confirmLoading={saving}
          okText="Lưu" cancelText="Hủy" onCancel={() => { if (!saving) setEditing(undefined) }} onOk={() => form.submit()}>
          {issue && <Alert type="error" showIcon message={issue} />}
          {warning && <Alert type="warning" message={warning} showIcon />}
          <Form onValuesChange={(_, values) => setWarning(duplicateHint?.(records.filter(row => row.id !== editing?.id), values))} form={form} layout="vertical" initialValues={editing ? getValues?.(editing) : undefined} onFinish={save} preserve={false}>
            {(editing && editFields ? editFields(editing) ?? fields : fields)?.map(field => (
              <Form.Item key={field.key} name={field.key} label={field.label}
                rules={[{ required: field.required || (!editing && field.key === 'password'), whitespace: true, message: 'Vui lòng nhập thông tin.' }]}>
                {field.options ? <Select options={field.options} /> : field.type === 'password' ? <Input.Password /> : <Input type={field.type} />}
              </Form.Item>
            ))}
          </Form>
        </Modal>
      )}
      {status && (
        <Modal open title={status.active ? 'Kích hoạt bản ghi' : 'Vô hiệu hóa bản ghi'} confirmLoading={saving}
          okText="Xác nhận" cancelText="Hủy" onCancel={() => { if (!saving) setStatus(undefined) }}
          onOk={saveStatus} okButtonProps={{ disabled: Boolean(status.reasonRequired && !reason.trim()), danger: !status.active }}>
          {issue && <Alert type="error" showIcon message={issue} />}
          {status.reasonRequired ? <Input.TextArea aria-label="Lý do vô hiệu hóa" placeholder="Lý do vô hiệu hóa"
            maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
            : <Tag>{status.active ? 'Cho phép sử dụng trở lại' : 'Tạm ngừng sử dụng'}</Tag>}
        </Modal>
      )}
    </Card>
  )
}
