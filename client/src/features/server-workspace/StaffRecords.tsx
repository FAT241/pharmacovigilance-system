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
  const statusOf = (row: PatientRow) => (!row.encounters?.length ? 'Chưa nhập viện' : row.encounters[0].dischargedAt ? 'Đã xuất viện' : 'Đang điều trị')

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
          setRevision((v) => v + 1)
        }}
      />
    )
  }

  return (
    <>
      <div style={{ marginBottom: 16, padding: '14px 18px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontWeight: 700, fontSize: 14 }}>
          <span>🩺 Hướng dẫn quy trình khám & cảnh giác dược (3 bước):</span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8, fontSize: 13, color: '#475569' }}>
          <div>
            <strong style={{ color: '#0284c7' }}>Bước 1:</strong> Bấm nút xanh <strong>"Khám & Kê đơn →"</strong> tại bệnh nhân đang nằm viện.
          </div>
          <div>
            <strong style={{ color: '#0284c7' }}>Bước 2:</strong> Cập nhật sinh hiệu, cân nặng và ghi diễn biến lâm sàng.
          </div>
          <div>
            <strong style={{ color: '#0284c7' }}>Bước 3:</strong> Kê đơn thuốc – Hệ thống tự động quét tương tác, chống chỉ định và quá liều.
          </div>
        </div>
      </div>

      <RecordsTable<PatientRow>
        key={revision}
        afterCreate={setSelected}
        duplicateHint={(rows, values) => {
          const phone = String(values.phone || '').replace(/\s/g, '')
          const match = rows.find((r) => (values.idCard && r.idCard === values.idCard) || (phone && r.phone?.replace(/\s/g, '') === phone))
          return match ? 'Thông tin trùng hồ sơ ' + match.user.fullName + ' · ' + match.patientCode + '. Hãy đối chiếu trước khi lưu.' : undefined
        }}
        path="/patients"
        token={token}
        onExpired={onExpired}
        searchText={(row) => [row.user.fullName, row.patientCode, row.idCard].join(' ')}
        createPath={readOnly ? undefined : '/patients'}
        editPath={readOnly ? undefined : (row) => '/patients/' + row.id}
        createLabel="+ Thêm bệnh nhân mới"
        getValues={(row) => ({
          ...row,
          fullName: row.user.fullName,
          birthDate: row.birthDate.slice(0, 10),
          idCard: row.idCard ?? '',
          phone: row.phone ?? '',
          address: row.address ?? '',
        })}
        fields={[
          { key: 'fullName', label: 'Họ và tên', required: true },
          { key: 'birthDate', label: 'Ngày sinh', type: 'date', required: true },
          {
            key: 'gender',
            label: 'Giới tính',
            required: true,
            options: [
              { value: 'MALE', label: 'Nam' },
              { value: 'FEMALE', label: 'Nữ' },
              { value: 'OTHER', label: 'Khác' },
            ],
          },
          { key: 'idCard', label: 'CCCD' },
          { key: 'phone', label: 'Điện thoại' },
          { key: 'address', label: 'Địa chỉ' },
        ]}
        columns={[
          {
            title: 'Mã BN',
            dataIndex: 'patientCode',
            width: 110,
            render: (code: string) => (
              <Tag color="cyan" style={{ fontWeight: 600, borderRadius: 4 }}>
                {code}
              </Tag>
            ),
          },
          {
            title: 'Họ và tên',
            dataIndex: ['user', 'fullName'],
            render: (name: string) => <strong style={{ color: '#0f172a', fontSize: 13.5 }}>{name}</strong>,
          },
          { title: 'Ngày sinh', dataIndex: 'birthDate', width: 105, render: (date: string) => date.slice(0, 10) },
          { title: 'Điện thoại', dataIndex: 'phone', width: 115, render: (phone?: string) => phone || '—' },
          {
            title: 'Trạng thái',
            width: 130,
            filters: ['Đang điều trị', 'Đã xuất viện', 'Chưa nhập viện'].map((value) => ({ text: value, value })),
            onFilter: (v, row) => statusOf(row) === v,
            render: (_, row) => (
              <Tag color={statusOf(row) === 'Đang điều trị' ? 'processing' : statusOf(row) === 'Đã xuất viện' ? 'default' : 'warning'}>
                {statusOf(row)}
              </Tag>
            ),
          },
          {
            title: 'Bác sĩ phụ trách',
            render: (_, row) => row.encounters?.[0]?.doctor.fullName ?? <span style={{ color: '#94a3b8' }}>—</span>,
          },
          {
            title: 'Dị ứng',
            width: 130,
            render: (_, row) => {
              const status = row.encounters?.[0]?.allergyStatus ?? 'UNKNOWN'
              if (status === 'REPORTED') return <Tag color="error">Có dị ứng</Tag>
              if (status === 'NONE_REPORTED') return <Tag color="success">Không dị ứng</Tag>
              return <Tag color="warning">Chưa xác minh</Tag>
            },
          },
          {
            title: 'Khám & Điều trị nội trú',
            key: 'clinical_actions',
            width: 220,
            render: (_, row) => {
              const activeEnc = row.encounters?.[0]
              const hasActiveEncounter = Boolean(activeEnc && !activeEnc.dischargedAt && activeEnc.id)
              return (
                <Space size="small">
                  {hasActiveEncounter && activeEnc?.id ? (
                    <Button
                      type="primary"
                      style={{ background: '#0284c7', borderColor: '#0284c7', borderRadius: 6, fontWeight: 600 }}
                      onClick={() =>
                        setActiveClinical({
                          path: `/patients/${row.id}/encounters/${activeEnc.id}/clinical`,
                          name: row.user.fullName,
                        })
                      }
                    >
                      Khám & Kê đơn →
                    </Button>
                  ) : (
                    <Button
                      style={{ color: '#059669', borderColor: '#86efac', background: '#f0fdf4', borderRadius: 6, fontWeight: 500 }}
                      onClick={() => setSelected(row)}
                    >
                      + Tiếp nhận mới
                    </Button>
                  )}

                  <Button size="small" onClick={() => setSelected(row)} title="Xem danh sách các đợt điều trị">
                    Lịch sử
                  </Button>
                </Space>
              )
            },
          },
        ]}
      />
      {selected && (
        <EncounterDrawer
          key={selected.id}
          patient={selected}
          doctorId={doctorId}
          token={token}
          onClose={() => {
            setSelected(undefined)
            setRevision((v) => v + 1)
          }}
          onExpired={onExpired}
          onOpenClinical={(encounterId, patientName) => {
            setSelected(undefined)
            setActiveClinical({
              path: `/patients/${selected.id}/encounters/${encounterId}/clinical`,
              name: patientName,
            })
          }}
        />
      )}
    </>
  )
}
