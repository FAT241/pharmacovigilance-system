import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import { ApiError, requestApi } from '../../server-workspace/api'

type Rule = {
  code: string
  title: string
  active: boolean
  version: number
  description?: string
  condition?: any
  scopes: { disease: { code: string; name: string } }[]
  referenceSource: string | null
}

type Change = {
  id: number
  ruleTitle: string
  version: number
  active: boolean
  reason: string
  actor: { fullName: string }
  changedAt: string
}

type ChangePage = { rows: Change[]; next: number | null }

type Metadata = {
  ingredients: { nameKey: string; name: string }[]
  groups: { code: string; name: string }[]
  diseases: { code: string; name: string }[]
}

export function RuleManagement({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [logs, setLogs] = useState<ChangePage>({ rows: [], next: null })
  const [metadata, setMetadata] = useState<Metadata>({ ingredients: [], groups: [], diseases: [] })
  const [selected, setSelected] = useState<Rule>()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)

  // State cho Modal Thêm / Sửa luật
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [form] = Form.useForm()
  const conditionType = Form.useWatch('conditionType', form)

  function report(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onExpired()
    else setError(cause instanceof Error ? cause.message : 'Không tải được bộ luật.')
  }

  useEffect(() => {
    let live = true
    setLoading(true)
    Promise.all([
      requestApi<Rule[]>('/rules', token),
      requestApi<ChangePage>('/rules/changes', token),
      requestApi<Metadata>('/rules/metadata', token).catch(() => ({ ingredients: [], groups: [], diseases: [] })),
    ])
      .then(([data, page, meta]) => {
        if (live) {
          setRules(data)
          setLogs(page)
          setMetadata(meta)
        }
      })
      .catch(cause => {
        if (live) report(cause)
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [token, reload])

  async function changeStatus() {
    if (!selected || !reason.trim() || sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      await requestApi('/rules/' + encodeURIComponent(selected.code) + '/status', token, 'PATCH', {
        active: !selected.active,
        version: selected.version,
        reason: reason.trim(),
      })
      setSelected(undefined)
      setReload(v => v + 1)
      message.success(selected.active ? 'Đã tạm ngưng luật cảnh báo khẩn cấp' : 'Đã kích hoạt lại luật')
    } catch (cause) {
      report(cause)
      if (cause instanceof ApiError && cause.status === 409) {
        setSelected(undefined)
        setReload(v => v + 1)
      }
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  async function more() {
    if (!logs.next || sending.current) return
    sending.current = true
    setBusy(true)
    try {
      const page = await requestApi<ChangePage>('/rules/changes?before=' + logs.next, token)
      setLogs({ rows: [...logs.rows, ...page.rows], next: page.next })
    } catch (cause) {
      report(cause)
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  function openCreateModal() {
    setEditingRule(null)
    form.resetFields()
    form.setFieldsValue({
      conditionType: 'INGREDIENT_PAIR',
      active: true,
      scopes: [],
    })
    setEditorOpen(true)
  }

  function openEditModal(rule: Rule) {
    setEditingRule(rule)
    form.resetFields()

    const cond = rule.condition || {}
    form.setFieldsValue({
      code: rule.code,
      title: rule.title,
      referenceSource: rule.referenceSource || '',
      scopes: rule.scopes.map(s => s.disease.code),
      conditionType: cond.type || 'INGREDIENT_PAIR',
      left: cond.left || undefined,
      right: cond.right || undefined,
      ingredient: cond.ingredient || undefined,
      mgPerKgDay: cond.mgPerKgDay || undefined,
      disease: cond.disease || undefined,
      group: cond.group || undefined,
      editReason: '',
    })
    setEditorOpen(true)
  }

  async function handleSaveRule() {
    try {
      const values = await form.validateFields()
      setBusy(true)

      let condition: any = { type: values.conditionType }
      if (values.conditionType === 'INGREDIENT_PAIR') {
        condition.left = values.left
        condition.right = values.right
      } else if (values.conditionType === 'WEIGHT_LIMIT') {
        condition.ingredient = values.ingredient
        condition.mgPerKgDay = Number(values.mgPerKgDay)
      } else if (values.conditionType === 'DISEASE_GROUP') {
        condition.disease = values.disease
        condition.group = values.group
      }

      if (editingRule) {
        // Cập nhật luật
        await requestApi('/rules/' + encodeURIComponent(editingRule.code), token, 'PUT', {
          title: values.title.trim(),
          condition,
          referenceSource: values.referenceSource ? values.referenceSource.trim() : null,
          scopes: values.scopes || [],
          reason: values.editReason ? values.editReason.trim() : 'Cập nhật nội dung luật cảnh báo.',
        })
        message.success('Cập nhật luật cảnh báo thành công')
      } else {
        // Thêm luật mới
        await requestApi('/rules', token, 'POST', {
          code: values.code.trim().toUpperCase(),
          title: values.title.trim(),
          condition,
          referenceSource: values.referenceSource ? values.referenceSource.trim() : null,
          active: true,
          scopes: values.scopes || [],
        })
        message.success('Thêm luật cảnh báo mới thành công')
      }

      setEditorOpen(false)
      setReload(v => v + 1)
    } catch (err: any) {
      if (err instanceof ApiError) {
        message.error(err.message)
      } else if (err?.message) {
        message.error(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteRule(code: string) {
    setBusy(true)
    try {
      await requestApi('/rules/' + encodeURIComponent(code), token, 'DELETE')
      message.success('Đã xóa luật cảnh báo thành công')
      setReload(v => v + 1)
    } catch (err: any) {
      message.error(err instanceof Error ? err.message : 'Không xóa được luật')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {error && !selected && <Alert showIcon type="error" message={error} />}
      <Card
        title="Bộ luật Cảnh giác Dược & An toàn Kê đơn"
        extra={
          <Space>
            <Button type="primary" onClick={openCreateModal} disabled={busy || loading}>
              + Thêm luật mới
            </Button>
            <Button
              disabled={busy || loading}
              onClick={() => {
                setError('')
                setReload(v => v + 1)
              }}
            >
              Làm mới
            </Button>
          </Space>
        }
      >
        <Table<Rule>
          rowKey="code"
          loading={loading}
          dataSource={rules}
          pagination={{ pageSize: 8 }}
          expandable={{
            expandedRowRender: rule => (
              <Descriptions
                size="small"
                column={1}
                items={[
                  {
                    key: 'condition',
                    label: 'Điều kiện kích hoạt luật',
                    children: rule.description || 'Chưa có mô tả chi tiết.',
                  },
                  {
                    key: 'scope',
                    label: 'Phạm vi bệnh áp dụng',
                    children:
                      rule.scopes.map(s => s.disease.name + ' (' + s.disease.code + ')').join(', ') ||
                      'Áp dụng chung cho toàn viện',
                  },
                  {
                    key: 'source',
                    label: 'Nguồn y văn tham chiếu',
                    children: rule.referenceSource || 'Chưa ghi nhận nguồn tham chiếu',
                  },
                ]}
              />
            ),
          }}
          scroll={{ x: 720 }}
          columns={[
            {
              title: 'Mã & Tên luật cảnh báo',
              render: (_, row) => (
                <>
                  <Tag color="geekblue">{row.code}</Tag>
                  <strong>{row.title}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Phiên bản {row.version} · {row.scopes.length ? `${row.scopes.length} bệnh áp dụng` : 'Toàn viện'}
                  </span>
                </>
              ),
            },
            {
              title: 'Trạng thái',
              width: 140,
              render: (_, row) => (
                <Tag color={row.active ? 'green' : 'orange'}>
                  {row.active ? 'Đang áp dụng' : 'Tạm ngưng'}
                </Tag>
              ),
            },
            {
              title: 'Thao tác quản trị',
              width: 260,
              render: (_, row) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => openEditModal(row)}
                    disabled={busy || loading}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="small"
                    disabled={busy || loading}
                    danger={row.active}
                    onClick={() => {
                      setReason('')
                      setError('')
                      setSelected(row)
                    }}
                  >
                    {row.active ? 'Tạm ngưng' : 'Kích hoạt'}
                  </Button>
                  <Popconfirm
                    title="Xóa luật cảnh báo"
                    description={`Bạn có chắc muốn xóa luật "${row.title}"?`}
                    onConfirm={() => handleDeleteRule(row.code)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger disabled={busy || loading}>
                      Xóa
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Nhật ký thay đổi luật (Audit Trail Socket.IO)">
        <List
          loading={loading}
          dataSource={logs.rows}
          locale={{ emptyText: <Empty description="Chưa có thay đổi trạng thái luật" /> }}
          renderItem={row => (
            <List.Item>
              <List.Item.Meta
                title={
                  (row.active ? 'Kích hoạt lại · ' : 'Tạm ngưng · ') +
                  row.ruleTitle +
                  ' · v' +
                  row.version
                }
                description={
                  <>
                    {new Date(row.changedAt).toLocaleString('vi-VN')} · {row.actor.fullName}
                    <br />
                    <em>Lý do:</em> {row.reason}
                  </>
                }
              />
            </List.Item>
          )}
        />
        {logs.next && (
          <Button disabled={busy || loading} onClick={more} style={{ marginTop: 8 }}>
            Xem thêm
          </Button>
        )}
      </Card>

      {/* Modal Tạm ngưng khẩn cấp có ghi lý do */}
      {selected && (
        <Modal
          open
          title={(selected.active ? 'Tạm ngưng khẩn cấp · ' : 'Kích hoạt lại · ') + selected.title}
          okText="Xác nhận"
          cancelText="Hủy"
          confirmLoading={busy}
          okButtonProps={{ danger: selected.active, disabled: !reason.trim() }}
          onOk={changeStatus}
          onCancel={() => {
            if (!busy) setSelected(undefined)
          }}
        >
          {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
          <Form layout="vertical">
            <Form.Item label="Lý do thay đổi trạng thái (sẽ thông báo realtime tới toàn bộ bác sĩ)" required>
              <Input.TextArea
                rows={3}
                maxLength={1000}
                placeholder="Ví dụ: Theo công văn khẩn của Hội đồng Thuốc & Điều trị..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* Modal Thêm mới / Chỉnh sửa luật cảnh báo */}
      <Modal
        open={editorOpen}
        title={editingRule ? `Chỉnh sửa luật: ${editingRule.code}` : 'Thêm luật cảnh báo mới'}
        okText={editingRule ? 'Lưu thay đổi' : 'Tạo luật mới'}
        cancelText="Hủy"
        width={680}
        confirmLoading={busy}
        onOk={handleSaveRule}
        onCancel={() => {
          if (!busy) setEditorOpen(false)
        }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editingRule && (
            <Form.Item
              name="code"
              label="Mã định danh luật (Rule Code)"
              rules={[
                { required: true, message: 'Vui lòng nhập mã luật' },
                {
                  pattern: /^[A-Z0-9_-]+$/,
                  message: 'Chỉ gồm chữ IN HOA, số và dấu gạch dưới (VD: RULE_METFORMIN_CONTRAST)',
                },
              ]}
            >
              <Input placeholder="Ví dụ: PAIR_METFORMIN_IODINE" />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Tên / Tiêu đề luật cảnh báo"
            rules={[{ required: true, message: 'Vui lòng nhập tên luật' }]}
          >
            <Input placeholder="Ví dụ: Tương tác nguy cơ nhiễm toan lactic khi dùng cùng lúc..." />
          </Form.Item>

          <Form.Item
            name="conditionType"
            label="Loại điều kiện an toàn dược"
            rules={[{ required: true, message: 'Vui lòng chọn loại điều kiện' }]}
          >
            <Select
              options={[
                { value: 'INGREDIENT_PAIR', label: 'Tương tác cặp hoạt chất dùng đồng thời (Drug-Drug Interaction)' },
                { value: 'WEIGHT_LIMIT', label: 'Giới hạn liều theo cân nặng bệnh nhân (Weight-based Dosing Limit)' },
                { value: 'DISEASE_GROUP', label: 'Chống chỉ định Bệnh lý - Nhóm thuốc (Disease-Drug Contraindication)' },
                { value: 'DUPLICATE', label: 'Trùng lặp hoạt chất / Trùng nhóm thuốc' },
                { value: 'ALLERGY', label: 'Kiểm tra tiền sử dị ứng thuốc' },
                { value: 'RECONCILE', label: 'Đối chiếu thuốc bệnh nhân dùng tại nhà' },
              ]}
            />
          </Form.Item>

          {/* Trường động theo loại điều kiện */}
          {conditionType === 'INGREDIENT_PAIR' && (
            <Space direction="horizontal" style={{ width: '100%' }} size="middle">
              <Form.Item
                name="left"
                label="Hoạt chất thứ nhất"
                rules={[{ required: true, message: 'Chọn hoạt chất 1' }]}
                style={{ flex: 1 }}
              >
                <Select
                  showSearch
                  placeholder="Chọn hoạt chất"
                  filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                  options={metadata.ingredients.map(i => ({ value: i.nameKey, label: `${i.name} (${i.nameKey})` }))}
                />
              </Form.Item>
              <Form.Item
                name="right"
                label="Hoạt chất thứ hai"
                rules={[{ required: true, message: 'Chọn hoạt chất 2' }]}
                style={{ flex: 1 }}
              >
                <Select
                  showSearch
                  placeholder="Chọn hoạt chất"
                  filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                  options={metadata.ingredients.map(i => ({ value: i.nameKey, label: `${i.name} (${i.nameKey})` }))}
                />
              </Form.Item>
            </Space>
          )}

          {conditionType === 'WEIGHT_LIMIT' && (
            <Space direction="horizontal" style={{ width: '100%' }} size="middle">
              <Form.Item
                name="ingredient"
                label="Hoạt chất kiểm tra liều"
                rules={[{ required: true, message: 'Chọn hoạt chất' }]}
                style={{ flex: 1 }}
              >
                <Select
                  showSearch
                  placeholder="Chọn hoạt chất"
                  filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                  options={metadata.ingredients.map(i => ({ value: i.nameKey, label: `${i.name} (${i.nameKey})` }))}
                />
              </Form.Item>
              <Form.Item
                name="mgPerKgDay"
                label="Liều tối đa (mg/kg/ngày)"
                rules={[{ required: true, message: 'Nhập liều tối đa' }]}
                style={{ width: 220 }}
              >
                <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} placeholder="Ví dụ: 30" />
              </Form.Item>
            </Space>
          )}

          {conditionType === 'DISEASE_GROUP' && (
            <Space direction="horizontal" style={{ width: '100%' }} size="middle">
              <Form.Item
                name="disease"
                label="Bệnh lý (ICD-10)"
                rules={[{ required: true, message: 'Chọn bệnh lý' }]}
                style={{ flex: 1 }}
              >
                <Select
                  showSearch
                  placeholder="Chọn bệnh lý"
                  filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                  options={metadata.diseases.map(d => ({ value: d.code, label: `${d.name} (${d.code})` }))}
                />
              </Form.Item>
              <Form.Item
                name="group"
                label="Nhóm thuốc chống chỉ định"
                rules={[{ required: true, message: 'Chọn nhóm thuốc' }]}
                style={{ flex: 1 }}
              >
                <Select
                  showSearch
                  placeholder="Chọn nhóm thuốc"
                  filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                  options={metadata.groups.map(g => ({ value: g.code, label: `${g.name} (${g.code})` }))}
                />
              </Form.Item>
            </Space>
          )}

          <Form.Item
            name="scopes"
            label="Phạm vi bệnh áp dụng (ICD-10)"
            help="Để trống nếu luật này áp dụng chung cho toàn bộ các khoa và bệnh nhân"
          >
            <Select
              mode="multiple"
              placeholder="Chọn phạm vi bệnh áp dụng (ví dụ: I10, E11)"
              options={metadata.diseases.map(d => ({ value: d.code, label: `${d.name} (${d.code})` }))}
            />
          </Form.Item>

          <Form.Item name="referenceSource" label="Nguồn tài liệu y văn tham chiếu">
            <Input placeholder="Ví dụ: Dược thư Quốc gia Việt Nam 2022, Hướng dẫn Bộ Y tế..." />
          </Form.Item>

          {editingRule && (
            <Form.Item
              name="editReason"
              label="Lý do cập nhật chuyên môn (ghi vào nhật ký)"
              rules={[{ required: true, message: 'Vui lòng nhập lý do cập nhật luật' }]}
            >
              <Input.TextArea rows={2} placeholder="Ví dụ: Cập nhật ngưỡng liều mới theo khuyến cáo Bộ Y tế..." />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Space>
  )
}
