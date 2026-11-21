import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { io as connect, type Socket } from 'socket.io-client'
import { app } from '../src/app'
import { database } from '../src/database'
import { signSession } from '../src/modules/auth/session'
import { attachRuleNotifications } from '../src/modules/drug-safety/rule-events'

function event(socket: Socket, name: string) {
  return new Promise<unknown>(resolve => socket.once(name, resolve))
}

test('only admins change rules, audit and doctor notification follow commit, stale check rejected', { timeout: 15000 }, async () => {
  const server = createServer(app)
  const io = attachRuleNotifications(server)
  const doctor = randomUUID(), admin = randomUUID(), owner = randomUUID(), code = randomUUID()
  const encounter = randomUUID(), patient = randomUUID(), medication = randomUUID(), item = randomUUID()
  const sockets: Socket[] = []
  try {
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
    await database.user.createMany({ data: [
      { id: doctor, username: doctor, fullName: 'BS kiểm thử', role: 'DOCTOR' },
      { id: admin, username: admin, fullName: 'QT kiểm thử', role: 'ADMIN' },
      { id: owner, username: owner, fullName: 'BN kiểm thử', role: 'PATIENT' },
    ] })
    await database.patient.create({ data: { id: patient, userId: owner, patientCode: patient, birthDate: new Date('2000-01-01'), gender: 'OTHER' } })
    await database.encounter.create({ data: { id: encounter, patientId: patient, doctorId: doctor } })
    await database.medication.create({ data: { id: medication, name: 'Kiểm thử', code: medication, strength: 'Mẫu', dosageForm: 'Viên', baseUnit: 'TABLET' } })
    await database.prescriptionItem.create({ data: { id: item, encounterId: encounter, medicationId: medication, dose: 1, doseUnit: 'TABLET',
      schedule: { schemaVersion: 1, type: 'FIXED', timesPerDay: 1 } } })
    await database.alertRule.create({ data: { code, title: 'Luật kiểm thử', condition: { type: 'RECONCILE' } } })
    function connection(user: string) {
      const socket = connect(base + '/rule-changes', { autoConnect: false, forceNew: true, reconnection: false, auth: { token: signSession(user, 0) } })
      sockets.push(socket)
      return socket
    }
    const doctorSocket = connection(doctor), patientSocket = connection(owner)
    const allowed = event(doctorSocket, 'connect'), denied = event(patientSocket, 'connect_error')
    doctorSocket.connect()
    patientSocket.connect()
    await Promise.all([allowed, denied])
    function request(path: string, user: string, method: string, data: object) {
      return fetch(base + '/api' + path, { method, headers: { Authorization: 'Bearer ' + signSession(user, 0), 'Content-Type': 'application/json' },
        body: JSON.stringify(data) })
    }
    const order = '/patients/' + patient + '/encounters/' + encounter + '/orders/' + item
    const chart = '/patients/' + patient + '/encounters/' + encounter
    const adminHeaders = { Authorization: 'Bearer ' + signSession(admin, 0) }
    const monitor = await fetch(base + '/api' + chart + '/clinical', { headers: adminHeaders })
    assert.equal(monitor.status, 200)
    assert.equal((await monitor.json()).record.orders[0].id, item)
    assert.equal((await request(order + '/check', admin, 'POST', { version: 0 })).status, 403)
    assert.equal((await request(chart + '/clinical', admin, 'PATCH', {})).status, 403)
    assert.equal((await request(chart + '/discharge', admin, 'POST', {})).status, 403)
    const check = await (await request(order + '/check', doctor, 'POST', { version: 0 })).json()
    assert.ok(check.id)
    assert.equal((await fetch(base + '/api' + chart + '/checks/' + check.id, { headers: adminHeaders })).status, 200)
    const rule = '/rules/' + code + '/status'
    const suspend = { version: 1, active: false, reason: 'Kiểm tra nguồn luật' }
    assert.equal((await request(rule, doctor, 'PATCH', suspend)).status, 403)
    assert.equal((await request(rule, admin, 'PATCH', { ...suspend, reason: ' ' })).status, 400)
    const notified = event(doctorSocket, 'rule-changed')
    const results = await Promise.all([request(rule, admin, 'PATCH', suspend), request(rule, admin, 'PATCH', suspend)])
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409])
    assert.equal((await notified as { version: number }).version, 2)
    assert.equal(await database.ruleChangeLog.count({ where: { ruleCode: code, active: false, changedBy: admin } }), 1)
    assert.equal((await request(order + '/confirm', doctor, 'POST', { idempotencyKey: randomUUID(), checkId: check.id, reason: 'Kiểm thử' })).status, 409)
    const stale = await database.ruleCheckResult.findUniqueOrThrow({ where: { ruleCheckId_ruleCode: { ruleCheckId: check.id, ruleCode: code } } })
    assert.equal(stale.ruleVersion, 1)
    const next = await (await request(order + '/check', doctor, 'POST', { version: 0 })).json()
    assert.equal(await database.ruleCheckResult.count({ where: { ruleCheckId: next.id, ruleCode: code } }), 0)
    await database.user.update({ where: { id: doctor }, data: { sessionVersion: { increment: 1 } } })
    const disconnected = event(doctorSocket, 'disconnect')
    assert.equal((await request(rule, admin, 'PATCH', { version: 2, active: true, reason: 'Đã rà soát' })).status, 200)
    await disconnected
    assert.equal(await database.ruleChangeLog.count({ where: { ruleCode: code } }), 2)
  } finally {
    for (const socket of sockets) socket.disconnect()
    await io.close()
    await database.$transaction([
      database.encounter.deleteMany({ where: { id: encounter } }), database.ruleChangeLog.deleteMany({ where: { ruleCode: code } }),
      database.alertRule.deleteMany({ where: { code } }), database.medication.deleteMany({ where: { id: medication } }),
      database.patient.deleteMany({ where: { id: patient } }), database.user.deleteMany({ where: { id: { in: [owner, admin, doctor] } } }),
    ])
    await database.$disconnect()
  }
})
