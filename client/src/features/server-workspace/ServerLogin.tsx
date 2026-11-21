import React, { useState } from 'react'
import { Alert, Button, Card, Form, Input, Space, Tabs, Tag, Typography } from 'antd'
import {
  ArrowRightOutlined,
  IdcardOutlined,
  LockOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  MedicineBoxOutlined,
  ThunderboltOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import './workspace.css'
import { requestApi } from './api'
import type { Account } from './types'
import { HospitalCrest } from '../../shared/components/MedicalIcons'

export type Session = { token: string; account: Account }

export function ServerLogin({ onLogin }: { onLogin: (session: Session) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<'staff' | 'patient'>('staff')
  const [staffForm] = Form.useForm()
  const [patientForm] = Form.useForm()

  async function login(kind: 'staff' | 'patient', values: Record<string, string>) {
    setError('')
    setBusy(true)
    try {
      const result = await requestApi<Session>('/auth/login', undefined, 'POST', { ...values, kind })
      onLogin(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.')
    } finally {
      setBusy(false)
    }
  }

  const fillStaffDemo = (username: string, pass: string) => {
    setActiveTab('staff')
    staffForm.setFieldsValue({ username, password: pass })
  }

  const fillPatientDemo = (code: string) => {
    setActiveTab('patient')
    patientForm.setFieldsValue({ patientCode: code })
  }

  return (
    <main className="ward-login-container">
      {/* Left Side: Hospital Brand & Scope Highlights */}
      <aside className="ward-login-hero">
          <div className="ward-login-hero-overlay">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <HospitalCrest size={48} />
                <div>
                  <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    BỆNH VIỆN ĐA KHOA MÔ PHỎNG
                  </div>
                  <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                    Kê đơn Nội trú & Cảnh giác Dược (DACS4)
                  </div>
                </div>
              </div>

              <Typography.Title
                level={2}
                style={{
                  color: '#ffffff',
                  fontWeight: 800,
                  margin: '24px 0 14px',
                  letterSpacing: '-0.02em',
                  fontSize: 28,
                  lineHeight: 1.3,
                }}
              >
                Hỗ trợ Kê đơn An toàn &amp; Kiểm duyệt Lâm sàng
              </Typography.Title>
              <p style={{ color: '#e0f2fe', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
                Hệ thống cảnh giác dược thí điểm cho bệnh Tăng huyết áp (I10) và Đái tháo đường típ 2 (E11).
                Tự động kiểm tra chống chỉ định, tương tác thuốc, giới hạn liều theo cân nặng và đối chiếu thuốc tại nhà.
              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
                  <SafetyCertificateOutlined style={{ color: '#38bdf8', fontSize: 20 }} />
                  <span style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 500 }}>Phát hiện tương tác, chống chỉ định, quá liều theo DrugBank VN &amp; Dược thư</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
                  <RobotOutlined style={{ color: '#34d399', fontSize: 20 }} />
                  <span style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 500 }}>Trợ lý AI diễn giải đơn thuốc cho bệnh nhân dựa trên Dược thư Quốc gia</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
                  <ThunderboltOutlined style={{ color: '#fbbf24', fontSize: 20 }} />
                  <span style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 500 }}>Tạm ngưng luật khẩn cấp Socket.IO đồng bộ thời gian thực đến toàn viện</span>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.15)', color: '#bae6fd', fontSize: 12 }}>
              Đồ án Cơ sở 4 · Thiết kế bám sát tài liệu PTTTKHT và nghiệp vụ điều trị nội trú
            </div>
          </div>
        </aside>

        {/* Right Side: Authentication Panel */}
        <section className="ward-login-panel">
          <div className="ward-login-card">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'inline-flex', padding: 8, background: '#f0f9ff', borderRadius: '50%', marginBottom: 8 }}>
              <HospitalCrest size={32} />
            </div>
            <Typography.Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
              Đăng nhập hệ thống
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Dành cho Bác sĩ, Quản trị viên và Bệnh nhân tra cứu
            </Typography.Text>
          </div>

          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 14, borderRadius: 8 }} />}

          <Tabs
            activeKey={activeTab}
            onChange={(k) => {
              setActiveTab(k as 'staff' | 'patient')
              setError('')
            }}
            items={[
              {
                key: 'staff',
                label: (
                  <span>
                    <img src="/images/nav-patient.gif" width={20} height={20} style={{ verticalAlign: 'middle', marginRight: 6 }} alt="" /> Bác sĩ / Quản trị
                  </span>
                ),
                children: (
                  <Form form={staffForm} layout="vertical" onFinish={(values) => login('staff', values)} style={{ marginTop: 10 }}>
                    <Form.Item
                      name="username"
                      label="Tên đăng nhập"
                      rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
                      style={{ marginBottom: 16 }}
                    >
                      <Input size="large" prefix={<UserOutlined style={{ color: '#0284c7' }} />} placeholder="Ví dụ: bs_an, bs_binh, admin" autoComplete="username" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      label="Mật khẩu"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                      style={{ marginBottom: 20 }}
                    >
                      <Input.Password size="large" prefix={<LockOutlined style={{ color: '#0284c7' }} />} placeholder="Nhập mật khẩu..." autoComplete="current-password" />
                    </Form.Item>
                    <Button
                      type="primary"
                      size="large"
                      block
                      icon={<ArrowRightOutlined />}
                      iconPosition="end"
                      htmlType="submit"
                      loading={busy}
                      style={{ height: 44, borderRadius: 8, fontSize: 15, fontWeight: 600, background: '#0284c7' }}
                    >
                      Đăng nhập
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'patient',
                label: (
                  <span>
                    <img src="/images/nav-treatment.gif" width={20} height={20} style={{ verticalAlign: 'middle', marginRight: 6 }} alt="" /> Bệnh nhân
                  </span>
                ),
                children: (
                  <Form form={patientForm} layout="vertical" onFinish={(values) => login('patient', values)} style={{ marginTop: 10 }}>
                    <Form.Item
                      name="patientCode"
                      label="Mã định danh bệnh nhân"
                      rules={[{ required: true, message: 'Vui lòng nhập mã bệnh nhân!' }]}
                      help="Tra cứu phác đồ điều trị và hướng dẫn uống thuốc từ bác sĩ"
                      style={{ marginBottom: 20 }}
                    >
                      <Input size="large" prefix={<IdcardOutlined style={{ color: '#059669' }} />} placeholder="Ví dụ: BN-2026-001" />
                    </Form.Item>
                    <Button
                      type="primary"
                      size="large"
                      block
                      icon={<ArrowRightOutlined />}
                      iconPosition="end"
                      htmlType="submit"
                      loading={busy}
                      style={{ height: 44, borderRadius: 8, fontSize: 15, fontWeight: 600, background: '#059669', borderColor: '#059669' }}
                    >
                      Tra cứu kết quả điều trị
                    </Button>
                  </Form>
                ),
              },
            ]}
          />

          {/* 1-Click Demo Accounts Selector */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              Tài khoản Demo (Bấm để điền nhanh):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
              <Button
                size="small"
                style={{ textAlign: 'left', height: 32, padding: '0 8px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                onClick={() => fillStaffDemo('bs_an', 'BacSi@123')}
              >
                <Tag color="blue" style={{ margin: 0, padding: '0 4px', fontSize: 10, lineHeight: '16px' }}>BS</Tag>
                <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  BS. Nguyễn Văn An
                </span>
              </Button>

              <Button
                size="small"
                style={{ textAlign: 'left', height: 32, padding: '0 8px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                onClick={() => fillStaffDemo('bs_binh', 'BacSi@123')}
              >
                <Tag color="blue" style={{ margin: 0, padding: '0 4px', fontSize: 10, lineHeight: '16px' }}>BS</Tag>
                <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  BS. Trần Thị Bình
                </span>
              </Button>

              <Button
                size="small"
                style={{ textAlign: 'left', height: 32, padding: '0 8px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                onClick={() => fillStaffDemo('admin', 'Admin@123')}
              >
                <Tag color="purple" style={{ margin: 0, padding: '0 4px', fontSize: 10, lineHeight: '16px' }}>QT</Tag>
                <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Quản trị viên
                </span>
              </Button>

              <Button
                size="small"
                style={{ textAlign: 'left', height: 32, padding: '0 8px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                onClick={() => fillPatientDemo('BN-2026-001')}
              >
                <Tag color="green" style={{ margin: 0, padding: '0 4px', fontSize: 10, lineHeight: '16px' }}>BN</Tag>
                <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  BN-2026-001 (Mười)
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
