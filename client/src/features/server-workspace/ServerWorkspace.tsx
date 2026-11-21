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

const NavIcon = ({ src, alt, color = '#eff6ff' }: { src: string; alt: string; color?: string }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: 7,
      background: color,
      verticalAlign: 'middle',
      marginRight: 6,
      boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
      border: '1px solid rgba(0,0,0,0.04)',
    }}
  >
    <img
      src={src}
      alt={alt}
      width={18}
      height={18}
      style={{
        objectFit: 'contain',
        display: 'block',
      }}
    />
  </span>
)

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

  const sections =
    account.role === 'PATIENT'
      ? [
          {
            key: 'treatment',
            label: 'Điều trị của tôi',
            group: 'HỒ SƠ CỦA TÔI',
            description: 'Xem chẩn đoán, y lệnh thuốc đang dùng và hướng dẫn điều trị của bác sĩ',
            icon: <NavIcon src="/images/nav-treatment.gif" alt="Điều trị" color="#ecfdf5" />,
            content: <PatientTreatment token={token} onExpired={endSession} />,
          },
          {
            key: 'profile',
            label: 'Thông tin cá nhân',
            group: 'HỒ SƠ CỦA TÔI',
            description: 'Thông tin hồ sơ, mã bệnh nhân và ngày sinh',
            icon: <NavIcon src="/images/nav-profile.gif" alt="Hồ sơ" color="#eff6ff" />,
            content: <PatientProfile token={token} onExpired={endSession} />,
          },
        ]
      : [
          {
            key: 'patients',
            label: 'Hồ sơ bệnh nhân',
            group: 'ĐIỀU TRỊ LÂM SÀNG',
            description: 'Danh sách bệnh nhân nội trú, tiếp nhận và hồ sơ điều trị lâm sàng',
            icon: <NavIcon src="/images/nav-patient.gif" alt="Bệnh nhân" color="#eff6ff" />,
            content: <Patients token={token} onExpired={endSession} doctorId={admin ? undefined : account.id} />,
          },
          {
            key: 'medications',
            label: 'Danh mục thuốc',
            group: 'DƯỢC LÂM SÀNG & AN TOÀN',
            description: 'Tra cứu danh mục thuốc bệnh viện, hoạt chất và trích đoạn Dược thư Quốc gia',
            icon: <NavIcon src="/images/nav-meds.gif" alt="Thuốc" color="#ecfdf5" />,
            content: <Medications token={token} onExpired={endSession} readOnly={!admin} />,
          },
          ...(admin
            ? [
                {
                  key: 'rules',
                  label: 'Luật cảnh báo an toàn',
                  group: 'DƯỢC LÂM SÀNG & AN TOÀN',
                  description: 'Cấu hình và theo dõi các luật kiểm tra tương tác, chống chỉ định, quá liều',
                  icon: <NavIcon src="/images/nav-rules.gif" alt="Luật cảnh báo" color="#fffbeb" />,
                  content: <RuleManagement token={token} onExpired={endSession} />,
                },
                {
                  key: 'accounts',
                  label: 'Tài khoản nhân viên',
                  group: 'QUẢN TRỊ HỆ THỐNG',
                  description: 'Quản lý tài khoản bác sĩ, phân quyền và trạng thái hoạt động',
                  icon: <NavIcon src="/images/nav-accounts.gif" alt="Tài khoản" color="#faf5ff" />,
                  content: <Accounts token={token} onExpired={endSession} />,
                },
              ]
            : []),
        ]

  return <WorkspaceShell sections={sections} account={account} token={token} onLogout={endSession} />
}
