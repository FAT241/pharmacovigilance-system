import { useEffect, useState } from 'react'
import { Alert, Button, Descriptions, Drawer, List, Space, Spin, Tag } from 'antd'
import { ApiError, requestApi } from '../../../server-workspace/api'
import { statusText } from '../types'
import { time, triggerText, type Detail, type SavedOrder } from './types'

const labels: Record<string, string> = {
  orderIds: 'Y lệnh liên quan', reviewIds: 'Dòng thuốc chưa đối chiếu', ingredients: 'Cặp hoạt chất',
  ingredient: 'Hoạt chất', totalMgDay: 'Tổng liều (mg/ngày)', kilograms: 'Cân nặng (kg)',
  mgPerKgDay: 'Ngưỡng thí điểm (mg/kg/ngày)', disease: 'Mã bệnh', group: 'Nhóm thuốc',
  matches: 'Tác nhân trùng', medication: 'Thuốc', allergen: 'Tác nhân', allergyStatus: 'Tiền sử dị ứng',
  reconciliation: 'Đối chiếu thuốc', 'medication.ingredients': 'Thành phần hoạt chất',
  'medication.allergens': 'Ánh xạ tác nhân dị ứng', diagnoses: 'Chẩn đoán', weight: 'Cân nặng', scheduleOrUnit: 'Lịch hoặc đơn vị dùng',
}
function describe(value: unknown, orders: SavedOrder[]): string {
  if (Array.isArray(value)) return value.map(v => describe(v, orders)).join(', ')
  if (value && typeof value === 'object') return Object.entries(value).map(([k, v]) => (labels[k] ?? 'Thông tin bổ sung') + ' · ' + describe(v, orders)).join(' / ')
  if (value === 'demo_a') return 'Hoạt chất giả lập A'
  if (value === 'demo_b') return 'Hoạt chất giả lập B'
  if (value === 'DEMO_GROUP') return 'Nhóm thuốc giả lập'
  const order = orders.find(i => i.id === value)
  return order ? order.name + ' (' + order.dose + (order.unit === 'ML' ? ' mL' : ' viên') + '/lần)' : String(value)
}
const outcomeText = { MATCHED: 'Cảnh báo', NOT_MATCHED: 'Không khớp', INSUFFICIENT_DATA: 'Thiếu dữ liệu', ERROR: 'Lỗi' }

export function CheckDetails({ path, token, onClose, onExpired }: { path: string; token: string; onClose: () => void; onExpired: () => void }) {
  const [detail, setDetail] = useState<Detail>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    requestApi<Detail>(path, token).then(data => { if (live) setDetail(data) }).catch(cause => {
      if (!live) return
      if (cause instanceof ApiError && cause.status === 401) onExpired()
      else setError(cause instanceof Error ? cause.message : 'Không tải được kết quả.')
    })
    return () => { live = false }
  }, [path, token, attempt])
  const orders = detail?.contextSnapshot.orders ?? []
  return <Drawer open width="min(580px, 100vw)" title="Chi tiết lần kiểm tra" onClose={onClose}>
    {error && <Alert type="error" message={error} action={<Button onClick={() => { setError(''); setAttempt(v => v + 1) }}>Thử lại</Button>} />}
    {!detail && !error && <Spin />}
    {detail && <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {detail.contextSnapshot.error && <Alert showIcon type="error" message={detail.contextSnapshot.error} />}
      <Descriptions column={1} size="small" items={[
        { key: 'time', label: triggerText[detail.trigger], children: time(detail.checkedAt) },
        { key: 'doctor', label: 'Bác sĩ thực hiện', children: detail.doctor.fullName },
        { key: 'status', label: 'Kết quả', children: statusText[detail.status] },
        ...(detail.confirmedAt ? [{ key: 'confirmed', label: 'Đã xác nhận', children: time(detail.confirmedAt) }] : []),
        ...(detail.overrideReason ? [{ key: 'reason', label: 'Giải trình', children: detail.overrideReason }] : []),
      ]} />
      <List size="small" header={<strong>Y lệnh tại thời điểm kiểm tra</strong>} dataSource={orders} locale={{ emptyText: 'Chưa có thông tin y lệnh' }}
        renderItem={i => <List.Item>{i.name} · {i.strength} · {i.dose} {i.unit === 'ML' ? 'mL' : 'viên'}/lần
          {i.timesPerDay && ' · ' + i.timesPerDay + ' lần/ngày'} {i.id === detail.itemId && <Tag>Đang kê</Tag>}</List.Item>} />
      <List header={<strong>Kết quả từng luật</strong>} dataSource={detail.results} renderItem={r => <List.Item>
        <div><strong>{detail.contextSnapshot.rules?.find(s => s.code === r.ruleCode)?.title ?? "Luật cảnh báo"}</strong> · Phiên bản {r.ruleVersion}
          <div><Tag color={r.outcome === 'MATCHED' ? 'orange' : r.outcome === 'ERROR' ? 'red' : undefined}>{outcomeText[r.outcome]}</Tag>{r.message}</div>
          {Object.entries(r.evidence ?? {}).map(([k, v]) => <div key={k}>{labels[k] ?? 'Thông tin bổ sung'} · {k === 'reviewIds' && Array.isArray(v) ? v.length : describe(v, orders)}</div>)}
          {!!r.missingFields.length && <div>Cần bổ sung · {r.missingFields.map(f => labels[f] ?? 'Thông tin chưa xác định').join(', ')}</div>}
        </div>
      </List.Item>} />
    </Space>}
  </Drawer>
}
