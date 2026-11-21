import { useState, useMemo } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  MedicineBoxOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  FileTextOutlined,
  SaveOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { ScheduleFields } from '../../../prescriptions/server/ScheduleFields'
import type { ClinicalData, DrugReview, SaveChange } from './types'

export function MedicationReview({
  data,
  editable,
  onSave,
}: {
  data: ClinicalData
  editable: boolean
  onSave: SaveChange
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [stopping, setStopping] = useState<DrugReview>()
  const [reason, setReason] = useState('')
  const [continuing, setContinuing] = useState<DrugReview>()
  const [outsideNote, setOutsideNote] = useState(data.record.patient.historyNote || '')
  const [savingNote, setSavingNote] = useState(false)
  const [adding, setAdding] = useState(false)

  const [form] = Form.useForm<{ dose: number; timesPerDay: number }>()

  // Chuẩn bị danh sách thuốc với nhãn sạch sẽ (Tên biệt dược, hoạt chất, hàm lượng, dạng bào chế)
  const medicationOptions = useMemo(() => {
    return data.medications.map((m) => {
      const ingredients = m.activeIngredients?.map((a) => a.ingredient.name).join(', ')
      const label = `${m.name}${m.strength ? ' · ' + m.strength : ''}${
        ingredients ? ' (' + ingredients + ')' : ''
      } · ${m.dosageForm || 'Dạng uống'}`

      const searchStr = `${m.name} ${m.strength || ''} ${ingredients || ''} ${m.code}`.toLowerCase()

      return {
        value: m.id,
        label,
        searchStr,
      }
    })
  }, [data.medications])

  const pendingCount = data.record.reconciliation.filter((row) => row.decision === 'PENDING').length

  // Xử lý thêm nhiều thuốc đã chọn cùng lúc
  async function handleAddMedications() {
    if (!selectedIds.length) return
    setAdding(true)
    try {
      const ok = await onSave({
        action: 'ADD_MEDICATIONS_BATCH',
        medicationIds: selectedIds,
      })
      if (ok) {
        message.success(`Đã ghi nhận thành công ${selectedIds.length} thuốc vào danh sách đối chiếu!`)
        setSelectedIds([])
      }
    } catch (err: any) {
      message.error(err instanceof Error ? err.message : 'Không thêm được thuốc')
    } finally {
      setAdding(false)
    }
  }

  // Xử lý lưu ghi chú thuốc ngoài danh mục / thực phẩm chức năng
  async function handleSaveOutsideNote() {
    setSavingNote(true)
    try {
      const ok = await onSave({
        action: 'PROFILE',
        historyNote: outsideNote.trim(),
        conditions: data.record.patient.conditions.map((c) => c.code),
        diagnoses: data.record.diagnoses.map((d) => d.code),
        allergyStatus: data.record.allergyStatus,
        allergens: data.record.allergens.map((a) => a.code),
      })
      if (ok) {
        message.success('Đã lưu ghi chú thuốc ngoài danh mục & tiền sử dùng thuốc.')
      }
    } catch (err: any) {
      message.error(err instanceof Error ? err.message : 'Không lưu được ghi chú')
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {pendingCount > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`Còn ${pendingCount} thuốc tại nhà đang chờ bác sĩ đối chiếu`}
          description="Bác sĩ vui lòng chọn 'Tiếp tục' (để chuyển thành y lệnh nội trú) hoặc 'Ngừng' (nếu tạm hoãn điều trị thuốc này trong đợt nằm viện)."
        />
      )}

      {/* 1. Thanh tìm kiếm thông minh AutoComplete / Chọn nhiều thuốc cùng lúc */}
      {editable && (
        <Card
          size="small"
          title={
            <Space>
              <img src="/images/nav-meds.gif" width={20} height={20} style={{ verticalAlign: 'middle' }} alt="" />
              <span>Ghi nhận thuốc bệnh nhân đang dùng ở nhà (Khai thác lúc nhập viện)</span>
            </Space>
          }
          style={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
        >
          <div style={{ marginBottom: 6 }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Gõ tìm kiếm thông minh theo tên biệt dược, hoạt chất hoặc hàm lượng. Có thể chọn cùng lúc nhiều thuốc:
            </Typography.Text>
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              id="home-medication"
              mode="multiple"
              style={{ flex: 1 }}
              showSearch
              allowClear
              maxTagCount="responsive"
              placeholder="Gõ tìm theo tên thuốc hoặc hoạt chất (VD: Amlor, Amlodipin, Glucophage, Metformin...)"
              value={selectedIds}
              onChange={setSelectedIds}
              options={medicationOptions}
              filterOption={(input, option) =>
                Boolean(option && (option as any).searchStr?.includes(input.toLowerCase().trim()))
              }
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={selectedIds.length === 0}
              loading={adding}
              onClick={handleAddMedications}
              style={{ background: '#0284c7' }}
            >
              Ghi nhận {selectedIds.length > 0 ? `(${selectedIds.length} thuốc)` : ''}
            </Button>
          </Space.Compact>
        </Card>
      )}

      {/* 2. Danh sách thuốc tại nhà cần đối chiếu */}
      <Card
        title={
          <Space>
            <MedicineBoxOutlined style={{ color: '#0284c7' }} />
            <span>Danh sách đối chiếu thuốc đợt này ({data.record.reconciliation.length})</span>
          </Space>
        }
        style={{ borderRadius: 10 }}
      >
        <List
          dataSource={data.record.reconciliation}
          locale={{ emptyText: 'Chưa có thuốc nào được ghi nhận cho đợt này' }}
          renderItem={(row) => {
            const drug = row.homeMedication.medication
            const draft = row.draftItem
            const isPending = row.decision === 'PENDING'
            const isContinue = row.decision === 'CONTINUE'
            const isStop = row.decision === 'STOP'

            return (
              <List.Item
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  marginBottom: 8,
                  background: isPending ? '#fffbeb' : '#ffffff',
                  border: isPending ? '1px solid #fef3c7' : '1px solid #f1f5f9',
                }}
                actions={[
                  isPending && editable && (
                    <Space wrap key="actions">
                      <Button
                        type="primary"
                        disabled={!drug.active}
                        icon={<CheckCircleOutlined />}
                        onClick={() => setContinuing(row)}
                        style={{ background: '#059669', borderColor: '#059669' }}
                      >
                        Tiếp tục dùng trong viện
                      </Button>
                      <Button
                        danger
                        icon={<StopOutlined />}
                        onClick={() => {
                          setReason('')
                          setStopping(row)
                        }}
                      >
                        Tạm ngừng
                      </Button>
                      <Popconfirm
                        title="Xóa dòng thuốc tại nhà"
                        description={`Bạn có chắc muốn xóa thuốc "${drug.name}" khỏi danh sách đối chiếu?`}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onSave({ action: 'REMOVE_MEDICATION', reviewId: row.id })}
                      >
                        <Button type="text" danger icon={<DeleteOutlined />}>
                          Xóa
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                ].filter(Boolean)}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Typography.Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                      {drug.name}
                    </Typography.Text>
                    {drug.strength && (
                      <Tag color="blue" style={{ fontWeight: 600 }}>
                        {drug.strength}
                      </Tag>
                    )}
                    {isPending && <Tag color="warning">Chờ đối chiếu</Tag>}
                    {isContinue && (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        Đã chuyển thành Y lệnh nội trú
                      </Tag>
                    )}
                    {isStop && (
                      <Tag color="error" icon={<StopOutlined />}>
                        Đã tạm ngừng
                      </Tag>
                    )}
                  </div>

                  <div style={{ color: '#475569', fontSize: 13 }}>
                    {isStop && (
                      <span>
                        Lý do ngừng: <em>{row.stopReason || 'Theo chỉ định của bác sĩ điều trị'}</em>
                      </span>
                    )}
                    {isContinue && draft && (
                      <span>
                        Chế độ liều: <strong>{draft.dose}</strong> {draft.doseUnit === 'ML' ? 'mL' : 'viên'}/lần ·{' '}
                        <strong>{draft.schedule.timesPerDay}</strong> lần/ngày (
                        {{
                          DRAFT: 'Y lệnh nháp',
                          ACTIVE: 'Đang hiệu lực',
                          ENDED: 'Đã kết thúc',
                          REPLACED: 'Đã thay thế',
                        }[draft.status] || draft.status}
                        )
                      </span>
                    )}
                    {isPending && (
                      <span style={{ color: '#d97706' }}>
                        Bệnh nhân đang dùng tại nhà trước khi nhập viện. Vui lòng quyết định tiếp tục hay tạm ngừng.
                      </span>
                    )}
                  </div>
                </Space>
              </List.Item>
            )
          }}
        />
      </Card>

      {/* 3. Ô ghi chú thuốc ngoài danh mục, thực phẩm chức năng & thuốc gia truyền */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: '#d97706' }} />
            <span>Thuốc ngoài danh mục bệnh viện, Thực phẩm chức năng & Thuốc gia truyền</span>
          </Space>
        }
        extra={
          editable && (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={savingNote}
              onClick={handleSaveOutsideNote}
            >
              Lưu ghi chú
            </Button>
          )
        }
        style={{ borderRadius: 10, border: '1px solid #fed7aa', background: '#fffbeb' }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          Dành cho các loại thuốc bệnh nhân mua ngoài không có trong danh mục kho viện, thuốc nam, cao đơn hoàn tán,
          thực phẩm bảo vệ sức khỏe hoặc thói quen dùng thảo dược. Ghi chú này sẽ lưu vào Tiền sử bệnh nhân để toàn bộ
          khoa cùng theo dõi:
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          maxLength={3000}
          showCount
          disabled={!editable}
          value={outsideNote}
          onChange={(e) => setOutsideNote(e.target.value)}
          placeholder="Ví dụ: Bệnh nhân đang uống thêm viên sủi bổ não Ginkgo Biloba 1 viên/ngày, trà hoa cúc hạ áp, thuốc sắc gia truyền trị đau khớp..."
        />
      </Card>

      {/* Modal Ngừng thuốc */}
      {stopping && (
        <Modal
          open
          title={`Xác nhận ngừng thuốc · ${stopping.homeMedication.medication.name}`}
          okText="Xác nhận tạm ngừng"
          cancelText="Hủy"
          okButtonProps={{ danger: true, disabled: !reason.trim() }}
          onCancel={() => setStopping(undefined)}
          onOk={async () => {
            if (await onSave({ action: 'STOP', reviewId: stopping.id, reason: reason.trim() })) {
              setStopping(undefined)
              message.success('Đã ghi nhận tạm ngừng thuốc.')
            }
          }}
        >
          <div style={{ marginTop: 10 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Lý do tạm ngừng thuốc tại nhà (Bắt buộc):
            </label>
            <Input.TextArea
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Tạm ngừng để chuẩn bị nội soi/phẫu thuật, Thay thế bằng phác đồ khác hiệu quả hơn, Tương tác với phác đồ nội trú..."
            />
          </div>
        </Modal>
      )}

      {/* Modal Tiếp tục dùng thuốc & Tạo Y lệnh nháp */}
      {continuing && (
        <Modal
          open
          title={`Tiếp tục dùng thuốc · ${continuing.homeMedication.medication.name}`}
          okText="Tạo y lệnh nháp"
          cancelText="Hủy"
          onOk={() => form.submit()}
          onCancel={() => setContinuing(undefined)}
        >
          <Form
            layout="vertical"
            form={form}
            initialValues={{ route: 'Uống', dose: 1, timesPerDay: 1 }}
            preserve={false}
            onFinish={async (values) => {
              if (await onSave({ action: 'CONTINUE', reviewId: continuing.id, ...values })) {
                setContinuing(undefined)
                message.success('Đã chuyển thuốc tại nhà thành Y lệnh nháp nội trú thành công!')
              }
            }}
          >
            <Form.Item name="dose" label="Liều mỗi lần" rules={[{ required: true, message: 'Nhập liều mỗi lần' }]}>
              <InputNumber
                min={0.0001}
                max={99999999}
                precision={2}
                style={{ width: '100%' }}
                addonAfter={continuing.homeMedication.medication.baseUnit === 'ML' ? 'mL' : 'viên'}
              />
            </Form.Item>
            <Form.Item name="route" label="Đường dùng" rules={[{ required: true }]}>
              <Select options={['Uống', 'Ngậm dưới lưỡi', 'Qua ống thông', 'Tiêm bắp', 'Tiêm dưới da'].map((value) => ({ value }))} />
            </Form.Item>
            <Form.Item name="durationDays" label="Số ngày dùng (Để trống nếu dùng liên tục trong đợt)">
              <InputNumber min={1} max={365} precision={0} style={{ width: '100%' }} placeholder="VD: 7" />
            </Form.Item>
            <ScheduleFields />
          </Form>
        </Modal>
      )}
    </Space>
  )
}
