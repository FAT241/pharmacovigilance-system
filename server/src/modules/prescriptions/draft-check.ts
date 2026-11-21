import type { Prisma } from '@prisma/client'
import { HttpError } from '../../http'
import { readContext } from './context'
import { runChecks } from './engine'

export async function checkDraft(tx: Prisma.TransactionClient, encounterId: string, itemId: string, requestedBy: string, encounterVersion: number) {
  const data = { encounterId, itemId, requestedBy, encounterVersion }
  const select = { id: true, status: true } as const
  let context
  try { context = await readContext(tx, encounterId, itemId) }
  catch (error) {
    if (!(error instanceof HttpError)) throw error
    return tx.ruleCheck.create({ data: { ...data, status: 'ERROR', contextSnapshot: { error: error.message } }, select })
  }
  const { status, results } = runChecks(context)
  return tx.ruleCheck.create({ data: { ...data, status, contextSnapshot: JSON.parse(JSON.stringify(context)), results: { create: results } }, select })
}

// Only pending prescriptions are rechecked. Reassessment of active treatment stays doctor-initiated.
export async function refreshCheckedDrafts(tx: Prisma.TransactionClient, encounterId: string, doctorId: string, version: number, editedId?: string) {
  const rows = await tx.prescriptionItem.findMany({ where: { encounterId, status: 'DRAFT',
    OR: [{ checks: { some: {} } }, ...(editedId ? [{ id: editedId }] : [])] }, select: { id: true }, orderBy: { id: 'asc' } })
  for (const row of rows) await checkDraft(tx, encounterId, row.id, doctorId, version)
}
