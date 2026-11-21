import { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions } from 'antd'
import { requestApi } from './api'
import { PatientTreatment } from '../patient-portal/PatientTreatment'
import { Accounts, Patients } from './StaffRecords'
import { Medications } from './Medications'
import { RuleManagement } from '../drug-safety/server/RuleManagement'
import { WorkspaceShell } from './WorkspaceShell'
import { ServerLogin, type Session } from './ServerLogin'
import type { PatientRow } from './types'
import { ContactsOutlined, FileTextOutlined, MedicineBoxOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons'

function PatientProfile({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [patient, setPatient] = useState<PatientRow>()
  const [error, setError] = useState('')
  useEffect(() => {
    requestApi<PatientRow>('/patients/me', token).then(setPatient).catch(cause => {
      if (cause.status === 401) onExpired()
      else setError(cause.message)
    })
  }, [token])
  return <Card title="Hồ sơ của tôi" loading={!patient && !error}>
    {error && <Alert type="error" showIcon message={error} />}
    {patient && <Descriptions column={1} items={[
      { key: 'code', label: 'Mã bệnh nhân', children: patient.patientCode },
      { key: 'name', label: 'Họ và tên', children: patient.user.fullName },
      { key: 'birth', label: 'Ngày sinh', children: patient.birthDate.slice(0, 10) },
    ]} />}
  </Card>
}

const SESSION_KEY = 'dacs4_active_session'

export function ServerWorkspace() {
  const [session, setSession] = useState<Session | undefined>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) return JSON.parse(stored) as Session
    } catch {
      // Bỏ qua lỗi parse
    }
    return undefined
  })

  const updateSession = (newSession: Session | undefined) => {
    setSession(newSession)
    try {
      if (newSession) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
      } else {
        sessionStorage.removeItem(SESSION_KEY)
      }
    } catch {
      // Bỏ qua lỗi storage
    }
  }

  const endSession = () => updateSession(undefined)
  if (!session) return <ServerLogin onLogin={updateSession} />

  const { account, token } = session
  const admin = account.role === 'ADMIN'
  const sections = account.role === 'PATIENT' ? [
    { key: 'treatment', label: 'Điều trị của tôi', icon: <MedicineBoxOutlined />, content: <PatientTreatment token={token} onExpired={endSession} /> },
    { key: 'profile', label: 'Hồ sơ của tôi', icon: <FileTextOutlined />, content: <PatientProfile token={token} onExpired={endSession} /> },
  ] : [
    { key: 'patients', label: 'Hồ sơ bệnh nhân', icon: <ContactsOutlined />, content: <Patients token={token} onExpired={endSession} doctorId={admin ? undefined : account.id} /> },
    { key: 'medications', label: 'Danh mục thuốc', icon: <MedicineBoxOutlined />, content: <Medications token={token} onExpired={endSession} readOnly={!admin} /> },
    ...(admin ? [
      { key: 'accounts', label: 'Tài khoản', icon: <TeamOutlined />, content: <Accounts token={token} onExpired={endSession} /> },
      { key: 'rules', label: 'Luật cảnh báo', icon: <SafetyOutlined />, content: <RuleManagement token={token} onExpired={endSession} /> },
    ] : []),
  ]
  return <WorkspaceShell sections={sections} account={account} token={token} onLogout={endSession} />
}
