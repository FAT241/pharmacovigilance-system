import { Router } from 'express'
import { z } from 'zod'
import { database } from '../../database'
import { readContext } from './context'
import { runChecks } from './engine'
import { lockEncounter, requireCurrent, transact } from './transaction'

export const checkHistoryRouter = Router({ mergeParams: true })
const scope = z.object({ id: z.string().uuid(), patientId: z.string().uuid() })
const trigger = z.enum(['ADMISSION', 'CLINICAL_CHANGE', 'BEFORE_DISCHARGE'])
const status = z.enum(['NO_ALERT', 'HAS_ALERT', 'INSUFFICIENT_DATA', 'ERROR'])
const summary = {
  id: true, itemId: true, trigger: true, checkedAt: true, encounterVersion: true, status: true,
  confirmedAt: true, overrideReason: true, doctor: { select: { fullName: true } },
} as const

checkHistoryRouter.post('/', async (req, res) => {
  const where = scope.parse(req.params)
  const input = z.object({ trigger, version: z.number().int().nonnegative() }).parse(req.body)
  const doctorId = res.locals.account.id
  const checked = await transact(async tx => {
    requireCurrent(await lockEncounter(tx, where, doctorId), input.version)
    const context = await readContext(tx, where.id, null)
    const evaluation = runChecks(context)
    return tx.ruleCheck.create({ data: {
      encounterId: where.id, encounterVersion: input.version, requestedBy: doctorId,
      trigger: input.trigger, status: evaluation.status, contextSnapshot: JSON.parse(JSON.stringify(context)),
      results: { create: evaluation.results },
    }, select: summary })
  })
  res.status(201).json(checked)
})

checkHistoryRouter.get('/', async (req, res) => {
  const params = scope.parse(req.params)
  const query = z.object({
    before: z.string().uuid().optional(),
    status: status.optional(),
  }).parse(req.query)
  await database.encounter.findUniqueOrThrow({ where: params, select: { id: true } })
  const where = { encounterId: params.id, status: query.status }
  const cursor = query.before && await database.ruleCheck.findUniqueOrThrow({
    where: { ...where, id: query.before }, select: { checkedAt: true, id: true },
  })
  const rows = await database.ruleCheck.findMany({
    where: { ...where, ...(cursor && { OR: [
      { checkedAt: { lt: cursor.checkedAt } }, { checkedAt: cursor.checkedAt, id: { lt: cursor.id } },
    ] }) },
    orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }], take: 21, select: summary,
  })
  res.json({ rows: rows.slice(0, 20), next: rows.length > 20 ? rows[19].id : null })
})

checkHistoryRouter.get('/:checkId', async (req, res) => {
  const { id, patientId } = scope.parse(req.params)
  const check = await database.ruleCheck.findUniqueOrThrow({
    where: { id: z.string().uuid().parse(req.params.checkId), encounterId: id, encounter: { patientId } },
    select: { ...summary, contextSnapshot: true, results: {
      orderBy: { ruleCode: 'asc' }, select: { ruleCode: true, ruleVersion: true, outcome: true, message: true, missingFields: true, evidence: true },
    } },
  })
  res.json(check)
})
