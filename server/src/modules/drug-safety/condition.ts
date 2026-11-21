import { z } from 'zod'

export const ruleCondition = z.discriminatedUnion('type', [
  z.object({ type: z.literal('RECONCILE') }), z.object({ type: z.literal('DUPLICATE') }),
  z.object({ type: z.literal('ALLERGY') }),
  z.object({ type: z.literal('INGREDIENT_PAIR'), left: z.string().min(1), right: z.string().min(1) }),
  z.object({ type: z.literal('WEIGHT_LIMIT'), ingredient: z.string().min(1), mgPerKgDay: z.number().positive() }),
  z.object({ type: z.literal('DISEASE_GROUP'), disease: z.string().min(1), group: z.string().min(1) }),
])
export const supportedVersion = z.object({ schemaVersion: z.literal(1).optional() })
