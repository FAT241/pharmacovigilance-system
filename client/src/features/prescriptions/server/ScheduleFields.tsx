import { Form, InputNumber, Select } from 'antd'

export function ScheduleFields() {
  return <>
    <Form.Item name="timesPerDay" label="Số lần mỗi ngày" rules={[{ required: true }]}><InputNumber min={1} max={24} precision={0} /></Form.Item>
    <Form.Item name="slots" label="Buổi dùng thuốc (nếu chỉ định)" dependencies={['timesPerDay']} rules={[
      ({ getFieldValue }) => ({ validator: (_, slots?: string[]) => !slots?.length || slots.length === getFieldValue('timesPerDay')
        ? Promise.resolve() : Promise.reject(new Error('Số buổi đã chọn phải bằng số lần mỗi ngày.')) }),
    ]}><Select mode="multiple" allowClear options={['Sáng','Trưa','Chiều','Tối'].map(value => ({ value }))} /></Form.Item>
  </>
}
