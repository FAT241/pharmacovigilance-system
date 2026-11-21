import bcrypt from 'bcryptjs'
import { database } from '../src/database'

async function seed() {
  console.log('--- Khởi tạo dữ liệu chuẩn DACS4 theo DrugBank VN, Cảnh giác Dược, Tương tác thuốc Bộ Y tế, MIMS ---')

  const adminPassword = process.env.DACS4_INITIAL_ADMIN_PASSWORD || 'Admin@123'
  const defaultPasswordHash = await bcrypt.hash('BacSi@123', 10)
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10)

  // 1. Tài khoản Quản trị viên
  await database.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash, fullName: 'Quản trị viên Hệ thống', status: 'ACTIVE' },
    create: {
      username: 'admin',
      role: 'ADMIN',
      fullName: 'Quản trị viên Hệ thống',
      passwordHash: adminPasswordHash,
      status: 'ACTIVE',
    },
  })

  // 2. Tài khoản Bác sĩ mẫu
  const doctorAn = await database.user.upsert({
    where: { username: 'bs_an' },
    update: { passwordHash: defaultPasswordHash, fullName: 'BS. CK1. Nguyễn Văn An', department: 'Khoa Nội Tim mạch', title: 'Bác sĩ điều trị', status: 'ACTIVE' },
    create: {
      username: 'bs_an',
      role: 'DOCTOR',
      fullName: 'BS. CK1. Nguyễn Văn An',
      department: 'Khoa Nội Tim mạch',
      title: 'Bác sĩ điều trị',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
    },
  })

  const doctorBinh = await database.user.upsert({
    where: { username: 'bs_binh' },
    update: { passwordHash: defaultPasswordHash, fullName: 'ThS. BS. Trần Thị Bình', department: 'Khoa Nội Tiết', title: 'Phó Trưởng khoa', status: 'ACTIVE' },
    create: {
      username: 'bs_binh',
      role: 'DOCTOR',
      fullName: 'ThS. BS. Trần Thị Bình',
      department: 'Khoa Nội Tiết',
      title: 'Phó Trưởng khoa',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
    },
  })

  // 3. Danh mục Bệnh theo ICD-10 (Bộ Y tế)
  const diseases = [
    { code: 'I10', name: 'Tăng huyết áp nguyên phát (vô căn)' },
    { code: 'E11', name: 'Đái tháo đường típ 2' },
  ]
  for (const d of diseases) {
    await database.disease.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    })
  }

  // 4. Nhóm thuốc theo phân loại Dược lý / ATC (DrugBank VN & MIMS)
  const groups = [
    { code: 'CCB', name: 'Thuốc chẹn kênh calci (Dihydropyridin)' },
    { code: 'ACEI', name: 'Thuốc ức chế men chuyển angiotensin (ACEI)' },
    { code: 'ARB', name: 'Thuốc chẹn thụ thể angiotensin II (ARB)' },
    { code: 'BIGUANIDE', name: 'Thuốc hạ đường huyết nhóm Biguanide' },
    { code: 'SULFONYLUREA', name: 'Thuốc hạ đường huyết nhóm Sulfonylurea' },
    { code: 'STATIN', name: 'Thuốc hạ lipid máu nhóm Statin (HMG-CoA reductase inhibitor)' },
    { code: 'DEMO_GROUP', name: 'Nhóm thuốc thí điểm chống chỉ định' },
  ]
  for (const g of groups) {
    await database.drugGroup.upsert({
      where: { code: g.code },
      update: { name: g.name },
      create: g,
    })
  }

  // 5. Tác nhân dị ứng (Theo Trung tâm Cảnh giác Dược Quốc gia - canhgiacduoc.org.vn)
  const allergens = [
    { code: 'AMLODIPINE', name: 'Amlodipine (Dị ứng nhóm chẹn kênh calci Dihydropyridin)' },
    { code: 'ACEI', name: 'Nhóm ức chế men chuyển (Phù mạch do ACEI)' },
    { code: 'ARB', name: 'Nhóm chẹn thụ thể angiotensin II' },
    { code: 'METFORMIN', name: 'Metformin' },
    { code: 'SULFONYLUREA', name: 'Nhóm Sulfonylurea' },
    { code: 'STATIN', name: 'Nhóm Statin' },
  ]
  for (const a of allergens) {
    await database.allergen.upsert({
      where: { code: a.code },
      update: { name: a.name },
      create: a,
    })
  }

  // 6. Hoạt chất chuẩn theo DrugBank Việt Nam (drugbank.vn)
  const ingredients = [
    { nameKey: 'amlodipine', name: 'Amlodipine' },
    { nameKey: 'enalapril', name: 'Enalapril' },
    { nameKey: 'losartan', name: 'Losartan' },
    { nameKey: 'metformin', name: 'Metformin' },
    { nameKey: 'gliclazide', name: 'Gliclazide' },
    { nameKey: 'atorvastatin', name: 'Atorvastatin' },
    { nameKey: 'demo_a', name: 'Hoạt chất thí điểm A' },
    { nameKey: 'demo_b', name: 'Hoạt chất thí điểm B' },
  ]
  const ingredientMap: Record<string, string> = {}
  for (const ing of ingredients) {
    const row = await database.ingredient.upsert({
      where: { nameKey: ing.nameKey },
      update: { name: ing.name },
      create: ing,
    })
    ingredientMap[ing.nameKey] = row.id
  }

  // 7. Danh mục thuốc mẫu tra cứu từ DrugBank VN, Cảnh giác Dược, tuongtacthuoc.nhic.vn, MIMS VN
  const medicationsData = [
    {
      code: 'MED-AMLO-5',
      name: 'Amlor 5mg (Amlodipin)',
      strength: '5mg',
      dosageForm: 'Viên nén',
      baseUnit: 'TABLET' as const,
      active: true,
      referenceSource: 'DrugBank VN (VN-20001-16) · Dược thư Quốc gia Việt Nam (2022) · MIMS Việt Nam',
      referenceText: 'Thuốc chẹn kênh calci dihydropyridin. Chỉ định: Tăng huyết áp nguyên phát, đau thắt ngực. Liều dùng: 5mg x 1 lần/ngày vào buổi sáng hoặc tối, tối đa 10mg/ngày. Chống chỉ định: Quá mẫn với dihydropyridin, sốc tim, hẹp động mạch chủ nặng. Thận trọng tác dụng phụ phù ngoại vi mắt cá chân.',
      groups: ['CCB'],
      allergens: ['AMLODIPINE'],
      ingredients: [{ key: 'amlodipine', amount: 5 }],
    },
    {
      code: 'MED-ENAL-10',
      name: 'Renitec 10mg (Enalapril)',
      strength: '10mg',
      dosageForm: 'Viên nén',
      baseUnit: 'TABLET' as const,
      active: true,
      referenceSource: 'DrugBank VN (VN-18234-14) · Tương tác thuốc Bộ Y tế (tuongtacthuoc.nhic.vn) · Dược thư Quốc gia (2022)',
      referenceText: 'Thuốc ức chế men chuyển angiotensin (ACEI). Chỉ định: Tăng huyết áp, suy tim. Liều dùng: 5 - 20mg x 1 lần/ngày. CẢNH BÁO TƯƠNG TÁC CHỐNG CHỈ ĐỊNH: Không phối hợp đồng thời với nhóm chẹn thụ thể ARB (như Losartan) do làm tăng nguy cơ suy thận cấp, hạ huyết áp trầm trọng và tăng kali máu (theo Cẩm nang Tương tác thuốc - Bộ Y tế).',
      groups: ['ACEI'],
      allergens: ['ACEI'],
      ingredients: [{ key: 'enalapril', amount: 10 }],
    },
    {
      code: 'MED-LOSAR-50',
      name: 'Cozaar 50mg (Losartan)',
      strength: '50mg',
      dosageForm: 'Viên nén bao phim',
      baseUnit: 'TABLET' as const,
      active: true,
      referenceSource: 'DrugBank VN (VN-19823-16) · Tương tác thuốc Bộ Y tế (tuongtacthuoc.nhic.vn) · MIMS Việt Nam',
      referenceText: 'Thuốc chẹn thụ thể angiotensin II (ARB). Chỉ định: Tăng huyết áp, bảo vệ thận ở bệnh nhân ĐTĐ típ 2 có protein niệu. Liều dùng: 50mg x 1 lần/ngày. Chống chỉ định phối hợp ức chế kép hệ RAAS với nhóm ACEI.',
      groups: ['ARB'],
      allergens: ['ARB'],
      ingredients: [{ key: 'losartan', amount: 50 }],
    },
    {
      code: 'MED-MET-850',
      name: 'Glucophage 850mg (Metformin)',
      strength: '850mg',
      dosageForm: 'Viên nén bao phim',
      baseUnit: 'TABLET' as const,
      active: true,
      referenceSource: 'DrugBank VN (VN-17561-13) · Trung tâm Cảnh giác Dược Quốc gia · Hướng dẫn ĐTĐ típ 2 Bộ Y tế',
      referenceText: 'Thuốc hạ đường huyết nhóm Biguanide. Chỉ định: Lựa chọn đầu tay ĐTĐ típ 2. Liều dùng: 850mg x 1-2 lần/ngày uống trong hoặc ngay sau bữa ăn. Cảnh báo quá liều: Không vượt quá 35mg/kg/ngày hoặc tối đa 2550mg/ngày. Chống chỉ định suy thận nặng (eGFR < 30 mL/phút) do nguy cơ nhiễm toan acid lactic.',
      groups: ['BIGUANIDE'],
      allergens: ['METFORMIN'],
      ingredients: [{ key: 'metformin', amount: 850 }],
    },
    {
      code: 'MED-GLIC-60',
      name: 'Diamicron MR 60mg (Gliclazid)',
      strength: '60mg',
      dosageForm: 'Viên nén giải phóng biến đổi',
      baseUnit: 'TABLET' as const,
      active: true,
      referenceSource: 'DrugBank VN (VN-16543-13) · Dược thư Quốc gia Việt Nam (2022) · MIMS Việt Nam',
      referenceText: 'Thuốc hạ đường huyết nhóm sulfonylurea thế hệ 2. Chỉ định: ĐTĐ típ 2 ở người lớn. Liều dùng: 30 - 120mg x 1 lần/ngày vào bữa sáng. Uống nguyên viên, không nhai hoặc nghiền. Cảnh báo nguy cơ hạ đường huyết khi bỏ bữa hoặc vận động gắng sức.',
      groups: ['SULFONYLUREA'],
      allergens: ['SULFONYLUREA'],
      ingredients: [{ key: 'gliclazide', amount: 60 }],
    },
    {
      code: 'MED-ATOR-20',
      name: 'Lipitor 20mg (Atorvastatin)',
      strength: '20mg',
      dosageForm: 'Viên nén bao phim',
      baseUnit: 'TABLET' as const,
      active: true,
      referenceSource: 'DrugBank VN (VN-18765-15) · Cảnh giác Dược Quốc gia · MIMS Việt Nam',
      referenceText: 'Thuốc ức chế HMG-CoA reductase (Statin). Chỉ định: Tăng cholesterol máu, phòng ngừa tiên phát và thứ phát biến cố tim mạch. Liều dùng: 10 - 20mg x 1 lần/ngày vào buổi tối trước khi đi ngủ. Báo ngay bác sĩ nếu có đau cơ hoặc nước tiểu sẫm màu.',
      groups: ['STATIN'],
      allergens: ['STATIN'],
      ingredients: [{ key: 'atorvastatin', amount: 20 }],
    },
  ]

  const medMap: Record<string, string> = {}
  for (const m of medicationsData) {
    const med = await database.medication.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        strength: m.strength,
        dosageForm: m.dosageForm,
        baseUnit: m.baseUnit,
        active: m.active,
        referenceSource: m.referenceSource,
        referenceText: m.referenceText,
        groups: { set: m.groups.map(code => ({ code })) },
        allergens: { set: m.allergens.map(code => ({ code })) },
      },
      create: {
        code: m.code,
        name: m.name,
        strength: m.strength,
        dosageForm: m.dosageForm,
        baseUnit: m.baseUnit,
        active: m.active,
        referenceSource: m.referenceSource,
        referenceText: m.referenceText,
        groups: { connect: m.groups.map(code => ({ code })) },
        allergens: { connect: m.allergens.map(code => ({ code })) },
      },
    })
    medMap[m.code] = med.id

    for (const ing of m.ingredients) {
      await database.medicationIngredient.upsert({
        where: { medicationId_ingredientId: { medicationId: med.id, ingredientId: ingredientMap[ing.key] } },
        update: { amount: ing.amount },
        create: {
          medicationId: med.id,
          ingredientId: ingredientMap[ing.key],
          amount: ing.amount,
        },
      })
    }
  }

  // 8. Bộ luật cảnh báo an toàn dược (Phù hợp rule engine, scopes: [] để không đòi hỏi chẩn đoán trong test cô lập)
  const alertRules = [
    {
      code: 'RECONCILE',
      title: 'Đối chiếu thuốc tại nhà',
      active: true,
      referenceSource: 'Thông tư 30/2020/TT-BYT Hướng dẫn công tác dược lâm sàng trong bệnh viện',
      condition: { type: 'RECONCILE', schemaVersion: 1 },
      scopes: [],
    },
    {
      code: 'ALLERGY',
      title: 'Cảnh báo tác nhân dị ứng thuốc',
      active: true,
      referenceSource: 'Dược thư Quốc gia Việt Nam & Hướng dẫn Cảnh giác Dược Quốc gia (canhgiacduoc.org.vn)',
      condition: { type: 'ALLERGY', schemaVersion: 1 },
      scopes: [],
    },
    {
      code: 'DUPLICATE',
      title: 'Trùng hoạt chất hoặc thuốc trong đợt điều trị',
      active: true,
      referenceSource: 'Quy trình kiểm duyệt đơn thuốc nội trú Bộ Y tế',
      condition: { type: 'DUPLICATE', schemaVersion: 1 },
      scopes: [],
    },
    {
      code: 'PAIR_SAMPLE',
      title: 'Cặp hoạt chất thí điểm',
      active: true,
      referenceSource: 'Bộ luật thí điểm của đồ án ĐACS4',
      condition: {
        type: 'INGREDIENT_PAIR',
        left: 'demo_a',
        right: 'demo_b',
        schemaVersion: 1,
      },
      scopes: [],
    },
    {
      code: 'WEIGHT_SAMPLE',
      title: 'Giới hạn theo cân nặng thí điểm',
      active: true,
      referenceSource: 'Bộ luật thí điểm của đồ án ĐACS4',
      condition: {
        type: 'WEIGHT_LIMIT',
        ingredient: 'demo_a',
        mgPerKgDay: 1,
        schemaVersion: 1,
      },
      scopes: [],
    },
    {
      code: 'GROUP_SAMPLE',
      title: 'Bệnh và nhóm thuốc thí điểm',
      active: true,
      referenceSource: 'Bộ luật thí điểm của đồ án ĐACS4',
      condition: {
        type: 'DISEASE_GROUP',
        group: 'DEMO_GROUP',
        disease: 'I10',
        schemaVersion: 1,
      },
      scopes: [],
    },
    {
      code: 'PAIR_ACEI_ARB',
      title: 'Tương tác chống chỉ định phối hợp ức chế kép RAAS (Enalapril + Losartan)',
      active: true,
      referenceSource: 'Cẩm nang Tương tác thuốc Bộ Y tế (tuongtacthuoc.nhic.vn)',
      condition: {
        type: 'INGREDIENT_PAIR',
        left: 'enalapril',
        right: 'losartan',
        schemaVersion: 1,
      },
      scopes: [],
    },
    {
      code: 'WEIGHT_METFORMIN',
      title: 'Cảnh báo quá liều Metformin theo cân nặng (> 35mg/kg/ngày)',
      active: true,
      referenceSource: 'Hướng dẫn chẩn đoán và điều trị ĐTĐ típ 2 (Bộ Y tế) · Cảnh giác Dược Quốc gia',
      condition: {
        type: 'WEIGHT_LIMIT',
        ingredient: 'metformin',
        mgPerKgDay: 35,
        schemaVersion: 1,
      },
      scopes: [],
    },
  ]

  for (const r of alertRules) {
    await database.alertRule.upsert({
      where: { code: r.code },
      update: {
        title: r.title,
        active: r.active,
        referenceSource: r.referenceSource,
        condition: r.condition,
        scopes: { deleteMany: {} },
      },
      create: {
        code: r.code,
        title: r.title,
        active: r.active,
        referenceSource: r.referenceSource,
        condition: r.condition,
      },
    })
  }

  // 9. Bệnh nhân mẫu 1: Nguyễn Văn Mười (Tăng huyết áp + ĐTĐ típ 2, Dị ứng Amlodipine)
  const patientUser1 = await database.user.upsert({
    where: { username: 'BN-2026-001' },
    update: { fullName: 'Nguyễn Văn Mười', role: 'PATIENT', status: 'ACTIVE' },
    create: {
      username: 'BN-2026-001',
      fullName: 'Nguyễn Văn Mười',
      role: 'PATIENT',
      status: 'ACTIVE',
    },
  })

  const patient1 = await database.patient.upsert({
    where: { patientCode: 'BN-2026-001' },
    update: {
      userId: patientUser1.id,
      birthDate: new Date('1958-05-12'),
      gender: 'MALE',
      phone: '0912345678',
      idCard: '079058001234',
      address: 'Số 12 đường Hải Thượng Lãn Ông, Phường 10, Quận 5, TP.HCM',
      historyNote: 'Tiền sử tăng huyết áp 10 năm, đái tháo đường típ 2 phát hiện 5 năm trước. Dị ứng phù nhẹ với Amlodipine.',
      conditions: { set: [{ code: 'I10' }, { code: 'E11' }] },
    },
    create: {
      userId: patientUser1.id,
      patientCode: 'BN-2026-001',
      birthDate: new Date('1958-05-12'),
      gender: 'MALE',
      phone: '0912345678',
      idCard: '079058001234',
      address: 'Số 12 đường Hải Thượng Lãn Ông, Phường 10, Quận 5, TP.HCM',
      historyNote: 'Tiền sử tăng huyết áp 10 năm, đái tháo đường típ 2 phát hiện 5 năm trước. Dị ứng phù nhẹ với Amlodipine.',
      conditions: { connect: [{ code: 'I10' }, { code: 'E11' }] },
    },
  })

  // Thuốc tại nhà của bệnh nhân 1
  const homeMed1 = await database.patientMedication.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { patientId: patient1.id, medicationId: medMap['MED-AMLO-5'] },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      patientId: patient1.id,
      medicationId: medMap['MED-AMLO-5'],
    },
  })

  const homeMed2 = await database.patientMedication.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { patientId: patient1.id, medicationId: medMap['MED-MET-850'] },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      patientId: patient1.id,
      medicationId: medMap['MED-MET-850'],
    },
  })

  // Đợt điều trị hiện tại của bệnh nhân 1 (đang mở)
  const existingEncounter1 = await database.encounter.findFirst({
    where: { patientId: patient1.id, dischargedAt: null },
  })

  if (!existingEncounter1) {
    await database.encounter.create({
      data: {
        patientId: patient1.id,
        doctorId: doctorAn.id,
        admittedAt: new Date(Date.now() - 3600000 * 24 * 2),
        admissionNote: 'Bệnh nhân đau đầu nhiều, chóng mặt, chỉ số huyết áp tại nhà đo được 165/100 mmHg.',
        allergyStatus: 'REPORTED',
        allergens: { connect: [{ code: 'AMLODIPINE' }] },
        diagnoses: { connect: [{ code: 'I10' }, { code: 'E11' }] },
        publishedDiagnoses: ['Tăng huyết áp nguyên phát', 'Đái tháo đường típ 2'],
        publishedAdvice: 'Bệnh nhân uống thuốc đúng giờ sau ăn sáng, hạn chế ăn mặn, uống đủ nước và đo huyết áp ngày 2 lần.',
        publishedAt: new Date(),
        weights: {
          create: [{ kilograms: 68.5, measuredAt: new Date(Date.now() - 3600000 * 24 * 2) }],
        },
        observations: {
          create: [
            { kind: 'Huyết áp tâm thu', value: 160, unit: 'mmHg', measuredAt: new Date(Date.now() - 3600000 * 4) },
            { kind: 'Huyết áp tâm trương', value: 95, unit: 'mmHg', measuredAt: new Date(Date.now() - 3600000 * 4) },
            { kind: 'Nhịp tim', value: 78, unit: 'lần/phút', measuredAt: new Date(Date.now() - 3600000 * 4) },
            { kind: 'Đường huyết lúc đói', value: 8.4, unit: 'mmol/L', measuredAt: new Date(Date.now() - 3600000 * 12) },
            { kind: 'Creatinine máu', value: 88, unit: 'µmol/L', measuredAt: new Date(Date.now() - 3600000 * 20) },
          ],
        },
        progressNotes: {
          create: [
            { body: 'Ngày 1: Huyết áp còn cao, tiếp tục theo dõi đáp ứng thuốc.', recordedAt: new Date(Date.now() - 3600000 * 24) },
            { body: 'Ngày 2: Bớt đau đầu, sinh hiệu dần ổn định.', recordedAt: new Date(Date.now() - 3600000 * 6) },
          ],
        },
        reconciliation: {
          create: [
            { patientMedicationId: homeMed1.id, decision: 'STOP', stopReason: 'Ghi nhận tiền sử dị ứng phù ngoại vi với Amlodipine' },
            { patientMedicationId: homeMed2.id, decision: 'CONTINUE' },
          ],
        },
      },
    })
  }

  // 10. Bệnh nhân mẫu 2: Trần Thị Lan (Tăng huyết áp nguyên phát)
  const patientUser2 = await database.user.upsert({
    where: { username: 'BN-2026-002' },
    update: { fullName: 'Trần Thị Lan', role: 'PATIENT', status: 'ACTIVE' },
    create: {
      username: 'BN-2026-002',
      fullName: 'Trần Thị Lan',
      role: 'PATIENT',
      status: 'ACTIVE',
    },
  })

  const patient2 = await database.patient.upsert({
    where: { patientCode: 'BN-2026-002' },
    update: {
      userId: patientUser2.id,
      birthDate: new Date('1964-09-20'),
      gender: 'FEMALE',
      phone: '0987654321',
      idCard: '079064005678',
      address: 'Số 45 đường Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
      historyNote: 'Tiền sử tăng huyết áp 3 năm, tuân thủ điều trị tốt, chưa ghi nhận dị ứng thuốc.',
      conditions: { set: [{ code: 'I10' }] },
    },
    create: {
      userId: patientUser2.id,
      patientCode: 'BN-2026-002',
      birthDate: new Date('1964-09-20'),
      gender: 'FEMALE',
      phone: '0987654321',
      idCard: '079064005678',
      address: 'Số 45 đường Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
      historyNote: 'Tiền sử tăng huyết áp 3 năm, tuân thủ điều trị tốt, chưa ghi nhận dị ứng thuốc.',
      conditions: { connect: [{ code: 'I10' }] },
    },
  })

  const existingEncounter2 = await database.encounter.findFirst({
    where: { patientId: patient2.id, dischargedAt: null },
  })

  if (!existingEncounter2) {
    await database.encounter.create({
      data: {
        patientId: patient2.id,
        doctorId: doctorBinh.id,
        admittedAt: new Date(Date.now() - 3600000 * 24),
        admissionNote: 'Bệnh nhân tái khám định kỳ, huyết áp dao động, nhập viện theo dõi chỉnh liều.',
        allergyStatus: 'NONE_REPORTED',
        diagnoses: { connect: [{ code: 'I10' }] },
        publishedDiagnoses: ['Tăng huyết áp nguyên phát'],
        publishedAdvice: 'Theo dõi chỉ số huyết áp sáng và chiều.',
        publishedAt: new Date(),
        weights: {
          create: [{ kilograms: 56.0, measuredAt: new Date(Date.now() - 3600000 * 24) }],
        },
        observations: {
          create: [
            { kind: 'Huyết áp tâm thu', value: 145, unit: 'mmHg', measuredAt: new Date(Date.now() - 3600000 * 3) },
            { kind: 'Huyết áp tâm trương', value: 90, unit: 'mmHg', measuredAt: new Date(Date.now() - 3600000 * 3) },
            { kind: 'Nhịp tim', value: 82, unit: 'lần/phút', measuredAt: new Date(Date.now() - 3600000 * 3) },
          ],
        },
      },
    })
  }

  console.log('✅ Khởi tạo cơ sở dữ liệu mẫu DACS4 chuẩn ngành Dược thành công!')
}

seed()
  .catch((error) => {
    console.error('Lỗi khi seed dữ liệu:', error)
    process.exitCode = 1
  })
  .finally(() => database.$disconnect())
