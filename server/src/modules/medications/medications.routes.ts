import { Router } from 'express'
import { z } from 'zod'
import { database } from '../../database'
import { requireSession } from '../auth/session'
import { HttpError } from '../../http'

export const medicationsRouter = Router()
const ingredient = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(9999999999).refine(value => Number(value.toFixed(6)) === value),
})

const medication = z.object({
  code: z.string().trim().min(1).max(40).transform(value => value.toUpperCase()),
  name: z.string().trim().min(1).max(160),
  strength: z.string().trim().min(1).max(120),
  dosageForm: z.string().trim().min(1).max(120),
  baseUnit: z.enum(['TABLET', 'ML']),
  ingredients: z.array(ingredient).min(1).max(20),
  allergenCodes: z.array(z.string().min(1).max(50)).max(100).optional(),
  groupCodes: z.array(z.string().trim().min(1).max(60)).max(100).optional(),
  referenceSource: z.string().trim().max(300).optional(),
  referenceText: z.string().trim().max(2400).optional(),
}).refine(data => new Set(data.ingredients.map(item => item.name.toLowerCase())).size === data.ingredients.length, {
  path: ['ingredients'], message: 'Hoạt chất bị trùng.',
}).refine(data => !!data.referenceSource === !!data.referenceText, { message: 'Cần có cả tên nguồn và trích đoạn đã kiểm tra.' })

const include = { activeIngredients: { include: { ingredient: true } }, allergens: true, groups: true,
  _count: { select: { orders: true, homeMedications: true } },
} as const

function withGroupCodes<T extends { groups: { code: string }[] }>(row: T) {
  return { ...row, groupCodes: row.groups.map(g => g.code) }
}

async function mappings(groupCodes?: string[], allergenCodes?: string[]) {
  for (const [codes, found] of [
    [groupCodes, groupCodes && await database.drugGroup.count({ where: { code: { in: groupCodes } } })],
    [allergenCodes, allergenCodes && await database.allergen.count({ where: { code: { in: allergenCodes } } })],
  ] as const) {
    if (codes && found !== codes.length) throw new HttpError(400, 'Mã danh mục bị trùng hoặc không tồn tại.')
  }
  return { groups: groupCodes?.map(code => ({ code })), allergens: allergenCodes?.map(code => ({ code })) }
}
const groupName = z.string().trim().min(1).max(150)
medicationsRouter.get('/groups', requireSession('ADMIN', 'DOCTOR'), async (_req, res) => {
  res.json(await database.drugGroup.findMany({ orderBy: { name: 'asc' } }))
})
medicationsRouter.post('/groups', requireSession('ADMIN'), async (req, res) => {
  const data = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{1,60}$/), name: groupName }).parse(req.body)
  res.status(201).json(await database.drugGroup.create({ data }))
})
medicationsRouter.put('/groups/:code', requireSession('ADMIN'), async (req, res) => {
  res.json(await database.drugGroup.update({ where: { code: String(req.params.code) }, data: { name: groupName.parse(req.body.name) } }))
})

medicationsRouter.get('/allergens', requireSession('ADMIN'), async (_request, response) => {
  response.json(await database.allergen.findMany({ orderBy: { name: 'asc' } }))
})

function ingredientRows(ingredients: z.infer<typeof ingredient>[]) {
  return ingredients.map(({ name, amount }) => ({
    amount,
    ingredient: { connectOrCreate: { where: { nameKey: name.toLowerCase() }, create: { nameKey: name.toLowerCase(), name } } },
  }))
}

medicationsRouter.get('/', requireSession('DOCTOR', 'ADMIN'), async (_request, response) => {
  response.json((await database.medication.findMany({
    where: response.locals.account.role === 'DOCTOR' ? { active: true } : {},
    include, orderBy: { name: 'asc' },
  })).map(withGroupCodes))
})

medicationsRouter.post('/', requireSession('ADMIN'), async (request, response) => {
  const { ingredients, allergenCodes, groupCodes, ...data } = medication.parse(request.body)
  const links = await mappings(groupCodes, allergenCodes)
  response.status(201).json(withGroupCodes(await database.medication.create({
    data: { ...data, activeIngredients: { create: ingredientRows(ingredients) }, allergens: { connect: links.allergens }, groups: { connect: links.groups } }, include,
  })))
})

medicationsRouter.put('/:id', requireSession('ADMIN'), async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const { ingredients, allergenCodes, groupCodes, ...data } = medication.parse(request.body)
  const links = await mappings(groupCodes, allergenCodes)
  response.json(withGroupCodes(await database.$transaction(async transaction => {
    await transaction.medication.update({ where: { id }, data: { ...data, allergens: { set: links.allergens }, groups: { set: links.groups } } })
    await transaction.medicationIngredient.deleteMany({ where: { medicationId: id } })
    return transaction.medication.update({
      where: { id }, data: { activeIngredients: { create: ingredientRows(ingredients) } }, include,
    })
  })))
})

medicationsRouter.patch('/:id/status', requireSession('ADMIN'), async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const data = z.object({ active: z.boolean() }).parse(request.body)
  response.json(withGroupCodes(await database.medication.update({ where: { id }, data, include })))
})

medicationsRouter.delete('/:id', requireSession('ADMIN'), async (request, response) => {
  const id = z.string().uuid().parse(request.params.id)
  const [prescribedCount, homeMedCount] = await Promise.all([
    database.prescriptionItem.count({ where: { medicationId: id } }),
    database.patientMedication.count({ where: { medicationId: id } }),
  ])
  if (prescribedCount > 0 || homeMedCount > 0) {
    throw new HttpError(
      409,
      `Không thể xóa thuốc này vì đã có ${prescribedCount + homeMedCount} y lệnh/đơn thuốc liên kết trong lịch sử điều trị. Vui lòng chọn "Ngừng sử dụng" để bảo toàn dữ liệu bệnh án.`,
    )
  }
  await database.$transaction([
    database.medicationIngredient.deleteMany({ where: { medicationId: id } }),
    database.medication.delete({ where: { id } }),
  ])
  response.json({ success: true, message: 'Đã xóa thuốc khỏi danh mục.' })
})
