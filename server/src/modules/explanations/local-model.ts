import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { completeExplanation, type Regimen } from './completion'
let running = false
async function availablePort() {
  const socket = createServer()
  socket.listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const address = socket.address()
  await new Promise<void>(resolve => socket.close(() => resolve()))
  if (!address || typeof address === 'string') throw Error('Không cấp được cổng AI.')
  return address.port
}

export async function generateDraft(regimen: Regimen, excerpt: string) {
  if (process.env.DACS4_AI_HTTPS_ENDPOINT) {
    const endpoint = new URL(process.env.DACS4_AI_HTTPS_ENDPOINT)
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || !process.env.DACS4_AI_MODEL) {
      throw Error('Cần cấu hình endpoint HTTPS và tên mô hình AI trên máy chủ.')
    }
    return completeExplanation(endpoint.href, process.env.DACS4_AI_MODEL, process.env.DACS4_AI_KEY, regimen, excerpt)
  }
  if (running) throw Error('AI đang soạn nội dung khác. Vui lòng thử lại.')
  running = true
  try {
    const base = join(process.env.LOCALAPPDATA ?? '', 'DACS4', 'ai')
    const exe = process.env.DACS4_AI_EXECUTABLE || join(base, 'b12602', 'llama-server.exe')
    const model = process.env.DACS4_AI_MODEL_FILE || join(base, 'qwen2.5-0.5b-instruct-q4_k_m.gguf')
    try { await Promise.all([access(exe), access(model)]) } catch { throw Error('Chưa cài mô hình AI cục bộ cho DACS4.') }
    const port = await availablePort(), key = randomUUID()
    const host = 'http://127.0.0.1:' + port
    const child = spawn(exe, ['-m', model, '--host', '127.0.0.1', '--port', String(port), '--api-key', key,
      '--alias', 'dacs4', '-c', '4096', '-t', '4', '-np', '1'], { stdio: 'ignore', windowsHide: true })
    let failed = false
    child.on('error', () => { failed = true })
    const stop = () => { if (child.exitCode === null && !child.killed) child.kill() }
    process.once('exit', stop)
    const headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }
    try {
      let ready = false
      for (let i = 0; i < 80; i++) {
        if (failed || child.exitCode !== null) break
        ready = await fetch(host + '/health', { headers, signal: AbortSignal.timeout(800) }).then(r => r.ok).catch(() => false)
        if (ready) break
        await delay(250)
      }
      if (!ready) throw Error('Mô hình AI chưa khởi động được.')
      return await completeExplanation(host + '/v1/chat/completions', 'dacs4', key, regimen, excerpt)
    } finally { process.removeListener('exit', stop); stop() }
  } finally { running = false }
}
