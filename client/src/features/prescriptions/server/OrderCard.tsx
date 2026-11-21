import React, { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd'
import type { Order, OrderEditor } from './types'
import { OrderExplanation } from './OrderExplanation'
import { statusText } from './types'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  SwapOutlined,
  WarningOutlined,
} from '@ant-design/icons'

export function OrderCard({
  row,
  version,
  editable,
  busy,
  onEdit,
  onCheck,
  onConfirm,
  onStop,
  onExplain,
  onDetails,
  onDeleteDraft,
}: {
  row: Order
  version: number
  editable: boolean
  busy: boolean
  onEdit: (editor: OrderEditor) => void
  onStop: (reason: string) => Promise<void>
  onExplain: (action: string, body: object) => Promise<void>
  onDetails: (id: string) => void
  onCheck: () => void
  onConfirm: (checkId: string, reason: string) => void
  onDeleteDraft?: (itemId: string) => void
}) {
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [stopModalOpen, setStopModalOpen] = useState(false)
  const [stopReason, setStopReason] = useState('')

  const latest = row.checks[0]
  const draft = row.status === 'DRAFT'
  const current = latest && latest.encounterVersion === version
  const needsReason = latest?.status === 'HAS_ALERT' || latest?.status === 'INSUFFICIENT_DATA'
  const status = { DRAFT: 'Nháp', ACTIVE: 'Đang hiệu lực', ENDED: 'Đã kết thúc', REPLACED: 'Đã thay thế' }[row.status]

  const handleConfirmOverride = () => {
    if (!latest) return
    onConfirm(latest.id, overrideReason.trim())
    setOverrideModalOpen(false)
  }

  const handleStopOrder = async () => {
    if (!stopReason.trim()) return
    await onStop(stopReason.trim())
    setStopModalOpen(false)
  }

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 15, color: '#0f172a' }}>{row.medication.name}</strong>
          <span style={{ fontSize: 13, color: '#64748b' }}>({row.medication.strength})</span>
        </div>
      }
      extra={
        <Tag color={row.status === 'ACTIVE' ? 'success' : row.status === 'DRAFT' ? 'processing' : 'default'} style={{ borderRadius: 4 }}>
          {status}
        </Tag>
      }
      style={{
        borderRadius: 10,
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        border: draft && latest?.status === 'HAS_ALERT' ? '1px solid #fecaca' : '1px solid #e2e8f0',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Prescription Details */}
        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 13.5, color: '#1e293b', fontWeight: 600 }}>
            Liều dùng: {row.dose} {row.doseUnit === 'ML' ? 'mL' : 'viên'} / lần · {row.schedule.timesPerDay} lần / ngày
            {row.schedule.slots?.length ? ` (${row.schedule.slots.join(' · ')})` : ''}
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {row.route && <span>Đường dùng: <strong>{row.route}</strong></span>}
            {row.durationDays && <span>Thời hạn: <strong>{row.durationDays} ngày</strong></span>}
            {row.startedAt && <span>Bắt đầu: <strong>{new Date(row.startedAt).toLocaleString('vi-VN')}</strong></span>}
            {row.endedAt && (
              <span>
                {row.status === 'ACTIVE' ? 'Dự kiến kết thúc: ' : 'Đã kết thúc: '}
                <strong>{new Date(row.endedAt).toLocaleString('vi-VN')}</strong>
              </span>
            )}
          </div>
          {row.replacesItemId && (
            <Tag color="cyan" style={{ marginTop: 6 }}>
              Y lệnh thay thế cho thuốc trước đó
            </Tag>
          )}
          {row.endReason && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
              Lý do kết thúc:{' '}
              {({ DISCHARGE: 'Xuất viện', REPLACED: 'Đã thay thế', COURSE_COMPLETE: 'Hết thời gian dùng' } as Record<string, string>)[row.endReason] ?? row.endReason}
            </div>
          )}
        </div>

        {/* Safety Check Results Banner for DRAFT */}
        {latest && draft && (
          <Alert
            showIcon
            type={latest.status === 'ERROR' ? 'error' : latest.status === 'NO_ALERT' ? 'success' : 'warning'}
            message={<strong style={{ fontSize: 13.5 }}>{statusText[latest.status]}</strong>}
            description={
              <div>
                {latest.results
                  .filter((r) => r.outcome !== 'NOT_MATCHED')
                  .map((r) => (
                    <div key={r.ruleCode} style={{ marginTop: 4 }}>
                      • <strong>{r.ruleCode}:</strong> {r.message}
                    </div>
                  ))}
                {!current && (
                  <div style={{ marginTop: 6, color: '#d97706', fontStyle: 'italic' }}>
                    ⚠️ Hồ sơ lâm sàng đã thay đổi sau lần kiểm tra này. Vui lòng bấm Kiểm tra lại!
                  </div>
                )}
              </div>
            }
            style={{ borderRadius: 8 }}
          />
        )}

        {/* Link to view Evidence & Reference Sources */}
        {latest && (
          <Button size="small" type="link" style={{ padding: 0 }} onClick={() => onDetails(latest.id)}>
            Xem chi tiết bằng chứng cảnh báo và căn cứ dược lâm sàng →
          </Button>
        )}

        {/* Doctor Actions on DRAFT Order */}
        {editable && draft && (
          <Space wrap style={{ marginTop: 4 }}>
            <Button disabled={busy} icon={<EditOutlined />} onClick={() => onEdit({ kind: 'EDIT', item: row })}>
              Sửa liều & lịch
            </Button>
            <Button
              disabled={busy}
              icon={<SafetyCertificateOutlined />}
              onClick={onCheck}
              type={!latest ? 'primary' : 'default'}
              style={!latest ? { background: '#0284c7' } : undefined}
            >
              {latest ? 'Kiểm tra lại' : 'Kiểm tra an toàn'}
            </Button>

            {current && latest.status !== 'ERROR' && (
              <>
                {needsReason ? (
                  <Button
                    type="primary"
                    danger
                    icon={<WarningOutlined />}
                    disabled={busy}
                    onClick={() => {
                      setOverrideReason('')
                      setOverrideModalOpen(true)
                    }}
                  >
                    Tiếp tục kê & Giải trình
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    disabled={busy}
                    onClick={() => onConfirm(latest.id, '')}
                    style={{ background: '#059669', borderColor: '#059669' }}
                  >
                    Xác nhận y lệnh (Không có cảnh báo)
                  </Button>
                )}
              </>
            )}

            {onDeleteDraft && (
              <Popconfirm
                title="Xóa y lệnh nháp"
                description={`Bạn có chắc muốn xóa bản nháp thuốc ${row.medication.name}?`}
                okText="Xóa bản nháp"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDeleteDraft(row.id)}
              >
                <Button danger icon={<DeleteOutlined />} disabled={busy}>
                  Xóa bản nháp
                </Button>
              </Popconfirm>
            )}
          </Space>
        )}

        {/* Doctor Actions on ACTIVE Order */}
        {editable && row.status === 'ACTIVE' && (
          <Space wrap>
            <Button disabled={busy} icon={<SwapOutlined />} onClick={() => onEdit({ kind: 'REPLACE', item: row })}>
              Thay thế y lệnh (Đổi liều/lịch)
            </Button>
            <Button
              danger
              disabled={busy}
              icon={<StopOutlined />}
              onClick={() => {
                setStopReason('')
                setStopModalOpen(true)
              }}
            >
              Ngừng y lệnh
            </Button>
          </Space>
        )}

        {/* AI Patient Explanation (UC07) */}
        {!draft && (row.explanation || (editable && row.status === 'ACTIVE')) && (
          <OrderExplanation
            key={row.explanation?.revision + '-' + row.explanation?.status}
            row={row}
            editable={editable}
            busy={busy}
            onSend={onExplain}
          />
        )}

        {/* Safety Check History Collapsible */}
        {!!row.checks.length && (
          <details style={{ marginTop: 8, fontSize: 12.5, color: '#64748b' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              Xem lịch sử các lần kiểm tra an toàn ({row.checks.length} lần)
            </summary>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {row.checks.map((check) => (
                <div key={check.id} style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{new Date(check.checkedAt).toLocaleString('vi-VN')}</strong>
                    <Tag>{statusText[check.status]}</Tag>
                  </div>
                  {check.confirmedAt && (
                    <div style={{ color: '#059669', marginTop: 2 }}>
                      ✓ Đã xác nhận: {new Date(check.confirmedAt).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {check.overrideReason && (
                    <div style={{ color: '#0369a1', marginTop: 2 }}>
                      Giải trình: {check.overrideReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </Space>

      {/* Override Reason Modal (UC04 / UC06) */}
      <Modal
        open={overrideModalOpen}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#dc2626' }} />
            <span>Giải trình Lâm sàng khi Kê đơn (Bắt buộc)</span>
          </Space>
        }
        okText="Xác nhận kê đơn và Lưu giải trình"
        cancelText="Quay lại sửa y lệnh"
        okButtonProps={{ danger: true, disabled: !overrideReason.trim() }}
        onOk={handleConfirmOverride}
        onCancel={() => setOverrideModalOpen(false)}
        width={560}
      >
        <div style={{ marginBlock: 12 }}>
          <Alert
            type="warning"
            showIcon
            message="Y lệnh có cảnh báo an toàn dược:"
            description={
              latest?.results
                .filter((r) => r.outcome !== 'NOT_MATCHED')
                .map((r) => (
                  <div key={r.ruleCode}>
                    • <strong>{r.ruleCode}:</strong> {r.message}
                  </div>
                ))
            }
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Lý do chuyên môn (Bắt buộc nhập giải trình để tiếp tục kê thuốc):
          </label>
          <Input.TextArea
            rows={4}
            maxLength={1000}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Ví dụ: Đã theo dõi chặt chẽ chức năng thận và kali máu, lợi ích điều trị vượt trội nguy cơ, bệnh nhân đồng thuận..."
          />
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            Nội dung giải trình sẽ được lưu vĩnh viễn vào hồ sơ bệnh án và lịch sử cảnh báo an toàn dược (UC06).
          </div>
        </div>
      </Modal>

      {/* Stop Order Modal */}
      <Modal
        open={stopModalOpen}
        title="Xác nhận Ngừng Y lệnh Thuốc"
        okText="Xác nhận ngừng"
        cancelText="Hủy"
        okButtonProps={{ danger: true, disabled: !stopReason.trim() }}
        onOk={handleStopOrder}
        onCancel={() => setStopModalOpen(false)}
        width={500}
      >
        <div style={{ marginBlock: 12 }}>
          <p>
            Bạn có chắc chắn muốn ngừng y lệnh thuốc <strong>{row.medication.name}</strong> không?
          </p>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Lý do ngừng thuốc (Bắt buộc):
          </label>
          <Input.TextArea
            rows={3}
            maxLength={500}
            value={stopReason}
            onChange={(e) => setStopReason(e.target.value)}
            placeholder="Ví dụ: Đạt mục tiêu điều trị, xuất hiện tác dụng phụ, chuyển sang thuốc thay thế..."
          />
        </div>
      </Modal>
    </Card>
  )
}
