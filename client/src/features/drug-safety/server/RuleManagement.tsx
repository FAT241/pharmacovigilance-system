import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Empty, Form, Input, List, Modal, Space, Table, Tag } from 'antd'
import { ApiError, requestApi } from '../../server-workspace/api'

type Rule = { code: string; title: string; active: boolean; version: number; description?: string; scopes: { disease: { code: string; name: string } }[]; referenceSource: string | null }
type Change = { id: number; ruleTitle: string; version: number; active: boolean; reason: string; actor: { fullName: string }; changedAt: string }
type ChangePage = { rows: Change[]; next: number | null }

export function RuleManagement({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [logs, setLogs] = useState<ChangePage>({ rows: [], next: null })
  const [selected, setSelected] = useState<Rule>()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  function report(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onExpired()
    else setError(cause instanceof Error ? cause.message : 'Không tải được bộ luật.')
  }
  useEffect(() => {
    let live = true
    setLoading(true)
    Promise.all([requestApi<Rule[]>('/rules', token), requestApi<ChangePage>('/rules/changes', token)])
      .then(([data, page]) => { if (live) { setRules(data); setLogs(page) } })
      .catch(cause => { if (live) report(cause) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, reload])
  async function changeStatus() {
    if (!selected || !reason.trim() || sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      await requestApi('/rules/' + encodeURIComponent(selected.code) + '/status', token, 'PATCH', {
        active: !selected.active, version: selected.version, reason: reason.trim(),
      })
      setSelected(undefined)
      setReload(v => v + 1)
    } catch (cause) {
      report(cause)
      if (cause instanceof ApiError && cause.status === 409) { setSelected(undefined); setReload(v => v + 1) }
    } finally { sending.current = false; setBusy(false) }
  }
  async function more() {
    if (!logs.next || sending.current) return
    sending.current = true
    setBusy(true)
    try {
      const page = await requestApi<ChangePage>('/rules/changes?before=' + logs.next, token)
      setLogs({ rows: [...logs.rows, ...page.rows], next: page.next })
    } catch (cause) { report(cause) } finally { sending.current = false; setBusy(false) }
  }
  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {error && !selected && <Alert showIcon type="error" message={error} />}
    <Card title="Bộ luật cảnh báo" extra={<Button disabled={busy || loading} onClick={() => { setError(''); setReload(v => v + 1) }}>Tải lại</Button>}>
      <Table<Rule> rowKey="code" loading={loading} dataSource={rules} pagination={false} expandable={{
        expandedRowRender: rule => <Descriptions size="small" column={1} items={[
          { key: 'condition', label: 'Khi nào luật áp dụng', children: rule.description || 'Chưa có mô tả điều kiện áp dụng.' },
          { key: 'scope', label: 'Phạm vi bệnh', children: rule.scopes.map(s => s.disease.name + ' (' + s.disease.code + ')').join(', ') || 'Tất cả bệnh trong phạm vi thí điểm' },
          { key: 'source', label: 'Nguồn tham chiếu', children: rule.referenceSource || 'Chưa ghi nhận nguồn' },
        ]} />,
      }} scroll={{ x: 560 }} columns={[
        { title: 'Luật', render: (_, row) => <><strong>{row.title}</strong> {['PAIR_SAMPLE', 'GROUP_SAMPLE', 'WEIGHT_SAMPLE'].includes(row.code) && <Tag>Luật mô phỏng</Tag>}<br />Phiên bản {row.version}</> },
        { title: 'Trạng thái', render: (_, row) => <Tag color={row.active ? 'green' : 'orange'}>{row.active ? 'Đang áp dụng' : 'Tạm ngưng'}</Tag> },
        { title: 'Thao tác', render: (_, row) => <Button disabled={busy || loading} danger={row.active} onClick={() => {
          setReason(''); setError(''); setSelected(row)
        }}>{row.active ? 'Tạm ngưng' : 'Kích hoạt lại'}</Button> },
      ]} />
    </Card>
    <Card title="Nhật ký thay đổi luật">
      <List loading={loading} dataSource={logs.rows} locale={{ emptyText: <Empty description="Chưa có thay đổi trạng thái luật" /> }}
        renderItem={row => <List.Item><List.Item.Meta title={(row.active ? 'Kích hoạt lại · ' : 'Tạm ngưng · ') + row.ruleTitle + ' · v' + row.version}
          description={<>{new Date(row.changedAt).toLocaleString('vi-VN')} · {row.actor.fullName}<br />{row.reason}</>} /></List.Item>} />
      {logs.next && <Button disabled={busy || loading} onClick={more}>Xem thêm</Button>}
    </Card>
    {selected && <Modal open title={(selected.active ? 'Tạm ngưng · ' : 'Kích hoạt lại · ') + selected.title}
      okText="Xác nhận" cancelText="Hủy" confirmLoading={busy} okButtonProps={{ danger: selected.active, disabled: !reason.trim() }}
      onOk={changeStatus} onCancel={() => { if (!busy) setSelected(undefined) }}>
      {error && <Alert type="error" message={error} />}
      <Form layout="vertical"><Form.Item label="Lý do thay đổi" htmlFor="rule-reason" required>
        <Input.TextArea id="rule-reason" rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} />
      </Form.Item></Form>
    </Modal>}
  </Space>
}
