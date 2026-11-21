import { useMemo, useState, type ReactNode } from 'react'
import { Avatar, Button, Layout, Menu, Popconfirm, Space, Tag, Typography, App, Tooltip } from 'antd'
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import type { Account } from './types'
import './workspace-layout.css'
import { ConnectionStatus } from './connection/ConnectionStatus'
import { RuleNotices } from '../drug-safety/server/RuleNotices'
import { HospitalCrest } from '../../shared/components/MedicalIcons'

export type Section = {
  key: string
  label: string
  group?: string
  description?: string
  icon: ReactNode
  content: ReactNode
}

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

  // Nhóm menu theo luồng nghiệp vụ
  const menuItems = useMemo(() => {
    const groups: { [g: string]: Section[] } = {}
    sections.forEach((s) => {
      const g = s.group || 'CHỨC NĂNG'
      if (!groups[g]) groups[g] = []
      groups[g].push(s)
    })

    return Object.entries(groups).map(([groupTitle, items]) => ({
      type: 'group' as const,
      label: collapsed ? null : <span className="ward-menu-group-label">{groupTitle}</span>,
      children: items.map((item) => ({
        key: item.key,
        label: <span className="ward-menu-item-text">{item.label}</span>,
        icon: item.icon,
      })),
    }))
  }, [sections, collapsed])

  return (
    <Layout className="ward-workspace">
      <Layout.Sider
        width={260}
        collapsedWidth={74}
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={setCollapsed}
        className="ward-nav"
        theme="light"
      >
        {/* Brand Header */}
        <div className="ward-brand-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HospitalCrest size={collapsed ? 30 : 36} />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div className="ward-brand-title">DACS4 CLINICAL</div>
                <div className="ward-brand-subtitle">Nội trú & Dược cảnh giác</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
          <nav aria-label="Điều hướng chính">
            <Menu
              mode="inline"
              selectedKeys={[active.key]}
              items={menuItems}
              onClick={({ key }) => setSelected(key)}
              style={{ border: 'none', background: 'transparent' }}
            />
          </nav>
        </div>

        {/* Pinned User Profile Footer */}
        <div className="ward-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <Avatar src={getAvatar()} icon={<UserOutlined />} size={36} style={{ flexShrink: 0, border: '2px solid #e0f2fe' }} />
            {!collapsed && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div className="ward-user-name" title={account.fullName}>
                  {account.fullName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Tag color={roleMeta.color} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', borderRadius: 4 }}>
                    {roleMeta.label}
                  </Tag>
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <Popconfirm
              title="Đăng xuất khỏi hệ thống"
              description="Bạn có chắc muốn kết thúc phiên làm việc?"
              onConfirm={handleLogout}
              okText="Đăng xuất"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              placement="topRight"
            >
              <Tooltip title="Đăng xuất">
                <Button
                  type="text"
                  danger
                  icon={<LogoutOutlined />}
                  aria-label="Đăng xuất"
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </div>
      </Layout.Sider>

      <Layout className="ward-body">
        {/* Modern Clean Topbar */}
        <header className="ward-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              aria-label={collapsed ? 'Mở thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 17, width: 36, height: 36, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Typography.Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 700, fontSize: 17 }}>
                  {active.label}
                </Typography.Title>
              </div>
              {active.description && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                  {active.description}
                </div>
              )}
            </div>
          </div>

          <Space size="middle" align="center">
            <ConnectionStatus />
            {account.role === 'DOCTOR' && <RuleNotices token={token} />}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#f1f5f9',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                color: '#475569',
                border: '1px solid #e2e8f0',
              }}
            >
              <span className="pulse-live-dot" />
              <span>{account.department || 'Khoa Nội tổng hợp'}</span>
            </div>

            {collapsed && (
              <Popconfirm
                title="Đăng xuất"
                description="Bạn có muốn đăng xuất?"
                onConfirm={handleLogout}
                okText="Đăng xuất"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<LogoutOutlined />}>
                  Đăng xuất
                </Button>
              </Popconfirm>
            )}
          </Space>
        </header>

        <main className="ward-main" key={active.key}>
          {active.content}
        </main>
      </Layout>
    </Layout>
  )
}
