import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { app } from '../src/app'
import { database } from '../src/database'
import { signSession } from '../src/modules/auth/session'

test('concurrent admission, discharge permissions and readmission', async () => {
  const server = app.listen(0, '127.0.0.1')
  const ids = [randomUUID(), randomUUID(), randomUUID()]
  const patientId = randomUUID()
  const medicationId = randomUUID()
  try {
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
    await database.user.createMany({ data: ids.map((id, index) => ({
      id, username: id, fullName: 'Hồ sơ kiểm thử', role: index === 2 ? 'PATIENT' : 'DOCTOR',
    })) })
    await database.patient.create({ data: {
      id: patientId, patientCode: patientId, userId: ids[2], birthDate: new Date('2000-01-01'), gender: 'OTHER',
    } })
    const path = base + '/api/patients/' + patientId + '/encounters'
    function request(user: number, method: string, suffix = '') {
      return fetch(path + suffix, {
        method, headers: { Authorization: 'Bearer ' + signSession(ids[user], 0), 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ admissionNote: 'Kiểm thử' }) : undefined,
      })
    }
    const attempts = await Promise.all([request(0, 'POST'), request(0, 'POST')])
    assert.deepEqual(attempts.map(entry => entry.status).sort(), [201, 409])
    const admitted = await attempts.find(entry => entry.status === 201)!.json()
    const discharge = '/' + admitted.id + '/discharge'
    const clinicalUrl = path + '/' + admitted.id + '/clinical'
    const profile = { action: 'PROFILE', diagnoses: ['I10'], allergyStatus: 'REPORTED', allergens: ['ACEI'], kilograms: 63.25 }
    function change(version: number, data: Record<string, unknown>, user = 0, url = clinicalUrl) {
      return fetch(url, { method: 'PATCH', headers: {
        Authorization: 'Bearer ' + signSession(ids[user], 0), 'Content-Type': 'application/json',
      }, body: JSON.stringify({ ...data, version }) })
    }
    assert.equal((await change(0, profile, 1)).status, 403)
    assert.equal((await change(0, { ...profile, allergens: [] })).status, 400)
    assert.equal((await change(0, { ...profile, diagnoses: ['UNKNOWN'] })).status, 400)
    const updates = await Promise.all([change(0, profile), change(0, profile)])
    assert.deepEqual(updates.map(r => r.status).sort(), [200, 409])
    const saved = await updates.find(r => r.status === 200)!.json()
    assert.equal(saved.weights.length, 1)
    assert.equal(saved.weights[0].kilograms, '63.25')
    await database.medication.create({ data: { id: medicationId, name: 'Thuốc kiểm thử', code: medicationId,
      baseUnit: 'TABLET', strength: 'mô phỏng', dosageForm: 'viên' } })
    const addition = await change(1, { action: 'ADD_MEDICATION', medicationId })
    assert.equal(addition.status, 200)
    const [pending] = (await addition.json()).reconciliation
    assert.equal(pending.decision, 'PENDING')
    assert.equal(pending.draftItem, null)
    const continued = await change(2, { action: 'CONTINUE', reviewId: pending.id, dose: 0.5, timesPerDay: 2 })
    assert.equal(continued.status, 200)
    const [review] = (await continued.json()).reconciliation
    assert.equal(review.draftItem.status, 'DRAFT')
    assert.deepEqual(review.draftItem.schedule, { schemaVersion: 1, type: 'FIXED', timesPerDay: 2 })
    assert.equal((await request(2, 'GET')).status, 403)
    assert.equal((await request(1, 'POST', discharge)).status, 403)
    const closed = await Promise.all([request(0, 'POST', discharge), request(0, 'POST', discharge)])
    assert.deepEqual(closed.map(result => result.status), [200, 200])
    const [a, b] = await Promise.all(closed.map(result => result.json()))
    assert.ok(a.dischargedAt)
    assert.equal(a.dischargedAt, b.dischargedAt)
    assert.equal(b.version, 4)
    assert.equal((await change(4, profile)).status, 409)
    const readmission = await request(1, 'POST')
    assert.equal(readmission.status, 201)
    const nextId = (await readmission.json()).id
    const next = await (await request(1, 'GET', '/' + nextId + '/clinical')).json()
    assert.equal(next.record.allergens[0].code, 'ACEI')
    assert.equal(next.record.weights.length, 0)
    assert.equal(next.record.reconciliation[0].decision, 'PENDING')
    assert.equal((await change(0, { action: 'STOP', reviewId: next.record.reconciliation[0].id },
      1, path + '/' + nextId + '/clinical')).status, 200)
    assert.ok((await database.patientMedication.findFirstOrThrow({ where: { patientId } })).endedAt)
    const history = await (await request(1, 'GET')).json()
    assert.equal(history.length, 2)
    assert.equal(history[0].dischargedAt, null)
    assert.equal(history[1].id, admitted.id)
  } finally {
    server.close()
    await database.$transaction([
      database.encounter.deleteMany({ where: { patientId } }),
      database.patientMedication.deleteMany({ where: { patientId } }),
      database.medication.deleteMany({ where: { id: medicationId } }),
      database.patient.deleteMany({ where: { id: patientId } }),
      database.user.deleteMany({ where: { id: { in: ids } } }),
    ])
    await database.$disconnect()
  }
})
