import { Router } from 'express'
import { database } from '../../../database'
import { clinicalChange, clinicalParams, observationKinds } from './input'
import { clinicalSelect, updateClinical } from './record'

export const clinicalRouter = Router({ mergeParams: true })

clinicalRouter.get('/', async (request, response) => {
  const where = clinicalParams.parse(request.params)
  const [record, diseases, allergens, medications] = await Promise.all([
    database.encounter.findUniqueOrThrow({ where, select: clinicalSelect }),
    database.disease.findMany({ orderBy: { code: 'asc' } }),
    database.allergen.findMany({ orderBy: { name: 'asc' } }),
    database.medication.findMany({ where: { active: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, strength: true, code: true, baseUnit: true, dosageForm: true, groups: { select: { code: true, name: true } }, activeIngredients: { select: { amount: true, ingredient: { select: { name: true } } } } } }),
  ])
  response.json({ record, diseases, allergens, medications, observationKinds })
})

clinicalRouter.patch('/', async (request, response) => {
  response.json(await updateClinical(clinicalParams.parse(request.params), response.locals.account.id, clinicalChange.parse(request.body)))
})
