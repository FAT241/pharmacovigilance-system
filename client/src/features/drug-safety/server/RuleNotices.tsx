import { useEffect, useState } from 'react'
import { Alert, App, Badge, Button, Drawer, List } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { requestApi } from '../../server-workspace/api'
import { io } from 'socket.io-client'

type Change = { id: number; code: string; changedAt: string; title: string; version: number; active: boolean; reason: string }

export function RuleNotices({ token }: { token: string }) {
  const { notification } = App.useApp()
  const [offline, setOffline] = useState(false)
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState<Change[]>([])
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let live = true
    function merge(items: Change[]) {
      if (!live) return
      setChanges(old => [...new Map([...old, ...items].map(c => [c.id, c])).values()].sort((a,b) => b.id - a.id).slice(0,50))
    }
    const socket = io('/rule-changes', { auth: { token }, forceNew: true })
    socket.on('connect', () => {
      setOffline(false)
      requestApi<Change[]>('/rules/notices', token).then(merge).catch(() => { if (live) setOffline(true) })
    })
    socket.on('disconnect', () => setOffline(true))
    socket.on('connect_error', () => setOffline(true))
    socket.on('rule-changed', (change: Change) => {
      merge([change]); setUnread(n => n + 1)
      notification.info({ key: 'rule-' + change.id, placement: 'bottomLeft', duration: 8,
        message: change.active ? 'Đã kích hoạt lại luật' : 'Luật cảnh báo vừa tạm ngưng',
        description: <>{change.title} · v{change.version}<br />Lý do · {change.reason}</>,
      })
    })
    return () => { live = false; socket.removeAllListeners(); socket.disconnect(); notification.destroy() }
  }, [token, notification])
  return <><Badge count={open ? 0 : unread} size="small"><Button aria-label="Thông báo thay đổi luật" icon={<BellOutlined />} onClick={() => { setOpen(true); setUnread(0) }} /></Badge>
    {offline && <span role="status">Thông báo gián đoạn</span>}
    <Drawer title="Thông báo thay đổi luật" open={open} onClose={() => { setOpen(false); setUnread(0) }}>
      {offline && <Alert type="warning" showIcon message="Mất kết nối thông báo thay đổi luật." />}
      <List dataSource={changes} locale={{ emptyText: 'Chưa có thông báo' }} renderItem={c => <List.Item>
        <List.Item.Meta title={(c.active ? 'Kích hoạt lại · ' : 'Tạm ngưng · ') + c.title}
          description={<>Phiên bản {c.version} · {new Date(c.changedAt).toLocaleString('vi-VN')}<br />{c.reason}</>} /></List.Item>} />
    </Drawer></>
}
