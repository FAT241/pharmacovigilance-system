import { useState, type ReactNode } from 'react'
import { Avatar, Button, Dropdown, Layout, Menu, Popconfirm, Space, Tag, Typography, App } from 'antd'
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { Account } from './types'
import './workspace-layout.css'
import { ConnectionStatus } from './connection/ConnectionStatus'
import { RuleNotices } from '../drug-safety/server/RuleNotices'
import { HospitalCrest } from '../../shared/components/MedicalIcons'

type Section = { key: string; label: string; icon: ReactNode; content: ReactNode }

export function WorkspaceShell({
  sections,
  account,
  token,
  onLogout,
}: {
  sections: Section[]
  account: Account
  token: string
  onLogout: () => void
}) {
  const [selected, setSelected] = useState(sections[0].key)
  const [collapsed, setCollapsed] = useState(false)
  const active = sections.find((s) => s.key === selected) ?? sections[0]
  const { message } = App.useApp()

  const getAvatar = () => {
    if (account.role === 'ADMIN') return '/images/admin-avatar.jpg'
    if (account.role === 'PATIENT') return '/images/patient-elderly.jpg'
    if (account.username.includes('binh') || account.fullName.includes('Bình')) {
      return '/images/doctor-female.jpg'
    }
    return '/images/doctor-male.jpg'
  }

  const roleMeta = {
    DOCTOR: { label: 'Bác sĩ điều trị', color: 'blue' },
    ADMIN: { label: 'Quản trị viên', color: 'purple' },
    PATIENT: { label: 'Bệnh nhân', color: 'green' },
  }[account.role]

  const handleLogout = () => {
    message.info('Đã đăng xuất khỏi hệ thống.')
    onLogout()
  }

  return (
    <Layout className="ward-workspace">
      <Layout.Sider
        width={250}
        collapsedWidth={70}
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={setCollapsed}
        className="ward-nav"
        theme="light"
      >
        <div className="ward-brand-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HospitalCrest size={34} />
            {!collapsed && (
              <div>
                <div className="ward-brand-title">DACS4 Clinical</div>
                <div className="ward-brand-subtitle">Nội trú & Dược lâm sàng</div>
              </div>
            )}
          </div>
        </div>

        <nav aria-label="Điều hướng chính" style={{ padding: '8px 4px' }}>
          <Menu
            mode="inline"
            selectedKeys={[active.key]}
            items={sections.map(({ content, ...item }) => item)}
            onClick={({ key }) => setSelected(key)}
            style={{ border: 'none', fontWeight: 500 }}
          />
        </nav>
      </Layout.Sider>

      <Layout className="ward-body">
        <header className="ward-topbar">
          <Space size="middle">
            <Button
              type="text"
              aria-label={collapsed ? 'Mở thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <div>
              <Typography.Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
                {active.label}
              </Typography.Title>
            </div>
          </Space>

          <Space size="middle" wrap align="center">
            <ConnectionStatus />
            {account.role === 'DOCTOR' && <RuleNotices token={token} />}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#f8fafc',
                padding: '4px 12px 4px 6px',
                borderRadius: 24,
                border: '1px solid #e2e8f0',
              }}
            >
              <Avatar src={getAvatar()} icon={<UserOutlined />} size={32} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', lineHeight: 1.2 }}>
                  {account.fullName}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  <Tag color={roleMeta.color} style={{ margin: 0, padding: '0 4px', fontSize: 10, lineHeight: '14px', borderRadius: 3 }}>
                    {roleMeta.label}
                  </Tag>
                  {account.department && <span style={{ marginLeft: 4 }}>· {account.department}</span>}
                </div>
              </div>
            </div>

            <Popconfirm
              title="Đăng xuất khỏi hệ thống"
              description="Bạn có chắc chắn muốn kết thúc phiên làm việc?"
              onConfirm={handleLogout}
              okText="Đăng xuất"
              cancelText="Ở lại"
              okButtonProps={{ danger: true }}
              placement="bottomRight"
            >
              <Button
                title="Đăng xuất"
                aria-label="Đăng xuất"
                icon={<LogoutOutlined />}
                danger
                style={{ borderRadius: 6, fontWeight: 500 }}
              >
                Đăng xuất
              </Button>
            </Popconfirm>
          </Space>
        </header>

        <main className="ward-main" key={active.key}>
          {active.content}
        </main>
      </Layout>
    </Layout>
  )
}
