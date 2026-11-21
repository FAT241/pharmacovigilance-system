import { EventEmitter } from 'node:events'
import type { Server as HttpServer } from 'node:http'
import type { RuleChangeLog } from '@prisma/client'
import { Server } from 'socket.io'
import { authenticatedAccount } from '../auth/session'

export const ruleChanges = new EventEmitter()

export function attachRuleNotifications(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })
  const doctors = io.of('/rule-changes')
  doctors.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    try {
      if (typeof token !== 'string') throw new Error()
      await authenticatedAccount(token, 'DOCTOR')
      next()
    } catch { next(new Error('Phiên bác sĩ không hợp lệ.')) }
  })
  async function notify(change: RuleChangeLog) {
    for (const socket of doctors.sockets.values()) {
      try {
        await authenticatedAccount(socket.handshake.auth.token, 'DOCTOR')
        socket.emit('rule-changed', { id: change.id, code: change.ruleCode, title: change.ruleTitle, version: change.version,
          active: change.active, reason: change.reason, changedAt: change.changedAt })
      } catch { socket.disconnect(true) }
    }
  }
  ruleChanges.on('changed', notify)
  server.once('close', () => ruleChanges.off('changed', notify))
  return io
}
