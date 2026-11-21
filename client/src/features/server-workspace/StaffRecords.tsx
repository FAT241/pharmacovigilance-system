import { useState } from 'react'
import { Button, Space, Tag } from 'antd'
import { EncounterDrawer } from '../encounters/server/EncounterDrawer'
import { ClinicalWorkspace } from '../encounters/server/clinical/ClinicalWorkspace'
import { CreatePatientAccount } from './accounts/CreatePatientAccount'
import { RecordsTable } from './RecordsTable'
import type { Account, PatientRow } from './types'

export function Accounts({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [revision, setRevision] = useState(0)
  return <><CreatePatientAccount token={token} onExpired={onExpired} onSaved={() => setRevision(v => v + 1)} /><RecordsTable<Account> key={revision} createLabel="Thêm bác sĩ" path="/accounts" token={token} onExpired={onExpired}
    searchLabel="Tìm tài khoản" searchHint="Họ tên, tên đăng nhập" searchText={r => r.fullName + ' ' + r.username}
    createPath="/accounts/doctors"
    editPath={row => row.role === 'ADMIN' ? undefined : '/accounts/' + (row.role === 'DOCTOR' ? 'doctors/' : 'patients/') + row.id}
    deletePath={row => row.role === 'ADMIN' ? undefined : '/accounts/' + row.id}
    editFields={row => row.role === 'PATIENT' ? [{ key: 'fullName', label: 'Họ và tên', required: true }] : undefined}
    getValues={row => ({ username: row.username, fullName: row.fullName, department: row.department ?? undefined, title: row.title ?? undefined })}
    statusChange={row => row.role === 'ADMIN' ? undefined : {
      path: '/accounts/' + row.id + '/status', active: row.status === 'DISABLED', reasonRequired: row.status === 'ACTIVE',
    }}
    fields={[
      { key: 'username', label: 'Tên đăng nhập', required: true },
      { key: 'fullName', label: 'Họ và tên', required: true },
      { key: 'department', label: 'Khoa', required: true },
      { key: 'title', label: 'Chức danh' },
      { key: 'password', label: 'Mật khẩu khi tạo hoặc đặt lại', type: 'password' },
    ]}
    columns={[
      { title: 'Họ và tên', dataIndex: 'fullName' },
      { title: 'Tên đăng nhập', dataIndex: 'username' },
      { title: 'Vai trò', dataIndex: 'role', filters: [{ text: 'Bác sĩ', value: 'DOCTOR' }, { text: 'Bệnh nhân', value: 'PATIENT' }, { text: 'Quản trị viên', value: 'ADMIN' }], onFilter: (v, r) => r.role === v, render: (role: Account['role']) =>
        ({ ADMIN: 'Quản trị viên', DOCTOR: 'Bác sĩ', PATIENT: 'Bệnh nhân' })[role] },
      { title: 'Trạng thái', filters: [{ text: 'Hoạt động', value: 'ACTIVE' }, { text: 'Đã khóa', value: 'DISABLED' }], onFilter: (v, r) => r.status === v, render: (_, row) => row.status === 'ACTIVE' ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã khóa</Tag> },
    ]} /></>
}

export function Patients({ token, onExpired, doctorId }: { token: string; onExpired: () => void; doctorId?: string }) {
  const [selected, setSelected] = useState<PatientRow>()
  const [activeClinical, setActiveClinical] = useState<{ path: string; name: string } | null>(null)
  const [revision, setRevision] = useState(0)
  const readOnly = !doctorId
  const statusOf = (row: PatientRow) => !row.encounters?.length ? 'Chưa nhập viện' : row.encounters[0].dischargedAt ? 'Đã xuất viện' : 'Đang điều trị'

  if (activeClinical) {
    return (
      <ClinicalWorkspace
        path={activeClinical.path}
        name={activeClinical.name}
        doctorId={doctorId}
        token={token}
        onExpired={onExpired}
        onClose={() => {
          setActiveClinical(null)
          setRevision(v => v + 1)
        }}
      />
    )
  }

  return <><RecordsTable<PatientRow> key={revision} afterCreate={setSelected} duplicateHint={(rows, values) => {
    const phone = String(values.phone || '').replace(/\s/g, '')
    const match = rows.find(r => (values.idCard && r.idCard === values.idCard) || (phone && r.phone?.replace(/\s/g, '') === phone))
    return match ? 'Thông tin trùng hồ sơ ' + match.user.fullName + ' · ' + match.patientCode + '. Hãy đối chiếu trước khi lưu.' : undefined
  }} path="/patients" token={token} onExpired={onExpired}
    searchText={row => [row.user.fullName, row.patientCode, row.idCard].join(' ')}
    createPath={readOnly ? undefined : '/patients'}
    editPath={readOnly ? undefined : row => '/patients/' + row.id}
    getValues={row => ({ ...row, fullName: row.user.fullName, birthDate: row.birthDate.slice(0, 10), idCard: row.idCard ?? '', phone: row.phone ?? '', address: row.address ?? '' })}
    fields={[
      { key: 'fullName', label: 'Họ và tên', required: true },
      { key: 'birthDate', label: 'Ngày sinh', type: 'date', required: true },
      { key: 'gender', label: 'Giới tính', required: true, options: [
        { value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' },
      ] },
      { key: 'idCard', label: 'CCCD' }, { key: 'phone', label: 'Điện thoại' }, { key: 'address', label: 'Địa chỉ' },
    ]}
    columns={[
      { title: 'Mã bệnh nhân', dataIndex: 'patientCode', render: (code: string) => <Tag color="cyan" style={{ fontWeight: 600 }}>{code}</Tag> },
      { title: 'Họ và tên', dataIndex: ['user', 'fullName'], render: (name: string) => <strong style={{ color: '#0f172a' }}>{name}</strong> },
      { title: 'Ngày sinh', dataIndex: 'birthDate', render: (date: string) => date.slice(0, 10) },
      { title: 'Điện thoại', dataIndex: 'phone', render: (phone?: string) => phone || '—' },
      { title: 'Trạng thái điều trị', filters: ['Đang điều trị', 'Đã xuất viện', 'Chưa nhập viện'].map(value => ({ text: value, value })),
        onFilter: (v, row) => statusOf(row) === v, render: (_, row) => <Tag color={statusOf(row) === 'Đang điều trị' ? 'success' : undefined}>{statusOf(row)}</Tag> },
      { title: 'Nhập viện gần nhất', render: (_, row) => row.encounters?.[0] ? new Date(row.encounters[0].admittedAt).toLocaleDateString('vi-VN') : '—' },
      { title: 'Bác sĩ phụ trách', render: (_, row) => row.encounters?.[0]?.doctor.fullName ?? '—' },
      { title: 'Dị ứng', render: (_, row) => {
        const status = row.encounters?.[0]?.allergyStatus ?? 'UNKNOWN'
        if (status === 'REPORTED') return <Tag color="error">Có dị ứng</Tag>
        if (status === 'NONE_REPORTED') return <Tag color="success">Không dị ứng</Tag>
        return <Tag color="warning">Chưa xác minh</Tag>
      } },
      {
        title: 'Hồ sơ nội trú',
        key: 'actions',
        render: (_, row) => {
          const activeEnc = row.encounters?.[0]
          const hasActiveEncounter = Boolean(activeEnc && !activeEnc.dischargedAt && activeEnc.id)
          return (
            <Space>
              {hasActiveEncounter && activeEnc?.id && (
                <Button
                  type="primary"
                  size="small"
                  style={{ background: '#0284c7' }}
                  onClick={() =>
                    setActiveClinical({
                      path: `/patients/${row.id}/encounters/${activeEnc.id}/clinical`,
                      name: row.user.fullName,
                    })
                  }
                >
                  Vào đợt điều trị
                </Button>
              )}
              <Button size="small" onClick={() => setSelected(row)}>
                {hasActiveEncounter ? 'Lịch sử đợt' : 'Đợt điều trị'}
              </Button>
            </Space>
          )
        },
      },
    ]} />
    {selected && <EncounterDrawer key={selected.id} patient={selected} doctorId={doctorId}
      token={token} onClose={() => { setSelected(undefined); setRevision(v => v + 1) }} onExpired={onExpired}
      onOpenClinical={(encounterId, patientName) => {
        setSelected(undefined)
        setActiveClinical({
          path: `/patients/${selected.id}/encounters/${encounterId}/clinical`,
          name: patientName,
        })
      }} />}
  </>
}
