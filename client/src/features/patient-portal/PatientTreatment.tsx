import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { requestApi, ApiError } from '../server-workspace/api'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  RobotOutlined,
  SmileOutlined,
} from '@ant-design/icons'
import { DrugPillIcon, HospitalCrest } from '../../shared/components/MedicalIcons'

type Item = {
  id: string
  name: string
  strength: string
  dose: string
  doseUnit: string
  route: string | null
  schedule: { timesPerDay: number; slots?: string[] }
  status: string
  startedAt: string
  endedAt: string | null
  explanation: string | null
}

type Stay = {
  id: string
  admittedAt: string
  dischargedAt: string | null
  dischargeCondition: string | null
  followUpAdvice: string | null
  publishedDiagnoses: string[]
  publishedAt: string | null
  publishedAdvice: string | null
  orders: Item[]
}

const dateStr = (value: string) => new Date(value).toLocaleString('vi-VN')

function DrugCard({ item }: { item: Item }) {
  const active = item.status === 'ACTIVE'

  return (
    <Card
      size="small"
      style={{
        borderRadius: 10,
        marginBottom: 12,
        border: active ? '1px solid #bae6fd' : '1px solid #e2e8f0',
        background: active ? '#ffffff' : '#f8fafc',
        boxShadow: active ? '0 2px 8px rgba(2,132,199,0.06)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: active ? '#e0f2fe' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DrugPillIcon size={22} color={active ? '#0284c7' : '#94a3b8'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: active ? '#0f172a' : '#64748b' }}>
              {item.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Hàm lượng: {item.strength}</div>
          </div>
        </div>

        <Tag color={active ? 'success' : 'default'} style={{ borderRadius: 4, margin: 0 }}>
          {active ? 'Đang uống' : 'Đã kết thúc'}
        </Tag>
      </div>

      {/* Regimen & Timing */}
      <div
        style={{
          margin: '12px 0',
          padding: '8px 12px',
          background: active ? '#f0f9ff' : '#f8fafc',
          borderRadius: 6,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: '#64748b' }}>Liều dùng: </span>
          <strong style={{ color: '#0369a1', fontSize: 13.5 }}>
            {item.dose} {item.doseUnit === 'ML' ? 'mL' : 'viên'} / lần
          </strong>
        </div>

        <div>
          <span style={{ fontSize: 12, color: '#64748b' }}>Số lần uống: </span>
          <strong style={{ color: '#0f172a', fontSize: 13.5 }}>{item.schedule.timesPerDay} lần / ngày</strong>
        </div>

        {item.schedule.slots && item.schedule.slots.length > 0 && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Thời điểm: </span>
            {item.schedule.slots.map((slot) => (
              <Tag key={slot} color="blue" style={{ fontSize: 11, borderRadius: 3, margin: 0 }}>
                {slot}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
        <span>Bắt đầu từ: {dateStr(item.startedAt)}</span>
        {item.endedAt && <span> · {active ? 'Dự kiến dùng đến: ' : 'Đã ngừng lúc: '}{dateStr(item.endedAt)}</span>}
      </div>

      {/* Approved AI Clinical Explanation */}
      {item.explanation ? (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: '10px 14px',
            marginTop: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', marginBottom: 4 }}>
            <SmileOutlined />
            <strong style={{ fontSize: 12.5 }}>Hướng dẫn dùng thuốc từ Bác sĩ điều trị:</strong>
          </div>
          <div style={{ color: '#14532d', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {item.explanation}
          </div>
        </div>
      ) : active ? (
        <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 }}>
          ℹ️ Bác sĩ đang cập nhật hướng dẫn dùng thuốc chi tiết cho đơn này.
        </div>
      ) : null}
    </Card>
  )
}

export function PatientTreatment({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [rows, setRows] = useState<Stay[]>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let live = true
    setError('')
    requestApi<Stay[]>('/patients/me/treatment', token)
      .then((data) => {
        if (live) setRows(data)
      })
      .catch((e) => {
        if (!live) return
        if (e instanceof ApiError && e.status === 401) onExpired()
        else setError(e.message)
      })
    return () => {
      live = false
    }
  }, [revision, token])

  useEffect(() => {
    const ends = rows?.flatMap((r) =>
      r.orders.filter((o) => o.status === 'ACTIVE' && o.endedAt).map((o) => Date.parse(o.endedAt!)),
    )
    if (!ends?.length) return
    const timer = setTimeout(
      () => setRevision((v) => v + 1),
      Math.min(2147483647, Math.max(100, Math.min(...ends) - Date.now() + 100)),
    )
    return () => clearTimeout(timer)
  }, [rows])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Patient Welcome Header */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(2,132,199,0.15)',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <HospitalCrest size={44} />
            <div>
              <div style={{ color: '#e0f2fe', fontSize: 13 }}>CỔNG THÔNG TIN ĐIỀU TRỊ BỆNH NHÂN</div>
              <Typography.Title level={3} style={{ color: '#ffffff', margin: 0, fontWeight: 700 }}>
                Kế hoạch Dùng thuốc & Dặn dò của Bác sĩ
              </Typography.Title>
            </div>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => setRevision((v) => v + 1)}
            style={{ borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            Làm mới kết quả
          </Button>
        </div>
      </Card>

      {error && <Alert type="error" message={error} showIcon style={{ borderRadius: 8 }} />}

      {!rows && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Đang nạp phác đồ điều trị của bạn...</div>
        </div>
      )}

      {rows?.length === 0 && <Empty description="Bạn chưa có đợt điều trị nội trú nào trong hệ thống." />}

      {rows?.map((stay) => {
        const activeMeds = stay.orders.filter((o) => o.status === 'ACTIVE')
        const pastMeds = stay.orders.filter((o) => o.status !== 'ACTIVE')

        return (
          <div key={stay.id} style={{ display: 'grid', gap: 16 }}>
            {/* Stay Summary Card */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ClockCircleOutlined style={{ color: '#0284c7' }} />
                  <span>Đợt nhập viện ngày: {dateStr(stay.admittedAt)}</span>
                  {stay.dischargedAt ? (
                    <Tag color="default">Đã xuất viện ({dateStr(stay.dischargedAt)})</Tag>
                  ) : (
                    <Tag color="success">Đang nằm viện</Tag>
                  )}
                </div>
              }
              bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}
            >
              {/* Published Diagnoses & Advice */}
              {stay.publishedAt && (
                <div style={{ marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 600, marginBottom: 4 }}>
                    Chẩn đoán xác định: {stay.publishedDiagnoses.join(', ') || 'Chưa ghi nhận'}
                  </div>
                  {stay.publishedAdvice && (
                    <div style={{ fontSize: 13, color: '#334155', marginTop: 6, lineHeight: 1.5 }}>
                      <strong>Lời dặn chung:</strong> {stay.publishedAdvice}
                    </div>
                  )}
                </div>
              )}

              {/* Discharge Notes if available */}
              {stay.dischargedAt && (
                <div style={{ marginBottom: 16, background: '#fef3c7', padding: 14, borderRadius: 8, border: '1px solid #fde68a' }}>
                  {stay.dischargeCondition && (
                    <div style={{ fontSize: 13, color: '#92400e', marginBottom: 4 }}>
                      <strong>Tình trạng khi xuất viện:</strong> {stay.dischargeCondition}
                    </div>
                  )}
                  {stay.followUpAdvice && (
                    <div style={{ fontSize: 13, color: '#92400e' }}>
                      <strong>Lịch tái khám & Dặn dò:</strong> {stay.followUpAdvice}
                    </div>
                  )}
                </div>
              )}

              {/* Active Medications List */}
              <div style={{ marginTop: 8 }}>
                <Typography.Title level={5} style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MedicineBoxOutlined />
                  <span>Thuốc đang cần uống ({activeMeds.length} thuốc)</span>
                </Typography.Title>

                {activeMeds.length ? (
                  activeMeds.map((med) => <DrugCard key={med.id} item={med} />)
                ) : (
                  <Empty description="Hiện tại không có y lệnh thuốc đang hiệu lực." style={{ padding: '20px 0' }} />
                )}
              </div>

              {/* Past Medications Collapsible */}
              {pastMeds.length > 0 && (
                <details style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  <summary style={{ cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                    Lịch sử thuốc đã ngừng hoặc đã kết thúc ({pastMeds.length} thuốc)
                  </summary>
                  <div style={{ marginTop: 12 }}>
                    {pastMeds.map((med) => (
                      <DrugCard key={med.id} item={med} />
                    ))}
                  </div>
                </details>
              )}
            </Card>
          </div>
        )
      })}
    </div>
  )
}
