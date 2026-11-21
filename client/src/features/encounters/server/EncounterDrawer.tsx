import { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Empty, Input, Select, Space, Spin, Tag, Typography } from 'antd'
import { ApiError, requestApi } from '../../server-workspace/api'
import type { PatientRow } from '../../server-workspace/types'
import { FileTextOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { DischargeForm } from './DischargeForm'
import { ClinicalDrawer } from './clinical/ClinicalDrawer'

type EncounterRow = {
  id: string
  doctorId: string
  doctor: { fullName: string }
  admittedAt: string
  dischargedAt: string | null
  admissionNote: string | null
}

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

export function EncounterDrawer({ patient, doctorId, token, onClose, onExpired, onOpenClinical }: {
  patient: PatientRow
  doctorId?: string
  token: string
  onClose: () => void
  onExpired: () => void
  onOpenClinical?: (encounterId: string, name: string) => void
}) {
  const path = '/patients/' + patient.id + '/encounters'
  const [rows, setRows] = useState<EncounterRow[]>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [diseases, setDiseases] = useState<{ code: string; name: string }[]>([])
  const [diagnoses, setDiagnoses] = useState<string[]>([])
  const [progress, setProgress] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [discharging, setDischarging] = useState<string>()
  const [clinicalId, setClinicalId] = useState<string>()

  function report(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onExpired()
    else setError(cause instanceof Error ? cause.message : 'Không thể tải đợt điều trị.')
  }

  useEffect(() => {
    let cancelled = false
    if (doctorId) requestApi<typeof diseases>(path + '/admission-options', token).then(r => { if (!cancelled) setDiseases(r) }).catch(e => { if (!cancelled) report(e) })
    requestApi<EncounterRow[]>(path, token).then(data => {
      if (!cancelled) setRows(data)
    }).catch(cause => { if (!cancelled) report(cause) })
    return () => { cancelled = true }
  }, [path, token, revision])

  function refresh() {
    setRows(undefined)
    setRevision(value => value + 1)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const created = await requestApi<EncounterRow>(path, token, 'POST', { admissionNote: note.trim(), diagnoses, progress: progress.trim() })
      if (onOpenClinical) {
        onClose()
        onOpenClinical(created.id, patient.user.fullName)
      } else {
        setClinicalId(created.id)
      }
      setNote(''); setProgress(''); setDiagnoses([])
      refresh()
    } catch (cause) {
      report(cause)
      if (cause instanceof ApiError && cause.status === 409) refresh()
    } finally { setSaving(false) }
  }

  return <Drawer open title={'Đợt điều trị · ' + patient.user.fullName} width="min(540px, 100vw)"
    onClose={() => { if (!saving) onClose() }}>
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div className="ward-care-heading">
        <Typography.Title level={4}>Tiếp nhận nội trú</Typography.Title>
        <span>Mã bệnh nhân {patient.patientCode}</span>
      </div>
      {error && <Alert type="error" showIcon message={error} action={<Button size="small"
        onClick={() => { setError(''); refresh() }}>Tải lại</Button>} />}
      {!rows && !error && <Spin aria-label="Đang tải đợt điều trị" />}
      {doctorId && rows && !rows.some(row => !row.dischargedAt) && <Card title="Tiếp nhận nhập viện">
        <label htmlFor="admission-note">Lý do vào viện (nếu có)</label>
        <Input.TextArea id="admission-note" value={note} onChange={event => setNote(event.target.value)}
          rows={2} maxLength={1000} disabled={saving} style={{ marginBlock: 8 }} />
        <label htmlFor="admission-diagnoses">Chẩn đoán ban đầu</label>
        <Select id="admission-diagnoses" mode="multiple" value={diagnoses} onChange={setDiagnoses} optionFilterProp="label" style={{ width: '100%', marginBlock: 8 }} options={diseases.map(d => ({ value: d.code, label: d.code + ' · ' + d.name }))} />
        <label htmlFor="admission-progress">Diễn biến ban đầu</label>
        <Input.TextArea id="admission-progress" value={progress} onChange={e => setProgress(e.target.value)} maxLength={3000} rows={2} style={{ marginBlock: 8 }} />
        <Button type="primary" icon={<PlusCircleOutlined />} loading={saving} onClick={() => save()}>Mở đợt điều trị</Button>
      </Card>}
      {rows?.length === 0 && <Empty description="Chưa có đợt điều trị" />}
      {rows?.map(row => <Card key={row.id} size="small"
        title={dateTime.format(new Date(row.admittedAt))}
        extra={<Tag color={row.dischargedAt ? undefined : 'blue'}>{row.dischargedAt ? 'Đã xuất viện' : 'Đang điều trị'}</Tag>}>
        <Descriptions column={1} size="small" items={[
          { key: 'doctor', label: 'Bác sĩ phụ trách', children: row.doctor.fullName },
          ...(row.admissionNote ? [{ key: 'note', label: 'Lý do vào viện', children: row.admissionNote }] : []),
          ...(row.dischargedAt ? [{ key: 'end', label: 'Xuất viện', children: dateTime.format(new Date(row.dischargedAt)) }] : []),
        ]} />
        <Space wrap style={{ marginTop: 12 }}>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => {
              if (onOpenClinical) {
                onClose()
                onOpenClinical(row.id, patient.user.fullName)
              } else {
                setClinicalId(row.id)
              }
            }}
          >
            Hồ sơ lâm sàng
          </Button>
          {!row.dischargedAt && row.doctorId === doctorId && <Button disabled={saving} onClick={() => setDischarging(row.id)}>Xuất viện</Button>}
        </Space>
      </Card>)}
    </Space>
    {discharging && <DischargeForm name={patient.user.fullName} token={token} path={path + '/' + discharging}
      onExpired={onExpired} onClose={() => setDischarging(undefined)} onSaved={() => { setDischarging(undefined); refresh() }} />}
    {clinicalId && <ClinicalDrawer path={path + '/' + clinicalId + '/clinical'} name={patient.user.fullName}
      doctorId={doctorId} token={token} onExpired={onExpired} onClose={() => { setClinicalId(undefined); refresh() }} />}
  </Drawer>
}
