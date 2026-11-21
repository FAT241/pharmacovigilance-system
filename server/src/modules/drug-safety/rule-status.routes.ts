import { Router } from 'express'
import { z } from 'zod'
import { database } from '../../database'
import { HttpError } from '../../http'
import { requireSession } from '../auth/session'
import { ruleChanges } from './rule-events'

import { describeRule } from './rule-description'
import { ruleCondition } from './condition'

export const ruleStatusRouter = Router()
ruleStatusRouter.get('/notices', requireSession('DOCTOR'), async (_req, res) => {
  const rows = await database.ruleChangeLog.findMany({ orderBy: { id: 'desc' }, take: 50,
    select: { id: true, ruleCode: true, ruleTitle: true, version: true, active: true, reason: true, changedAt: true } })
  res.json(rows.map(({ ruleCode, ruleTitle, ...event }) => ({ ...event, code: ruleCode, title: ruleTitle })))
})
ruleStatusRouter.use(requireSession('ADMIN'))

ruleStatusRouter.get('/metadata', async (_req, res) => {
  const [ingredients, groups, diseases] = await Promise.all([
    database.ingredient.findMany({ select: { nameKey: true, name: true }, orderBy: { name: 'asc' } }),
    database.drugGroup.findMany({ select: { code: true, name: true }, orderBy: { name: 'asc' } }),
    database.disease.findMany({ select: { code: true, name: true }, orderBy: { name: 'asc' } }),
  ])
  res.json({ ingredients, groups, diseases })
})

ruleStatusRouter.get('/', async (_req, res) => {
  const [rules, ingredients, groups, diseases] = await Promise.all([
    database.alertRule.findMany({ include: { scopes: { include: { disease: true } } }, orderBy: { code: 'asc' } }),
    database.ingredient.findMany({ select: { nameKey: true, name: true } }),
    database.drugGroup.findMany({ select: { code: true, name: true } }),
    database.disease.findMany({ select: { code: true, name: true } }),
  ])
  const names = {
    ingredients: new Map(ingredients.map(row => [row.nameKey, row.name])),
    groups: new Map(groups.map(row => [row.code, row.name])),
    diseases: new Map(diseases.map(row => [row.code, row.name])),
  }
  res.json(rules.map(rule => ({ ...rule, description: describeRule(rule.condition, names) })))
})
ruleStatusRouter.get('/changes', async (req, res) => {
  const before = z.coerce.number().int().positive().optional().parse(req.query.before)
  const rows = await database.ruleChangeLog.findMany({
    where: before ? { id: { lt: before } } : {}, include: { actor: { select: { fullName: true } } },
    orderBy: { id: 'desc' }, take: 21,
  })
  res.json({ rows: rows.slice(0, 20), next: rows.length > 20 ? rows[19].id : null })
})

ruleStatusRouter.patch('/:code/status', async (req, res) => {
  const code = z.string().min(1).max(100).parse(req.params.code)
  const { active, version, reason } = z.object({
    active: z.boolean(), version: z.number().int().positive(), reason: z.string().trim().min(1).max(1000),
  }).parse(req.body)
  const change = await database.$transaction(async tx => {
    const rule = await tx.alertRule.findUniqueOrThrow({ where: { code } })
    const updated = await tx.alertRule.updateMany({ where: { code, active: !active, version }, data: {
      active, version: { increment: 1 },
    } })
    if (!updated.count) throw new HttpError(409, 'Trạng thái hoặc phiên bản luật đã thay đổi. Vui lòng xem lại trước khi xác nhận.')
    return tx.ruleChangeLog.create({ data: {
      ruleCode: code, ruleTitle: rule.title, version: version + 1, oldActive: !active, active, reason, changedBy: res.locals.account.id,
    } })
  })
  ruleChanges.emit('changed', change)
  res.json(change)
})

ruleStatusRouter.post('/', async (req, res) => {
  const input = z.object({
    code: z.string().trim().min(2).max(100).regex(/^[A-Z0-9_-]+$/, 'Mã luật chỉ gồm chữ in hoa, số, dấu gạch dưới hoặc gạch nối'),
    title: z.string().trim().min(3).max(255),
    condition: ruleCondition,
    referenceSource: z.string().trim().max(500).optional().nullable(),
    active: z.boolean().default(true),
    scopes: z.array(z.string()).default([]),
  }).parse(req.body)

  const exists = await database.alertRule.findUnique({ where: { code: input.code } })
  if (exists) throw new HttpError(409, 'Mã luật cảnh báo đã tồn tại.')

  const created = await database.$transaction(async tx => {
    const rule = await tx.alertRule.create({
      data: {
        code: input.code,
        title: input.title,
        condition: input.condition,
        referenceSource: input.referenceSource,
        active: input.active,
        version: 1,
        scopes: {
          create: input.scopes.map(diseaseCode => ({ diseaseCode })),
        },
      },
      include: { scopes: { include: { disease: true } } },
    })
    await tx.ruleChangeLog.create({
      data: {
        ruleCode: rule.code,
        ruleTitle: rule.title,
        version: 1,
        oldActive: false,
        active: rule.active,
        reason: 'Khởi tạo luật cảnh báo mới trong hệ thống.',
        changedBy: res.locals.account.id,
      },
    })
    return rule
  })

  res.status(201).json(created)
})

ruleStatusRouter.put('/:code', async (req, res) => {
  const code = z.string().min(1).max(100).parse(req.params.code)
  const input = z.object({
    title: z.string().trim().min(3).max(255),
    condition: ruleCondition,
    referenceSource: z.string().trim().max(500).optional().nullable(),
    scopes: z.array(z.string()).default([]),
    reason: z.string().trim().min(1).max(1000).default('Cập nhật cấu hình chuyên môn luật cảnh báo.'),
  }).parse(req.body)

  const updated = await database.$transaction(async tx => {
    const current = await tx.alertRule.findUniqueOrThrow({ where: { code } })
    await tx.ruleDisease.deleteMany({ where: { ruleCode: code } })
    const rule = await tx.alertRule.update({
      where: { code },
      data: {
        title: input.title,
        condition: input.condition,
        referenceSource: input.referenceSource,
        version: { increment: 1 },
        scopes: {
          create: input.scopes.map(diseaseCode => ({ diseaseCode })),
        },
      },
      include: { scopes: { include: { disease: true } } },
    })
    await tx.ruleChangeLog.create({
      data: {
        ruleCode: code,
        ruleTitle: rule.title,
        version: rule.version,
        oldActive: current.active,
        active: rule.active,
        reason: input.reason,
        changedBy: res.locals.account.id,
      },
    })
    return rule
  })

  res.json(updated)
})

ruleStatusRouter.delete('/:code', async (req, res) => {
  const code = z.string().min(1).max(100).parse(req.params.code)
  await database.$transaction(async tx => {
    await tx.ruleCheckResult.deleteMany({ where: { ruleCode: code } })
    await tx.ruleChangeLog.deleteMany({ where: { ruleCode: code } })
    await tx.ruleDisease.deleteMany({ where: { ruleCode: code } })
    await tx.alertRule.delete({ where: { code } })
  })
  res.json({ message: 'Đã xóa luật cảnh báo thành công.' })
})
