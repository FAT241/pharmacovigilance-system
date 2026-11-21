const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const electronDist = path.join(root, 'node_modules/electron/dist')
const outputDir = path.join(root, 'release/DACS4-Desktop')

if (!fs.existsSync(electronDist)) {
  console.error('Không tìm thấy node_modules/electron/dist. Hãy chạy npm install trước.')
  process.exit(1)
}

console.log('--- Đang đóng gói DACS4 Desktop Client ---')

// 1. Tạo thư mục output
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true })
}
fs.mkdirSync(outputDir, { recursive: true })

// 2. Sao chép toàn bộ thư viện electron runtime
console.log('1. Đang sao chép nhân Electron runtime...')
fs.cpSync(electronDist, outputDir, { recursive: true })

// 3. Đổi tên electron.exe thành DACS4.exe
const oldExe = path.join(outputDir, 'electron.exe')
const newExe = path.join(outputDir, 'DACS4.exe')
if (fs.existsSync(oldExe)) {
  fs.renameSync(oldExe, newExe)
}

// 4. Xóa default_app.asar nếu có để dùng app tùy chỉnh
const defaultAsar = path.join(outputDir, 'resources/default_app.asar')
if (fs.existsSync(defaultAsar)) {
  fs.unlinkSync(defaultAsar)
}

// 5. Tạo thư mục resources/app
const appDir = path.join(outputDir, 'resources/app')
fs.mkdirSync(appDir, { recursive: true })

// 6. Ghi package.json cho app
fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify({ name: 'dacs4-desktop', version: '1.0.0', main: 'main.cjs' }, null, 2),
  'utf8'
)

// 7. Sao chép main.cjs và connect.html
fs.copyFileSync(
  path.join(root, 'client/desktop/main.cjs'),
  path.join(appDir, 'main.cjs')
)
if (fs.existsSync(path.join(root, 'client/desktop/connect.html'))) {
  fs.copyFileSync(
    path.join(root, 'client/desktop/connect.html'),
    path.join(appDir, 'connect.html')
  )
}

// 8. Tạo config.json mặc định trỏ tới IP host (192.168.6.75:3000 hoặc Radmin 26.70.22.0:3000)
const defaultServerUrl = process.argv[2] || 'http://192.168.6.75:3000'
const configContent = JSON.stringify({
  serverUrl: defaultServerUrl,
  note: 'Thay đổi serverUrl thành địa chỉ IP của máy chủ nếu cần thiết (ví dụ: http://192.168.6.75:3000 hoặc VPN http://26.70.22.0:3000)'
}, null, 2)

// Đặt config.json ngay bên cạnh DACS4.exe để người dùng dễ mở Notepad sửa
fs.writeFileSync(path.join(outputDir, 'config.json'), configContent, 'utf8')
fs.writeFileSync(path.join(appDir, 'config.json'), configContent, 'utf8')

// 9. Tạo file hướng dẫn người dùng
const guideText = `=====================================================
 HỆ THỐNG KÊ ĐƠN NỘI TRÚ & CẢNH GIÁC DƯỢC (DACS4)
 Phiên bản Desktop Client độc lập
=====================================================

HƯỚNG DẪN SỬ DỤNG CHO MÁY KHÁCH:
1. Mở file "DACS4.exe" để bắt đầu sử dụng.
2. Nếu máy chủ đổi địa chỉ IP hoặc mạng Wi-Fi khác:
   - Mở file "config.json" bằng Notepad.
   - Sửa "serverUrl" thành IP mới của máy chủ (ví dụ: "http://192.168.x.x:3000").
   - Lưu lại và mở lại DACS4.exe.

YÊU CẦU:
- Máy chủ (Host) đã khởi động hệ thống DACS4.
- Máy này và máy chủ kết nối chung mạng Wi-Fi/LAN hoặc chung phòng Radmin VPN.
`
fs.writeFileSync(path.join(outputDir, 'HUONG_DAN_SU_DUNG.txt'), guideText, 'utf8')

// 10. Tạo file Chay-DACS4.bat tiện lợi
const batScript = `@echo off
start "" "%~dp0DACS4.exe"
`
fs.writeFileSync(path.join(outputDir, 'Chay-DACS4.bat'), batScript, 'utf8')

console.log(' Đóng gói thành công!')
console.log(` Thư mục xuất ra: ${outputDir}`)
console.log(` Cấu hình máy chủ trỏ về: ${defaultServerUrl}`)
