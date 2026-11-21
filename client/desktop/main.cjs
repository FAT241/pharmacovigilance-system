const { app, BrowserWindow, dialog } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

function resolveServerUrl() {
  // 1. Tham số dòng lệnh: --server=http://...
  const arg = process.argv.find(a => a.startsWith('--server='))
  if (arg) {
    return arg.split('=')[1].trim()
  }

  // 2. Biến môi trường
  if (process.env.DACS4_SERVER_URL) {
    return process.env.DACS4_SERVER_URL.trim()
  }

  // 3. File config.json đặt cạnh file chạy (.exe) hoặc thư mục ứng dụng
  const candidates = [
    path.join(path.dirname(process.execPath), 'config.json'),
    path.join(__dirname, 'config.json'),
    path.join(process.cwd(), 'config.json'),
  ]

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'))
        if (data && typeof data.serverUrl === 'string' && data.serverUrl.trim().length > 0) {
          return data.serverUrl.trim()
        }
      } catch (err) {
        console.error('Không đọc được config.json:', err)
      }
    }
  }

  // 4. Mặc định chạy cục bộ
  const port = process.argv.includes('--built') ? 3000 : 5173
  return 'http://127.0.0.1:' + port
}

function saveWorkingUrl(url) {
  try {
    const cleanUrl = url.replace(/\/$/, '')
    const targetConfig = path.join(path.dirname(process.execPath), 'config.json')
    const localConfig = path.join(__dirname, 'config.json')
    const configPath = fs.existsSync(targetConfig) ? targetConfig : localConfig
    const payload = {
      serverUrl: cleanUrl,
      updatedAt: new Date().toISOString(),
      note: 'Địa chỉ máy chủ DACS4 đang kết nối'
    }
    fs.writeFileSync(configPath, JSON.stringify(payload, null, 2), 'utf8')
  } catch (err) {
    console.error('Không thể lưu config:', err)
  }
}

function openWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    title: 'DACS4 · Hệ thống Kê đơn & Cảnh giác Dược',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Phím tắt làm mới (Hot Reloading / Evolution update): F5, Ctrl+R, Ctrl+Shift+R
  window.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r')) {
      if (input.shift) {
        window.webContents.reloadIgnoringCache()
      } else {
        window.webContents.reload()
      }
    }
  })

  const rawUrl = resolveServerUrl()
  const targetUrl = rawUrl.endsWith('/') ? rawUrl : rawUrl + '/'

  function showConnectFallback(failedUrl) {
    const connectPage = path.join(__dirname, 'connect.html')
    if (fs.existsSync(connectPage)) {
      void window.loadFile(connectPage, { query: { url: failedUrl } })
    } else {
      dialog.showErrorBox(
        'DACS4 - Lỗi kết nối máy chủ',
        `Không thể kết nối đến máy chủ tại:\n${failedUrl}\n\n` +
        `Gợi ý: Kiểm tra máy chủ Host đã bật chưa và nhập lại URL trong config.json.`
      )
    }
  }

  // Khi tải trang thất bại (mạng đứt, link đổi)
  window.webContents.on('did-fail-load', (_event, _errorCode, _errorDescription, validatedURL) => {
    if (validatedURL && !validatedURL.startsWith('file://')) {
      showConnectFallback(validatedURL)
    }
  })

  // Khi kết nối thành công đến máy chủ từ xa -> tự động lưu lại vào config.json
  window.webContents.on('did-finish-load', () => {
    const current = window.webContents.getURL()
    if (current && (current.startsWith('http://') || current.startsWith('https://'))) {
      const u = new URL(current)
      if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') {
        saveWorkingUrl(u.origin)
      }
    }
  })

  void window.loadURL(targetUrl).catch(() => {
    showConnectFallback(targetUrl)
  })
}

app.whenReady().then(openWindow)
app.on('window-all-closed', () => app.quit())

