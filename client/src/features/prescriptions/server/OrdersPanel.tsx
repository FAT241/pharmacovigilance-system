import { useRef, useState } from 'react'
import { Alert, Button, Empty, Input, Select, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ApiError, requestApi } from '../../server-workspace/api'
import type { ClinicalData } from '../../encounters/server/clinical/types'
import { CheckDetails } from './history/CheckDetails'
import { PatientContext } from '../../encounters/server/clinical/PatientContext'
import { confirmationKey } from './confirmation-key'
import { OrderForm } from './OrderForm'
import { OrderCard } from './OrderCard'
import type { OrderEditor, OrderInput } from './types'

export function OrdersPanel({ path, token, data, editable, onUpdate, onExpired }: {
  path: string; token: string; data: ClinicalData; editable: boolean; onUpdate: (data: ClinicalData) => void; onExpired: () => void
}) {
  const [editor, setEditor] = useState<OrderEditor>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<string>()
  const [selected, setSelected] = useState<string>()
  const [status, setStatus] = useState<string>()
  const guard = useRef(false)
  const endpoint = path.replace(/\/clinical$/, '/orders')
  async function reload() { onUpdate(await requestApi<ClinicalData>(path, token)) }
  async function send(suffix: string, method: string, payload: object) {
    if (guard.current) return
    guard.current = true
    setBusy(true)
    setError('')
    try {
      const saved = await requestApi<{ itemId?: string }>(endpoint + suffix, token, method, payload)
      if (editor && saved.itemId) { setSelected(saved.itemId); setStatus(undefined); setQuery('') }
      setEditor(undefined)
      await reload()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onExpired()
      else {
        setError(cause instanceof Error ? cause.message : 'Không thể lưu y lệnh.')
        if (cause instanceof ApiError && [409, 503].includes(cause.status)) {
          setEditor(undefined)
          await reload().catch(() => setError('Không tải lại được hồ sơ. Hãy đóng và mở lại hồ sơ.'))
        }
      }
    } finally { guard.current = false; setBusy(false) }
  }
  const { version, orders } = data.record
  const labels = { DRAFT: 'Nháp', ACTIVE: 'Đang hiệu lực', ENDED: 'Đã kết thúc', REPLACED: 'Đã thay thế' }
  const filtered = orders.filter(o => !status || o.status === status).filter(({ medication }) =>
    (medication.name + ' ' + medication.code).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
  const row = filtered.find(o => o.id === selected) ?? filtered.find(o => o.status === 'DRAFT') ?? filtered[0]
  async function confirm(itemId: string, checkId: string, reason: string) {
    try {
      const idempotencyKey = await confirmationKey(data.record.doctorId, itemId, checkId, reason)
      await send('/' + itemId + '/confirm', 'POST', { checkId, reason, idempotencyKey })
    } catch {
      setError('Không thể lưu khóa xác nhận trong phiên. Vui lòng mở lại ứng dụng rồi thử lại.')
    }
  }
  function save(values: OrderInput) {
    if (!editor) return
    const editing = editor.kind === 'EDIT'
    void send(editing ? '/' + editor.item.id : '', editing ? 'PUT' : 'POST',
      { ...values, version, replacesItemId: editor.kind === 'REPLACE' ? editor.item.id : undefined })
  }
  return <div className="ward-prescribe"><aside><PatientContext record={data.record} /></aside><section>
    <Typography.Title level={5}>Soạn y lệnh</Typography.Title>
    {error && <Alert showIcon type="error" message={error} />}
    {editable && <Button icon={<PlusOutlined />} type="primary" disabled={busy} onClick={() => setEditor({ kind: 'NEW' })}>Kê thuốc mới</Button>}
    {!!orders.length && <Input aria-label="Tìm y lệnh" placeholder="Tìm y lệnh theo tên hoặc mã thuốc" allowClear
      value={query} onChange={e => setQuery(e.target.value)} />}
    <Select aria-label="Trạng thái y lệnh" placeholder="Tất cả trạng thái" allowClear value={status} onChange={setStatus} options={Object.entries(labels).map(([value,label]) => ({ value,label }))} />
    {editor && <OrderForm key={editor.kind + (editor.kind === 'NEW' ? '' : editor.item.id)} editor={editor} drugs={data.medications} busy={busy} onClose={() => setEditor(undefined)} onSave={save} />}
    {!filtered.length && <Empty description={orders.length ? 'Không tìm thấy y lệnh phù hợp' : 'Chưa có y lệnh trong đợt điều trị'} />}
    <div className="ward-order-list">{filtered.map(o => <button type="button" key={o.id} aria-pressed={o.id === row?.id}
      onClick={() => { setSelected(o.id); setEditor(undefined) }} disabled={busy}>
      <strong>{o.medication.name}</strong><span>{o.medication.strength} · {labels[o.status]}</span></button>)}</div>
    </section><section aria-label="Kiểm tra và xác nhận"><Typography.Title level={5}>Kiểm tra và xác nhận</Typography.Title>
    {row ? <OrderCard key={row.id + (row.checks[0]?.id ?? '')} row={row} version={version} editable={editable} busy={busy}
      onEdit={edit => { setSelected(row.id); setEditor(edit) }} onCheck={() => send('/' + row.id + '/check', 'POST', { version })}
      onStop={reason => send('/' + row.id + '/stop', 'POST', { reason, version })}
      onExplain={(action, body) => send('/' + row.id + '/explanation/' + action, 'POST', body)}
      onDeleteDraft={itemId => send('/' + itemId, 'DELETE', {})}
      onDetails={setDetail} onConfirm={(checkId, reason) => confirm(row.id, checkId, reason)} /> : <Empty description="Chưa có y lệnh để kiểm tra" />}
    </section>{detail && <CheckDetails path={path.replace(/\/clinical$/, '/checks/') + detail} token={token} onExpired={onExpired} onClose={() => setDetail(undefined)} />}</div>
}
