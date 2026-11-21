import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Empty, List, Select, Space } from 'antd'
import { ApiError, requestApi } from '../../../server-workspace/api'
import type { ClinicalData } from '../../../encounters/server/clinical/types'
import { statusText, type CheckStatus } from '../types'
import { CheckDetails } from './CheckDetails'
import { time, triggerText, type Summary, type Trigger } from './types'

type Page = { rows: Summary[]; next: string | null }
export function CheckHistoryPanel({ clinicalPath, token, record, editable, onExpired, onRefresh }: {
  clinicalPath: string; token: string; record: ClinicalData['record']; editable: boolean
  onExpired: () => void; onRefresh: (data: ClinicalData) => void
}) {
  const path = clinicalPath.replace(/\/clinical$/, '/checks')
  const [trigger, setTrigger] = useState<Exclude<Trigger, 'PRESCRIBING'>>('CLINICAL_CHANGE')
  const [status, setStatus] = useState<CheckStatus>()
  const [before, setBefore] = useState<string>()
  const [page, setPage] = useState<Page>({ rows: [], next: null })
  const [selected, setSelected] = useState<string>()
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sending = useRef(false)
  const active = record.orders.filter(i => i.status === 'ACTIVE').length
  function report(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onExpired()
    else setError(cause instanceof Error ? cause.message : 'Không thể tải kết quả.')
  }
  useEffect(() => {
    let live = true
    setLoading(true)
    const query = new URLSearchParams()
    if (status) query.set('status', status)
    if (before) query.set('before', before)
    requestApi<Page>(path + '?' + query, token).then(result => {
      if (live) setPage(prev => ({ rows: before ? [...prev.rows, ...result.rows] : result.rows, next: result.next }))
    }).catch(cause => { if (live) report(cause) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, path, reload, status, before])
  function reset() {
    setBefore(undefined)
    setPage({ rows: [], next: null })
    setReload(v => v + 1)
  }
  async function evaluate() {
    if (sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const check = await requestApi<Summary>(path, token, 'POST', { trigger, version: record.version })
      setStatus(undefined)
      reset()
      setSelected(check.id)
    } catch (cause) {
      report(cause)
      if (cause instanceof ApiError && cause.status === 409) {
        try { onRefresh(await requestApi<ClinicalData>(clinicalPath, token)) } catch (retryError) { report(retryError) }
      }
    } finally { sending.current = false; setBusy(false) }
  }
  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {error && <Alert type="error" showIcon message={error} />}
    {editable && <div>
      <label htmlFor="assessment-trigger">Mốc đánh giá</label>
      <Space wrap style={{ display: 'flex', marginTop: 4 }}>
        <Select id="assessment-trigger" value={trigger} onChange={setTrigger} style={{ minWidth: 190 }}
          options={(['ADMISSION', 'CLINICAL_CHANGE', 'BEFORE_DISCHARGE'] as const).map(value => ({ value, label: triggerText[value] }))} />
        <Button type="primary" loading={busy} disabled={!active} onClick={evaluate}>Đánh giá lại điều trị</Button>
      </Space>
      <small>{active ? active + ' y lệnh đang hiệu lực' : 'Chưa có y lệnh đang hiệu lực để đánh giá.'}</small>
    </div>}
    <Space wrap>
      <Select aria-label="Lọc kết quả kiểm tra" placeholder="Tất cả kết quả" style={{ minWidth: 180 }} allowClear value={status}
        onChange={v => { setStatus(v); setError(''); reset() }} options={Object.entries(statusText).map(([value, label]) => ({ value, label }))} />
      <Button onClick={() => { setError(''); reset() }}>Tải lại lịch sử</Button>
    </Space>
    <List loading={loading} dataSource={page.rows} locale={{ emptyText: <Empty description="Chưa có lần kiểm tra phù hợp" /> }}
      renderItem={row => <List.Item actions={[<Button key="details" onClick={() => setSelected(row.id)}>Chi tiết</Button>]}>
        <List.Item.Meta title={triggerText[row.trigger]} description={<>{time(row.checkedAt)} · {row.doctor.fullName}<br />{statusText[row.status]}</>} />
      </List.Item>} />
    {page.next && <Button disabled={loading} onClick={() => setBefore(page.next!)}>Xem thêm</Button>}
    {selected && <CheckDetails key={selected} path={path + '/' + selected} token={token} onExpired={onExpired} onClose={() => setSelected(undefined)} />}
  </Space>
}
