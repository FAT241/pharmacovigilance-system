import { useEffect, useState } from 'react'
import { Alert, Form, Input, Modal, Spin } from 'antd'
import { ApiError, requestApi } from '../../server-workspace/api'
import { statusText } from '../../prescriptions/server/types'
import type { ClinicalData } from './clinical/types'

export function DischargeForm({ path, name, token, onExpired, onClose, onSaved }: {
  path: string; name: string; token: string; onExpired: () => void; onClose: () => void; onSaved: () => void
}) {
  const [form] = Form.useForm()
  const [data, setData] = useState<ClinicalData>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  function report(e: unknown) {
    if (e instanceof ApiError && e.status === 401) onExpired()
    else setError(e instanceof Error ? e.message : 'Không thể đọc hồ sơ.')
  }
  useEffect(() => {
    let live = true
    requestApi<ClinicalData>(path + '/clinical', token).then(r => { if (live) setData(r) }).catch(e => { if (live) report(e) })
    return () => { live = false }
  }, [path, token, revision])
  async function save(values: object) {
    if (!data || busy) return
    setBusy(true)
    try { await requestApi(path + '/discharge', token, 'POST', { ...values, version: data.record.version }); onSaved() }
    catch (e) { report(e); if (e instanceof ApiError && e.status === 409) { setData(undefined); setRevision(v => v + 1) } }
    finally { setBusy(false) }
  }
  const active = data?.record.orders.filter(o => o.status === 'ACTIVE') || []
  const check = data?.record.checks[0]
  return <Modal open title={'Xuất viện · ' + name} okText="Xác nhận xuất viện" cancelText="Hủy" confirmLoading={busy}
    okButtonProps={{ disabled: !data || !!data.record.dischargedAt }} onOk={() => form.submit()} onCancel={() => { if (!busy) onClose() }}>
    {error && <Alert showIcon type="error" message={error} />}
    {data ? <><p>Chẩn đoán · {data.record.diagnoses.map(d => d.name).join(', ') || 'Chưa ghi nhận'}</p>
      <p>Kiểm tra gần nhất · {check ? statusText[check.status] : 'Chưa có lần kiểm tra'}</p>
      <p>Y lệnh sẽ kết thúc · {active.map(o => o.medication.name + ' (' + o.dose + (o.doseUnit === 'ML' ? ' mL' : ' viên') + '/lần)').join(', ') || 'Không có'}</p>
    </> : !error && <Spin />}
    <Form form={form} layout="vertical" onFinish={save}>
      <Form.Item name="condition" label="Tình trạng khi ra viện"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
      <Form.Item name="followUp" label="Dặn dò tái khám cho bệnh nhân"><Input.TextArea rows={3} maxLength={3000} /></Form.Item>
    </Form>
  </Modal>
}
