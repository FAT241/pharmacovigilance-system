import React, { useState } from 'react'
import { Alert, Button, Card, Col, Input, Row, Space, Tag, Typography } from 'antd'
import type { Order } from './types'
import { AiBotMascot } from '../../../shared/components/MedicalIcons'
import {
  CheckCircleOutlined,
  EditOutlined,
  ReadOutlined,
  RobotOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@ant-design/icons'

export function OrderExplanation({
  row,
  editable,
  busy,
  onSend,
}: {
  row: Order
  editable: boolean
  busy: boolean
  onSend: (action: string, payload: object) => Promise<void>
}) {
  const entry = row.explanation
  const [text, setText] = useState(entry?.draft ?? '')
  const writable = editable && row.status === 'ACTIVE' && entry?.status !== 'APPROVED'

  return (
    <Card
      size="small"
      style={{
        borderRadius: 10,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        marginTop: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space>
          <AiBotMascot size={32} thinking={entry?.status === 'GENERATING'} />
          <div>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>
              Trợ lý AI · Giải thích đơn thuốc cho người bệnh (UC07)
            </strong>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Dựa trên Dược thư Quốc gia Việt Nam & Hướng dẫn sử dụng thuốc an toàn
            </div>
          </div>
        </Space>

        {entry?.status === 'APPROVED' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Đã duyệt bởi Bác sĩ
          </Tag>
        ) : entry?.status === 'DRAFT' ? (
          <Tag color="gold" icon={<EditOutlined />}>
            Bản nháp chờ bác sĩ duyệt
          </Tag>
        ) : entry?.status === 'GENERATING' ? (
          <Tag color="processing" icon={<RobotOutlined />}>
            Đang tạo nội dung...
          </Tag>
        ) : entry?.status === 'FAILED' ? (
          <Tag color="error" icon={<WarningOutlined />}>
            Tạo thất bại
          </Tag>
        ) : (
          <Tag color="default">Chưa khởi tạo</Tag>
        )}
      </div>

      {/* Side-by-side: Source Pharmacopoeia Excerpt vs AI Draft */}
      <Row gutter={[16, 16]}>
        {/* Cột trái: Trích đoạn Dược thư Quốc gia đã kiểm tra */}
        <Col xs={24} md={12}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '12px 14px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#0369a1' }}>
              <ReadOutlined />
              <strong style={{ fontSize: 12 }}>Dữ liệu tham chiếu đã kiểm tra:</strong>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
              {entry?.source || 'Dược thư Quốc gia Việt Nam (2022)'}
            </Typography.Text>
            <div
              style={{
                fontSize: 12.5,
                color: '#334155',
                lineHeight: 1.5,
                fontStyle: 'italic',
                background: '#f1f5f9',
                padding: '8px 10px',
                borderRadius: 6,
                borderLeft: '3px solid #0284c7',
                flex: 1,
              }}
            >
              "{entry?.excerpt || 'Chưa có trích đoạn tham chiếu trong danh mục thuốc.'}"
            </div>
          </div>
        </Col>

        {/* Cột phải: Nội dung giải thích cho bệnh nhân (AI soạn + Bác sĩ sửa) */}
        <Col xs={24} md={12}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '12px 14px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#059669' }}>
              <RobotOutlined />
              <strong style={{ fontSize: 12 }}>Nội dung tư vấn cho bệnh nhân:</strong>
            </div>

            {entry?.status === 'GENERATING' && (
              <Alert
                type="info"
                showIcon
                message="AI đang phân tích và soạn lời dặn..."
                description="Trích xuất thời điểm dùng, lưu ý khi uống và dấu hiệu cần báo bác sĩ."
                style={{ marginBottom: 8 }}
              />
            )}

            {entry?.status === 'FAILED' && (
              <Alert
                type="error"
                showIcon
                message="Chưa tạo được giải thích"
                description={entry.failure || 'Vui lòng bấm Thử lại hoặc nhập trực tiếp.'}
                style={{ marginBottom: 8 }}
              />
            )}

            {entry?.status === 'APPROVED' ? (
              <div
                style={{
                  padding: '10px 12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  color: '#166534',
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  flex: 1,
                }}
              >
                {entry.approvedText}
              </div>
            ) : (
              <Input.TextArea
                readOnly={!writable}
                rows={5}
                maxLength={5000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nội dung lời dặn thân thiện cho người bệnh xem trên cổng tra cứu..."
                style={{ borderRadius: 6, fontSize: 13, flex: 1 }}
              />
            )}

            {entry?.status === 'DRAFT' && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                ⚠️ Bệnh nhân chỉ xem được nội dung này sau khi bạn bấm <strong>Duyệt</strong>.
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Action Buttons */}
      {writable && (
        <Space wrap style={{ marginTop: 12, justifyContent: 'flex-end', width: '100%' }}>
          <Button
            loading={busy}
            icon={<RobotOutlined />}
            onClick={() => onSend('generate', {})}
          >
            {entry ? 'Soạn lại bằng AI' : 'Soạn giải thích bằng AI'}
          </Button>

          {entry?.status === 'DRAFT' && (
            <Button
              icon={<SaveOutlined />}
              disabled={busy || !text.trim() || text === entry.draft}
              onClick={() => onSend('edit', { revision: entry.revision, text })}
            >
              Lưu bản nháp
            </Button>
          )}

          {entry?.status === 'DRAFT' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={busy || !text.trim()}
              onClick={() => onSend('approve', { revision: entry.revision, text })}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Duyệt & Công bố cho bệnh nhân
            </Button>
          )}
        </Space>
      )}
    </Card>
  )
}
