import { useEffect, useRef, useState } from 'react'
import { Alert, App, Breadcrumb, Button, Drawer, Spin, Tabs } from 'antd'
import { FileTextOutlined, MedicineBoxOutlined } from '@ant-design/icons'
import { ApiError, requestApi } from '../../../server-workspace/api'
import { ClinicalOverview } from './ClinicalOverview'
import { Measurements } from './Measurements'
import { Publication } from './Publication'
import { ProfileForm } from './ProfileForm'
import { MedicationReview } from './MedicationReview'
import { OrdersPanel } from '../../../prescriptions/server/OrdersPanel'
import { CheckHistoryPanel } from '../../../prescriptions/server/history/CheckHistoryPanel'
import type { Change, ClinicalData, ClinicalRecord } from './types'

export function ClinicalDrawer({ path, name, doctorId, token, onExpired, onClose }: {
  path: string; name: string; doctorId?: string; token: string; onExpired: () => void; onClose: () => void
}) {
  const { message } = App.useApp()
  const [data, setData] = useState<ClinicalData>()
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('summary')
  const sending = useRef(false)
  function report(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onExpired()
    else setError(cause instanceof Error ? cause.message : 'Không thể đọc hồ sơ.')
  }
  useEffect(() => {
    let current = true
    requestApi<ClinicalData>(path, token).then(result => { if (current) setData(result) })
      .catch(cause => { if (current) report(cause) })
    return () => { current = false }
  }, [path, token, reload])
  useEffect(() => {
    const deadlines = data?.record.orders.filter(o => o.status === 'ACTIVE' && o.endedAt).map(o => Date.parse(o.endedAt!))
    if (!deadlines?.length) return
    const timer = setTimeout(() => setReload(v => v + 1), Math.min(2147483647, Math.max(100, Math.min(...deadlines) - Date.now() + 100)))
    return () => clearTimeout(timer)
  }, [data])
  async function save(change: Change) {
    if (!data || sending.current) return false
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const record = await requestApi<ClinicalRecord>(path, token, 'PATCH', { ...change, version: data.record.version })
      setData({ ...data, record })
      message.success('Đã lưu.')
      return true
    } catch (cause) {
      report(cause)
      if (cause instanceof ApiError && cause.status === 409) {
        setData(undefined)
        setReload(v => v + 1)
      }
      return false
    } finally { sending.current = false; setBusy(false) }
  }
  const editable = Boolean(data && !data.record.dischargedAt && data.record.doctorId === doctorId)
  return <Drawer open title={'Hồ sơ lâm sàng · ' + name} width={tab === 'orders' ? 'min(1390px, 100vw)' : 'min(850px, 100vw)'} onClose={() => { if (!busy) onClose() }}>
    {error && <Alert showIcon type="error" message={error} action={<Button onClick={() => {
      setError(''); setData(undefined); setReload(v => v + 1)
    }}>Tải lại</Button>} />}
    <Breadcrumb items={[{ title: <Button type="link" size="small" disabled={busy} onClick={onClose}>Đợt điều trị</Button> }, { title: name }]} />
    {data && <p className="ward-chart-id">{data.record.patient.patientCode} · Nhập viện {new Date(data.record.admittedAt).toLocaleString('vi-VN')} · BS {data.record.doctor.fullName} · {data.record.dischargedAt ? 'Đã xuất viện' : 'Đang điều trị'}</p>}
    {data ? <Spin spinning={busy}><Tabs activeKey={tab} onChange={setTab} items={[
      { key: 'summary', label: 'Tổng quan', children: <ClinicalOverview data={data} editable={editable} onSave={save} onNavigate={setTab} /> },
      { key: 'profile', label: 'Lâm sàng', icon: <FileTextOutlined />, children: <ProfileForm data={data} editable={editable} onSave={save} /> },
      { key: 'measurements', label: 'Chỉ số và xét nghiệm', children: <Measurements data={data} editable={editable} onSave={save} /> },
      { key: 'publication', label: 'Dặn dò bệnh nhân', children: <Publication record={data.record} editable={editable} onSave={save} /> },
      { key: 'review', label: 'Đối chiếu thuốc', icon: <MedicineBoxOutlined />, children: <MedicationReview data={data} editable={editable} onSave={save} /> },
      { key: 'orders', label: 'Y lệnh', children: <OrdersPanel data={data} editable={editable} path={path} token={token} onUpdate={setData} onExpired={onExpired} /> },
      { key: 'history', label: 'Đánh giá và lịch sử', children: tab === 'history' && <CheckHistoryPanel
        clinicalPath={path} token={token} record={data.record} editable={editable} onExpired={onExpired} onRefresh={setData} /> },
    ]} /></Spin> : !error && <Spin />}
  </Drawer>
}
