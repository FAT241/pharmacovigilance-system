import { useEffect, useState } from 'react'
import { Badge } from 'antd'
import { setConnectionAvailable } from '../api'

export function ConnectionStatus() {
  const [online, setOnline] = useState<boolean>()
  useEffect(() => {
    let live = true
    let revision = 0
    async function refresh() {
      const current = ++revision
      let available = false
      try {
        const r = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(3500) })
        available = r.ok && (await r.json()).application === 'dacs4'
      } catch { /* Next poll also detects recovery. */ }
      if (live && current === revision) { setOnline(available); setConnectionAvailable(available) }
    }
    void refresh()
    const interval = setInterval(refresh, 10000)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    return () => { live = false; clearInterval(interval); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); setConnectionAvailable(true) }
  }, [])
  return <span role="status"><Badge status={online === undefined ? 'default' : online ? 'success' : 'error'} text={online === undefined ? 'Đang kết nối' : online ? 'Trực tuyến' : 'Mất kết nối'} /></span>
}
