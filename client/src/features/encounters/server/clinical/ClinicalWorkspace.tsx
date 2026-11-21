import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Card,
  Modal,
  Form,
  Input,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  Badge,
  Popconfirm,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  DashboardOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import { ApiError, requestApi } from '../../../server-workspace/api'
import { ClinicalOverview } from './ClinicalOverview'
import { Measurements } from './Measurements'
import { Publication } from './Publication'
import { ProfileForm } from './ProfileForm'
import { MedicationReview } from './MedicationReview'
import { OrdersPanel } from '../../../prescriptions/server/OrdersPanel'
import { CheckHistoryPanel } from '../../../prescriptions/server/history/CheckHistoryPanel'
import type { Change, ClinicalData, ClinicalRecord } from './types'
import { HeartbeatPulseIcon } from '../../../../shared/components/MedicalIcons'

export function ClinicalWorkspace({
  path,
  name,
  doctorId,
  token,
  onExpired,
  onClose,
}: {
  path: string
  name: string
  doctorId?: string
  token: string
  onExpired: () => void
  onClose: () => void
}) {
  const { message } = App.useApp()
  const [data, setData] = useState<ClinicalData>()
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('summary')
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false)
  const [dischargeSaving, setDischargeSaving] = useState(false)
  const [dischargeForm] = Form.useForm()
  const sending = useRef(false)

  function report(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onExpired()
    else setError(cause instanceof Error ? cause.message : 'Không thể đọc hồ sơ điều trị.')
  }

  useEffect(() => {
    let current = true
    requestApi<ClinicalData>(path, token)
      .then((result) => {
        if (current) setData(result)
      })
      .catch((cause) => {
        if (current) report(cause)
      })
    return () => {
      current = false
    }
  }, [path, token, reload])

  useEffect(() => {
    const deadlines = data?.record.orders
      .filter((o) => o.status === 'ACTIVE' && o.endedAt)
      .map((o) => Date.parse(o.endedAt!))
    if (!deadlines?.length) return
    const timer = setTimeout(
      () => setReload((v) => v + 1),
      Math.min(2147483647, Math.max(100, Math.min(...deadlines) - Date.now() + 100)),
    )
    return () => clearTimeout(timer)
  }, [data])

  async function save(change: Change) {
    if (!data || sending.current) return false
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const record = await requestApi<ClinicalRecord>(path, token, 'PATCH', {
        ...change,
        version: data.record.version,
      })
      setData({ ...data, record })
      message.success('Đã lưu thông tin hồ sơ.')
      return true
    } catch (cause) {
      report(cause)
      if (cause instanceof ApiError && cause.status === 409) {
        setData(undefined)
        setReload((v) => v + 1)
      }
      return false
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  const handleDischarge = async () => {
    if (!data) return
    try {
      const values = await dischargeForm.validateFields()
      setDischargeSaving(true)
      const dischargeUrl = path.replace(/\/clinical$/, '/discharge')
      await requestApi(dischargeUrl, token, 'POST', {
        condition: values.condition?.trim(),
        followUp: values.followUp?.trim(),
        version: data.record.version,
      })
      message.success('Đã xác nhận xuất viện và kết thúc các y lệnh nội trú thành công.')
      setDischargeModalOpen(false)
      setReload((v) => v + 1)
    } catch (cause) {
      report(cause)
    } finally {
      setDischargeSaving(false)
    }
  }

  const editable = Boolean(data && !data.record.dischargedAt && data.record.doctorId === doctorId)
  const record = data?.record

  const activeOrdersCount = record?.orders.filter((o) => o.status === 'ACTIVE').length || 0
  const pendingReviewCount = record?.reconciliation.filter((r) => r.decision === 'PENDING').length || 0

  return (
    <div className="clinical-workspace-root page-entrance" style={{ display: 'grid', gap: 16 }}>
      {/* Top Header: Breadcrumbs & Quick Back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Breadcrumb
          items={[
            {
              title: (
                <Button type="link" style={{ padding: 0 }} onClick={onClose} icon={<ArrowLeftOutlined />}>
                  Danh sách bệnh nhân
                </Button>
              ),
            },
            { title: `${name} (${record?.patient.patientCode || '...'})` },
            { title: record?.dischargedAt ? 'Hồ sơ đã xuất viện' : 'Đợt điều trị nội trú' },
          ]}
        />

        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={onClose} disabled={busy}>
            Quay lại danh sách
          </Button>
          {!editable && data && !data.record.dischargedAt && doctorId && (
            <Popconfirm
              title="Tiếp nhận phụ trách bệnh nhân"
              description={`Bệnh nhân hiện do ${data.record.doctor?.fullName || 'bác sĩ khác'} phụ trách. Bạn có chắc muốn tiếp nhận bệnh nhân này về cho mình?`}
              okText="Xác nhận tiếp nhận"
              cancelText="Hủy"
              onConfirm={async () => {
                setBusy(true)
                try {
                  const encounterPath = path.replace(/\/clinical$/, '')
                  await requestApi(encounterPath + '/assign-doctor', token, 'PATCH')
                  message.success('Đã chuyển quyền phụ trách bệnh nhân sang cho bạn!')
                  setReload(v => v + 1)
                } catch (err: any) {
                  message.error(err instanceof Error ? err.message : 'Không chuyển được quyền phụ trách')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Button
                type="primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                loading={busy}
              >
                Tiếp nhận phụ trách bệnh nhân này
              </Button>
            </Popconfirm>
          )}
          {editable && (
            <>
              <Button
                type="primary"
                icon={<MedicineBoxOutlined />}
                onClick={() => setTab('orders')}
                style={{ background: '#0284c7' }}
              >
                Kê đơn thuốc ({activeOrdersCount} đang dùng)
              </Button>
              <Button danger icon={<CheckCircleOutlined />} onClick={() => setDischargeModalOpen(true)}>
                Xuất viện
              </Button>
            </>
          )}
        </Space>
      </div>

      {error && (
        <Alert
          showIcon
          type="error"
          message={error}
          action={
            <Button
              size="small"
              onClick={() => {
                setError('')
                setData(undefined)
                setReload((v) => v + 1)
              }}
            >
              Tải lại
            </Button>
          }
        />
      )}

      {/* Patient Clinical Banner Card */}
      {record && (
        <Card
          bordered={false}
          className="card-hover-lift"
          style={{
            borderRadius: 12,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            {/* Patient Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img
                src="/images/patient-elderly.jpg"
                alt="Avatar bệnh nhân"
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Typography.Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                    {name}
                  </Typography.Title>
                  <Tag color="cyan" style={{ fontWeight: 600, fontSize: 13, borderRadius: 6 }}>
                    Mã BN: {record.patient.patientCode}
                  </Tag>
                  {record.dischargedAt ? (
                    <Tag color="default" icon={<StopOutlined />}>
                      Đã xuất viện ({new Date(record.dischargedAt).toLocaleDateString('vi-VN')})
                    </Tag>
                  ) : (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      Đang điều trị nội trú
                    </Tag>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>Ngày nhập viện: <strong>{new Date(record.admittedAt).toLocaleString('vi-VN')}</strong></span>
                  <span>Bác sĩ phụ trách: <strong>{record.doctor.fullName}</strong></span>
                  {record.patient.historyNote && <span>Tiền sử: <em>{record.patient.historyNote}</em></span>}
                </div>
              </div>
            </div>

            {/* Clinical Alerts / Allergies / Diagnoses Tags */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {record.allergyStatus === 'REPORTED' ? (
                  <Tag color="error" icon={<WarningOutlined />} style={{ fontWeight: 600 }}>
                    Có dị ứng: {record.allergens.map((a) => a.name).join(', ') || 'Đã ghi nhận'}
                  </Tag>
                ) : record.allergyStatus === 'NONE_REPORTED' ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Chưa ghi nhận dị ứng thuốc
                  </Tag>
                ) : (
                  <Tag color="warning" icon={<QuestionCircleOutlined />}>
                    Chưa xác minh dị ứng
                  </Tag>
                )}

                {record.diagnoses.map((d) => (
                  <Tag key={d.code} color="blue" style={{ fontWeight: 500 }}>
                    {d.code} · {d.name}
                  </Tag>
                ))}
              </div>

              <div style={{ fontSize: 12, color: '#64748b' }}>
                Y lệnh hiệu lực: <strong style={{ color: '#0284c7' }}>{activeOrdersCount}</strong> thuốc · Thuốc tại nhà chờ đối chiếu: <strong style={{ color: pendingReviewCount ? '#d97706' : '#059669' }}>{pendingReviewCount}</strong>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Tabs Workspace */}
      {data ? (
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 14px rgba(15,23,42,0.03)' }}>
          <Spin spinning={busy}>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              size="large"
              type="card"
              items={[
                {
                  key: 'summary',
                  label: (
                    <span>
                      <DashboardOutlined /> Tổng quan
                    </span>
                  ),
                  children: (
                    <ClinicalOverview
                      data={data}
                      editable={editable}
                      onSave={save}
                      onNavigate={setTab}
                    />
                  ),
                },
                {
                  key: 'profile',
                  label: (
                    <span>
                      <FileTextOutlined /> Lâm sàng & Tiền sử
                    </span>
                  ),
                  children: <ProfileForm data={data} editable={editable} onSave={save} />,
                },
                {
                  key: 'measurements',
                  label: (
                    <span>
                      <HeartbeatPulseIcon size={16} /> Sinh hiệu & Xét nghiệm
                    </span>
                  ),
                  children: <Measurements data={data} editable={editable} onSave={save} />,
                },
                {
                  key: 'review',
                  label: (
                    <span>
                      <Badge count={pendingReviewCount} size="small" offset={[6, 0]}>
                        <ExperimentOutlined /> Đối chiếu thuốc tại nhà
                      </Badge>
                    </span>
                  ),
                  children: <MedicationReview data={data} editable={editable} onSave={save} />,
                },
                {
                  key: 'orders',
                  label: (
                    <span>
                      <Badge count={activeOrdersCount} size="small" offset={[6, 0]} color="#0284c7">
                        <MedicineBoxOutlined /> Y lệnh & Kê đơn thuốc
                      </Badge>
                    </span>
                  ),
                  children: (
                    <OrdersPanel
                      data={data}
                      editable={editable}
                      path={path}
                      token={token}
                      onUpdate={setData}
                      onExpired={onExpired}
                    />
                  ),
                },
                {
                  key: 'history',
                  label: (
                    <span>
                      <SafetyCertificateOutlined /> Đánh giá & Lịch sử cảnh báo
                    </span>
                  ),
                  children: tab === 'history' && (
                    <CheckHistoryPanel
                      clinicalPath={path}
                      token={token}
                      record={data.record}
                      editable={editable}
                      onExpired={onExpired}
                      onRefresh={setData}
                    />
                  ),
                },
                {
                  key: 'publication',
                  label: (
                    <span>
                      <CommentOutlined /> Dặn dò & Xuất viện
                    </span>
                  ),
                  children: <Publication record={data.record} editable={editable} onSave={save} />,
                },
              ]}
            />
          </Spin>
        </Card>
      ) : (
        !error && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12, color: '#64748b' }}>Đang nạp hồ sơ lâm sàng bệnh nhân...</div>
          </div>
        )
      )}

      {/* Discharge Confirmation Modal */}
      <Modal
        open={dischargeModalOpen}
        title="Xác nhận Xuất viện cho Bệnh nhân"
        okText="Xác nhận xuất viện"
        cancelText="Đóng"
        confirmLoading={dischargeSaving}
        okButtonProps={{ danger: true }}
        onOk={handleDischarge}
        onCancel={() => setDischargeModalOpen(false)}
        width={560}
      >
        <div style={{ marginBlock: 12 }}>
          <Alert
            type="warning"
            showIcon
            message="Lưu ý khi xuất viện:"
            description="Khi xác nhận xuất viện, đợt điều trị sẽ chính thức đóng lại và tất cả các y lệnh thuốc nội trú đang có hiệu lực sẽ tự động kết thúc."
            style={{ marginBottom: 16 }}
          />
          <Form form={dischargeForm} layout="vertical">
            <Form.Item name="condition" label="Tình trạng người bệnh khi xuất viện">
              <Input.TextArea placeholder="Ví dụ: Huyết áp ổn định (125/80 mmHg), hết đau đầu, đường huyết kiểm soát tốt..." rows={3} maxLength={2000} />
            </Form.Item>
            <Form.Item name="followUp" label="Dặn dò tái khám & Thuốc ngoại trú">
              <Input.TextArea placeholder="Ví dụ: Tái khám sau 2 tuần, duy trì chế độ ăn giảm muối, uống thuốc đều đặn theo đơn ngoại trú..." rows={3} maxLength={3000} />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  )
}
