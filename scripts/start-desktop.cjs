const path = require('node:path')
const net = require('node:net')
const fs = require('node:fs')
const { spawn, spawnSync } = require('node:child_process')
const { once } = require('node:events')
const { setTimeout: delay } = require('node:timers/promises')

const root = path.resolve(__dirname, '..')
const healthUrl = 'http://127.0.0.1:3000/api/health'
let api

async function reachable(host, port) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port })
    function finish(value) { socket.destroy(); resolve(value) }
    socket.setTimeout(1500, () => finish(false))
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })
}
async function healthy() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1200) })
    return response.ok && (await response.json()).application === 'dacs4'
  } catch { return false }
}
async function start() {
  if (!fs.existsSync(path.join(root, 'client/dist/index.html'))) throw Error('Hãy chạy npm run build trước lần mở đầu tiên.')
  const db = new URL(process.env.DATABASE_URL)
  const port = Number(db.port || 5432)
  if (!await reachable(db.hostname, port)) {
    const { DACS4_PG_DATA: data, DACS4_PG_CTL: executable } = process.env
    if (!data || !executable || !['localhost', '127.0.0.1'].includes(db.hostname)) {
      throw Error('Hãy khởi động PostgreSQL theo DATABASE_URL trong .env rồi mở lại ứng dụng.')
    }
    const result = spawnSync(executable, ['start', '-w', '-D', data, '-l', path.join(path.dirname(data), 'dacs4-postgres.log'),
      '-o', '-h 127.0.0.1 -p ' + port], { stdio: 'inherit', windowsHide: true })
    if (result.status !== 0) throw Error('Không khởi động được cụm PostgreSQL của DACS4.')
  }
  if (!await healthy()) {
    if (await reachable('127.0.0.1', 3000)) throw Error('Cổng 3000 đang bận. Hãy đóng tiến trình đang dùng cổng trước khi chạy DACS4.')
    api = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: path.join(root, 'server'), stdio: 'inherit', windowsHide: true })
    for (let attempt = 0; attempt < 100 && !await healthy(); attempt++) {
      if (api.exitCode !== null) throw Error('API đã dừng khi khởi động.')
      await delay(150)
    }
    if (!await healthy()) throw Error('API DACS4 chưa sẵn sàng.')
  }
  const desktop = spawn(require('electron'), [path.join(root, 'client/desktop/main.cjs'), '--built'], { stdio: 'inherit' })
  const [code] = await once(desktop, 'exit')
  process.exitCode = code ?? 1
}
function releaseApi() { if (api && api.exitCode === null) api.kill() }
process.on('exit', releaseApi)
process.once('SIGINT', () => process.exit(130))
start().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(releaseApi)
