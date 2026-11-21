import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { app } from '../src/app'
import { database } from '../src/database'
import { signSession } from '../src/modules/auth/session'
import { readContext } from '../src/modules/prescriptions/context'
import { runChecks } from '../src/modules/prescriptions/engine'

test('persist checks, override once, replace one active item and discharge', async () => {
  const server = app.listen(0, '127.0.0.1')
  const doctor = randomUUID(), patientUser = randomUUID(), patientId = randomUUID(), id = randomUUID()
  const drug = randomUUID(), ingredient = randomUUID()
  try {
    await once(server, 'listening')
    await database.user.createMany({ data: [
      { id: doctor, username: doctor, fullName: 'Kiểm thử', role: 'DOCTOR' },
      { id: patientUser, username: patientUser, fullName: 'Kiểm thử', role: 'PATIENT' },
    ] })
    await database.patient.create({ data: { id: patientId, patientCode: patientId, userId: patientUser, birthDate: new Date('2000-01-01'), gender: 'OTHER' } })
    await database.encounter.create({ data: { id, patientId, doctorId: doctor } })
    await database.medication.create({ data: {
      id: drug, name: 'Mẫu thử', code: drug, baseUnit: 'TABLET', dosageForm: 'viên', strength: 'mô phỏng',
      activeIngredients: { create: { amount: 10, ingredient: { create: { id: ingredient, name: ingredient, nameKey: ingredient } } } },
    } })
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api/patients/' + patientId + '/encounters/' + id
    function call(path: string, body: object, method = 'POST', user = doctor) {
      return fetch(base + path, { method, headers: { Authorization: 'Bearer ' + signSession(user, 0), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    const values = { medicationId: drug, dose: 1, timesPerDay: 2 }
    function history(path: string, user = doctor) {
      return fetch(base + path, { headers: { Authorization: 'Bearer ' + signSession(user, 0) } })
    }
    assert.equal((await history('/checks', patientUser)).status, 403)
    assert.deepEqual(await (await history('/checks')).json(), { rows: [], next: null })
    assert.equal((await call('/checks', { version: 0, trigger: 'ADMISSION' })).status, 409)
    assert.equal((await call('/orders', { ...values, version: 0 }, 'POST', patientUser)).status, 403)
    assert.equal((await call('/orders', { ...values, version: 0 })).status, 201)
    const first = await database.prescriptionItem.findFirstOrThrow({ where: { encounterId: id } })
    const url = '/orders/' + first.id
    const check = async (url: string, version: number) => {
      const response = await call(url + '/check', { version })
      assert.equal(response.status, 201)
      return response.json() as Promise<{ id: string; status: string }>
    }
    const initial = await check(url, 1)
    assert.equal(initial.status, 'INSUFFICIENT_DATA')
    assert.equal((await call(url + '/confirm', { idempotencyKey: randomUUID(), checkId: initial.id, reason: ' ' })).status, 400)
    assert.equal((await call(url, { ...values, dose: 2, version: 1 }, 'PUT')).status, 200)
    const changed = await database.ruleCheck.findFirstOrThrow({ where: { itemId: first.id, encounterVersion: 2 } })
    assert.equal((await call(url + '/confirm', { idempotencyKey: randomUUID(), checkId: initial.id, reason: 'kiểm thử' })).status, 409)
    await database.medication.update({ where: { id: drug }, data: { strength: 'mới' } })
    assert.equal((await call(url + '/confirm', { idempotencyKey: randomUUID(), checkId: changed.id, reason: 'kiểm thử' })).status, 409)
    const final = await check(url, 2)
    const confirm = { idempotencyKey: randomUUID(), checkId: final.id, reason: 'Đã đối chiếu hồ sơ mô phỏng' }
    const repeated = await Promise.all([call(url + '/confirm', confirm), call(url + '/confirm', confirm)])
    assert.deepEqual(repeated.map(r => r.status), [200, 200])
    assert.deepEqual(await repeated[0].json(), await repeated[1].json())
    assert.equal((await call(url + '/confirm', { ...confirm, reason: 'khác' })).status, 409)
    assert.equal((await call('/clinical', { action: 'PROFILE', version: 3, diagnoses: [], allergens: [], allergyStatus: 'NONE_REPORTED' }, 'PATCH')).status, 200)

    assert.equal((await call('/orders', { ...values, version: 4 })).status, 201)
    const second = await database.prescriptionItem.findFirstOrThrow({ where: { encounterId: id, status: 'DRAFT' } })
    const secondUrl = '/orders/' + second.id
    const warning = await check(secondUrl, 5)
    assert.equal(warning.status, 'HAS_ALERT')
    assert.equal((await call(secondUrl + '/confirm', { idempotencyKey: randomUUID(), checkId: warning.id })).status, 400)
    assert.equal((await call(secondUrl + '/confirm', { idempotencyKey: randomUUID(), checkId: warning.id, reason: 'kiểm thử' })).status, 200)

    assert.equal((await call('/orders', { ...values, version: 6, replacesItemId: first.id })).status, 201)
    const replacement = await database.prescriptionItem.findFirstOrThrow({ where: { encounterId: id, status: 'DRAFT' } })
    const replacementUrl = '/orders/' + replacement.id
    assert.equal((await call('/checks', { version: 6, trigger: 'ADMISSION' })).status, 409)
    const evaluated = await call('/checks', { version: 7, trigger: 'CLINICAL_CHANGE' })
    assert.equal(evaluated.status, 201)
    const assessment = await evaluated.json()
    assert.equal(assessment.status, 'HAS_ALERT')
    assert.equal(assessment.itemId, null)
    assert.equal(assessment.encounterVersion, 7)
    const historical = await (await history('/checks/' + assessment.id)).json()
    assert.deepEqual(new Set(historical.contextSnapshot.orders.map((o: { id: string }) => o.id)), new Set([first.id, second.id]))
    const overlap = historical.results.find((r: { ruleCode: string }) => r.ruleCode === 'DUPLICATE')
    assert.equal(overlap.outcome, 'MATCHED')
    assert.deepEqual(new Set(overlap.evidence.orderIds), new Set([first.id, second.id]))
    assert.equal((await call(replacementUrl + '/confirm', { idempotencyKey: randomUUID(), checkId: assessment.id, reason: 'kiểm thử' })).status, 404)
    assert.equal((await database.encounter.findUniqueOrThrow({ where: { id } })).version, 7)
    const filtered = await (await history('/checks?status=HAS_ALERT')).json()
    assert.ok(filtered.rows.some((r: { id: string }) => r.id === assessment.id))
    assert.ok(filtered.rows.every((r: { status: string }) => r.status === 'HAS_ALERT'))
    assert.equal((await (await history('/checks/' + final.id)).json()).overrideReason, confirm.reason)
    const context = await database.$transaction(tx => readContext(tx, id, replacement.id))
    assert.deepEqual(new Set(context.orders.map(row => row.id)), new Set([second.id, replacement.id]))
    const withoutDuplicate = { ...context, orders: context.orders.filter(row => row.id === replacement.id) }
    assert.equal(runChecks(withoutDuplicate).status, 'NO_ALERT')
    const synthetic = {
      ...context, kilograms: '20', diagnoses: ['I10'], allergyStatus: 'REPORTED' as const, allergens: ['ACEI'],
      orders: context.orders.map(row => ({ ...row, dose: '1', timesPerDay: 2, groups: ['DEMO_GROUP'], allergens: ['ACEI'],
        ingredients: [{ key: row.id === replacement.id ? 'demo_a' : 'demo_b', amount: '11' }] })),
    }
    const outcomes = Object.fromEntries(runChecks(synthetic).results.map(r => [r.ruleCode, r.outcome]))
    for (const code of ['PAIR_SAMPLE', 'WEIGHT_SAMPLE', 'GROUP_SAMPLE', 'ALLERGY']) assert.equal(outcomes[code], 'MATCHED')
    const boundary = runChecks({ ...synthetic, kilograms: '22' }).results.find(r => r.ruleCode === 'WEIGHT_SAMPLE')
    assert.equal(boundary?.outcome, 'NOT_MATCHED')
    const invalid = runChecks({ ...context, rules: [{ ...context.rules[0], condition: { type: 'INVALID' } }] })
    assert.equal(invalid.status, 'ERROR')
    const invalidCheck = await database.ruleCheck.create({ data: { encounterId: id, itemId: replacement.id, requestedBy: doctor,
      encounterVersion: 7, status: 'ERROR', contextSnapshot: {} } })
    assert.equal((await call(replacementUrl + '/confirm', { idempotencyKey: randomUUID(), checkId: invalidCheck.id, reason: 'kiểm thử' })).status, 409)
    const replaceCheck = await check(replacementUrl, 7)
    assert.equal((await call(replacementUrl + '/confirm', { idempotencyKey: randomUUID(), checkId: replaceCheck.id, reason: 'kiểm thử' })).status, 200)
    const old = await database.prescriptionItem.findUniqueOrThrow({ where: { id: first.id } })
    const active = await database.prescriptionItem.findUniqueOrThrow({ where: { id: replacement.id } })
    assert.equal(old.status, 'REPLACED')
    assert.deepEqual(old.endedAt, active.startedAt)
    assert.equal((await call('/discharge', {})).status, 200)
    assert.equal((await call('/checks', { version: 9, trigger: 'BEFORE_DISCHARGE' })).status, 409)
    assert.deepEqual(await (await history('/checks/' + assessment.id)).json(), historical)
    assert.equal(await database.prescriptionItem.count({ where: { encounterId: id, status: 'ENDED', endReason: 'DISCHARGE' } }), 2)
    assert.equal((await call(url + '/confirm', confirm)).status, 200)
  } finally {
    server.close()
    await database.$transaction([
      database.encounter.deleteMany({ where: { id } }), database.medicationIngredient.deleteMany({ where: { medicationId: drug } }),
      database.medication.deleteMany({ where: { id: drug } }), database.ingredient.deleteMany({ where: { id: ingredient } }),
      database.patient.deleteMany({ where: { id: patientId } }), database.user.deleteMany({ where: { id: { in: [doctor, patientUser] } } }),
    ])
    await database.$disconnect()
  }
})
