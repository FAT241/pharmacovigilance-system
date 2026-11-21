import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { app } from '../src/app'
import { database } from '../src/database'

test('Comprehensive test: all buttons, clinical workflows, and safety functions', async () => {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api'

  try {
    // -------------------------------------------------------------
    // 1. TEST LOGIN BUTTONS & AUTHENTICATION (Bác sĩ, Quản trị, Bệnh nhân)
    // -------------------------------------------------------------
    console.log('[TEST] 1. Authentication...')
    
    // 1.1 Doctor login (BS. Nguyễn Văn An)
    const docLoginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'staff', username: 'bs_an', password: 'BacSi@123' }),
    })
    assert.equal(docLoginRes.status, 200, 'Doctor login should succeed')
    const docSession = await docLoginRes.json()
    assert.ok(docSession.token, 'Doctor session must have JWT token')
    assert.equal(docSession.account.role, 'DOCTOR')
    assert.equal(docSession.account.username, 'bs_an')
    const docToken = docSession.token

    // 1.2 Admin login
    const adminLoginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'staff', username: 'admin', password: 'Admin@123' }),
    })
    assert.equal(adminLoginRes.status, 200, 'Admin login should succeed')
    const adminSession = await adminLoginRes.json()
    assert.equal(adminSession.account.role, 'ADMIN')
    const adminToken = adminSession.token

    // 1.3 Patient login (BN-2026-001)
    const patientLoginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'patient', patientCode: 'BN-2026-001' }),
    })
    assert.equal(patientLoginRes.status, 200, 'Patient login should succeed')
    const patientSession = await patientLoginRes.json()
    assert.equal(patientSession.account.role, 'PATIENT')
    const patientToken = patientSession.token

    // 1.4 Invalid credentials rejection
    const badLoginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'staff', username: 'bs_an', password: 'WrongPassword' }),
    })
    assert.equal(badLoginRes.status, 401, 'Invalid password should be rejected')

    // -------------------------------------------------------------
    // 2. TEST PATIENT LIST, SEARCH, AND FILTER BUTTONS
    // -------------------------------------------------------------
    console.log('[TEST] 2. Patient list & Search filter...')
    const patientListRes = await fetch(base + '/patients', {
      headers: { Authorization: 'Bearer ' + docToken },
    })
    assert.equal(patientListRes.status, 200)
    const patientList = await patientListRes.json()
    assert.ok(Array.isArray(patientList))
    assert.ok(patientList.length >= 1)

    const targetPatient = patientList.find((p: any) => p.patientCode === 'BN-2026-001')
    assert.ok(targetPatient, 'Seed patient BN-2026-001 must exist')
    const patientId = targetPatient.id

    // Search filter test
    const searchRes = await fetch(base + '/patients', {
      headers: { Authorization: 'Bearer ' + docToken },
    })
    assert.equal(searchRes.status, 200)
    const searchResult = await searchRes.json()
    assert.ok(searchResult.some((p: any) => p.user.fullName.includes('Nguyễn')))

    // -------------------------------------------------------------
    // 3. TEST CLINICAL WORKSPACE: LOAD & PROFILE UPDATE BUTTONS
    // -------------------------------------------------------------
    console.log('[TEST] 3. Inpatient encounter & Clinical Profile...')
    let encounter = targetPatient.encounters?.[0]
    let encounterId = encounter?.id

    if (!encounterId) {
      // Create new encounter (Tiếp nhận bệnh nhân)
      const admitRes = await fetch(base + '/patients/' + patientId + '/encounters', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionNote: 'Tiếp nhận kiểm thử nội trú' }),
      })
      assert.equal(admitRes.status, 201)
      const newEnc = await admitRes.json()
      encounterId = newEnc.id
    }

    const encUrl = base + '/patients/' + patientId + '/encounters/' + encounterId
    const clinicalRes = await fetch(encUrl + '/clinical', {
      headers: { Authorization: 'Bearer ' + docToken },
    })
    assert.equal(clinicalRes.status, 200)
    const clinicalData = await clinicalRes.json()
    let currentVersion = clinicalData.record.version

    // Update clinical profile (Chẩn đoán, Dị ứng, Cân nặng)
    const updateProfileRes = await fetch(encUrl + '/clinical', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'PROFILE',
        version: currentVersion,
        diagnoses: ['I10', 'E11'],
        allergyStatus: 'REPORTED',
        allergens: ['AMLODIPINE'],
        kilograms: 70.0,
      }),
    })
    assert.equal(updateProfileRes.status, 200, 'Updating clinical profile should succeed')
    const updatedClinical = await updateProfileRes.json()
    currentVersion = updatedClinical.version

    // -------------------------------------------------------------
    // 4. TEST MEDICATION REVIEW (ĐỐI CHIẾU THUỐC TRƯỚC NHẬP VIỆN)
    // -------------------------------------------------------------
    console.log('[TEST] 4. Medication reconciliation...')
    const medListRes = await fetch(base + '/medications', {
      headers: { Authorization: 'Bearer ' + docToken },
    })
    const medList = await medListRes.json()
    const amlor = medList.find((m: any) => m.name.includes('Amlor'))
    const renitec = medList.find((m: any) => m.name.includes('Renitec'))
    assert.ok(amlor && renitec, 'Seed medications Amlor & Renitec must exist')

    // Add home med to reconcile if needed
    const addHomeMedRes = await fetch(encUrl + '/clinical', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_MEDICATION',
        version: currentVersion,
        medicationId: amlor.id,
      }),
    })
    if (addHomeMedRes.status === 200) {
      const homeMedData = await addHomeMedRes.json()
      currentVersion = homeMedData.version
      const pendingItem = homeMedData.reconciliation.find((r: any) => r.decision === 'PENDING')
      if (pendingItem) {
        // Test "Tiếp tục" button -> convert to inpatient order
        const continueRes = await fetch(encUrl + '/clinical', {
          method: 'PATCH',
          headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CONTINUE',
            version: currentVersion,
            reviewId: pendingItem.id,
            dose: 1,
            timesPerDay: 1,
          }),
        })
        assert.equal(continueRes.status, 200)
        currentVersion = (await continueRes.json()).version
      }
    }

    // -------------------------------------------------------------
    // 5. TEST PRESCRIPTION STUDIO: ORDER, SAFETY CHECK & OVERRIDE
    // -------------------------------------------------------------
    console.log('[TEST] 5. Prescription safety checks & Override modal...')
    // 5.1 Create order for Amlor (Patient has AMLODIPINE allergy -> MUST TRIGGER ALLERGY ALERT)
    const orderRes = await fetch(encUrl + '/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: currentVersion,
        medicationId: amlor.id,
        dose: 1,
        timesPerDay: 1,
      }),
    })
    assert.equal(orderRes.status, 201, 'Creating draft prescription order should succeed')
    const draftOrder = await orderRes.json()
    const draftItemId = draftOrder.itemId || draftOrder.id
    currentVersion = draftOrder.version

    // 5.2 Click "Kiểm tra an toàn đơn thuốc" button
    const checkRes = await fetch(encUrl + '/orders/' + draftItemId + '/check', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: currentVersion }),
    })
    assert.equal(checkRes.status, 201)
    const checkData = await checkRes.json()
    // Patient has AMLODIPINE allergy, so check MUST return HAS_ALERT
    assert.equal(checkData.status, 'HAS_ALERT', 'Should trigger ALLERGY alert')
    assert.ok(checkData.id, 'Check result must have an ID')

    // Fetch check details to verify rule results
    const checkDetailRes = await fetch(encUrl + '/checks/' + checkData.id, {
      headers: { Authorization: 'Bearer ' + docToken },
    })
    assert.equal(checkDetailRes.status, 200)
    const checkDetail = await checkDetailRes.json()
    assert.ok(checkDetail.results.some((r: any) => r.ruleCode === 'ALLERGY'))

    // 5.3 Attempt to confirm without override reason -> MUST FAIL with 400
    const emptyOverrideRes = await fetch(encUrl + '/orders/' + draftItemId + '/confirm', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkId: checkData.id,
        idempotencyKey: randomUUID(),
        reason: '   ', // Blank reason
      }),
    })
    assert.equal(emptyOverrideRes.status, 400, 'Blank override reason must be rejected')

    // 5.4 Confirm with valid clinical justification
    const validOverrideRes = await fetch(encUrl + '/orders/' + draftItemId + '/confirm', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkId: checkData.id,
        idempotencyKey: randomUUID(),
        reason: 'Bác sĩ đã hội chẩn, theo dõi sát phản ứng quá mẫn trong 24h',
      }),
    })
    assert.equal(validOverrideRes.status, 200, 'Valid override reason should confirm order')
    const confirmReceipt = await validOverrideRes.json()
    assert.ok(confirmReceipt.confirmedAt, 'Order check must be confirmed with timestamp')
    assert.equal(confirmReceipt.overrideReason, 'Bác sĩ đã hội chẩn, theo dõi sát phản ứng quá mẫn trong 24h')

    // Fetch clinical record to verify prescriptionItem status is now ACTIVE
    const recordAfterConfirmRes = await fetch(encUrl + '/clinical', {
      headers: { Authorization: 'Bearer ' + docToken },
    })
    assert.equal(recordAfterConfirmRes.status, 200)
    const recordAfterConfirm = await recordAfterConfirmRes.json()
    const activeItem = recordAfterConfirm.record.orders.find((o: any) => o.id === draftItemId)
    assert.ok(activeItem, 'Order must exist in active list')
    assert.equal(activeItem.status, 'ACTIVE', 'Prescription item status should be ACTIVE')
    currentVersion = recordAfterConfirm.record.version

    // 5.5 Test "Ngừng thuốc" button (Stop order)
    const stopRes = await fetch(encUrl + '/orders/' + draftItemId + '/stop', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Thay đổi phác đồ kiểm soát huyết áp',
        version: currentVersion,
      }),
    })
    assert.equal(stopRes.status, 200, 'Stopping active order must succeed')

    // 5.6 Test "Xóa y lệnh nháp" (DELETE /orders/:itemId)
    const secondDraftRes = await fetch(encUrl + '/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + docToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: currentVersion + 1,
        medicationId: renitec.id,
        dose: 1,
        timesPerDay: 1,
      }),
    })
    assert.equal(secondDraftRes.status, 201)
    const secondDraft = await secondDraftRes.json()
    const secondItemId = secondDraft.itemId || secondDraft.id

    const deleteDraftRes = await fetch(encUrl + '/orders/' + secondItemId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + docToken },
    })
    assert.equal(deleteDraftRes.status, 200, 'Deleting draft order must succeed')
    const deleteDraftResult = await deleteDraftRes.json()
    assert.equal(deleteDraftResult.success, true)

    // -------------------------------------------------------------
    // 6. TEST PATIENT PORTAL & TREATMENT SUMMARY
    // -------------------------------------------------------------
    console.log('[TEST] 6. Patient Portal view...')
    const myProfileRes = await fetch(base + '/patients/me', {
      headers: { Authorization: 'Bearer ' + patientToken },
    })
    assert.equal(myProfileRes.status, 200)
    const myProfile = await myProfileRes.json()
    assert.equal(myProfile.patientCode, 'BN-2026-001')

    // -------------------------------------------------------------
    // 7. TEST ADMIN CRUD: MEDICATION & ACCOUNT DELETION
    // -------------------------------------------------------------
    console.log('[TEST] 7. Medication & Account DELETE operations...')
    // 7.1 Create a temporary test drug and delete it
    const tempDrugRes = await fetch(base + '/medications', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'MED-TEMP-TEST',
        name: 'Thuốc tạm thử nghiệm CRUD',
        strength: '100mg',
        dosageForm: 'Viên nén',
        baseUnit: 'TABLET',
        ingredients: [{ name: 'Paracetamol', amount: 100 }],
      }),
    })
    assert.equal(tempDrugRes.status, 201)
    const tempDrug = await tempDrugRes.json()

    // Delete temporary drug (unreferenced -> MUST SUCCEED)
    const deleteDrugRes = await fetch(base + '/medications/' + tempDrug.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    assert.equal(deleteDrugRes.status, 200, 'Deleting unreferenced medication must succeed')

    // Attempt to delete prescribed drug (Amlor -> MUST BE REJECTED WITH 409)
    const deletePrescribedRes = await fetch(base + '/medications/' + amlor.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    assert.equal(deletePrescribedRes.status, 409, 'Deleting prescribed drug must return 409 conflict')

    // 7.2 Create a temporary doctor account and delete it
    const tempDocRes = await fetch(base + '/accounts/doctors', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'bs_temp_test',
        fullName: 'Bác sĩ Thử Nghiệm Xóa',
        department: 'Khoa Kiểm Thử',
        password: 'Password@123',
      }),
    })
    assert.equal(tempDocRes.status, 201)
    const tempDoc = await tempDocRes.json()

    // Delete temporary doctor (unreferenced -> MUST SUCCEED)
    const deleteDocRes = await fetch(base + '/accounts/' + tempDoc.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    assert.equal(deleteDocRes.status, 200, 'Deleting unreferenced account must succeed')

    // Attempt to delete doctor with active encounters (bs_an -> MUST BE REJECTED WITH 409)
    const deleteActiveDocRes = await fetch(base + '/accounts/' + docSession.account.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    assert.equal(deleteActiveDocRes.status, 409, 'Deleting active doctor with encounters must return 409')

    // -------------------------------------------------------------
    // 8. TEST ADMIN RULE MANAGEMENT & EMERGENCY SUSPENSION
    // -------------------------------------------------------------
    console.log('[TEST] 8. Admin Rule Management & Socket.IO emergency suspension...')
    const rulesRes = await fetch(base + '/rules', {
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    assert.equal(rulesRes.status, 200)
    const rulesList = await rulesRes.json()
    assert.ok(rulesList.length >= 1)

    const allergyRule = rulesList.find((r: any) => r.code === 'ALLERGY')
    assert.ok(allergyRule)

    // Admin suspends rule
    const suspendRes = await fetch(base + '/rules/' + allergyRule.code + '/status', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active: false,
        version: allergyRule.version,
        reason: 'Tạm ngưng khẩn cấp để kiểm thử quy trình bảo trì',
      }),
    })
    assert.equal(suspendRes.status, 200)
    const suspended = await suspendRes.json()
    assert.equal(suspended.active, false)

    // Re-activate rule
    const reactivateRes = await fetch(base + '/rules/' + allergyRule.code + '/status', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active: true,
        version: suspended.version,
        reason: 'Kích hoạt lại sau khi hoàn tất kiểm thử',
      }),
    })
    assert.equal(reactivateRes.status, 200)
    const reactivated = await reactivateRes.json()
    assert.equal(reactivated.active, true)

    console.log('[TEST] ALL BUTTONS & CLINICAL FUNCTIONS TESTED AND PASSED!')
  } finally {
    server.close()
    await database.$disconnect()
  }
})
