import { Prisma, type CheckStatus, type RuleOutcome } from '@prisma/client'
import { ruleCondition, supportedVersion } from '../drug-safety/condition'
import type { CheckContext } from './context'

function result(outcome: RuleOutcome, message: string, evidence: Prisma.InputJsonObject = {}, missingFields: string[] = []) {
  return { outcome, message, evidence, missingFields }
}
const clear = () => result('NOT_MATCHED', 'Không khớp điều kiện.')
const missing = (message: string, field: string) => result('INSUFFICIENT_DATA', message, {}, [field])

function evaluate(rule: CheckContext['rules'][number], ctx: CheckContext) {
  if (rule.scopes.length) {
    if (!ctx.diagnoses.length) return missing('Cần chẩn đoán hoặc bệnh nền để xác định phạm vi luật.', 'diagnoses')
    if (!rule.scopes.some(s => ctx.diagnoses.includes(s.diseaseCode))) return result('NOT_MATCHED', 'Ngoài phạm vi bệnh áp dụng.')
  }
  const version = supportedVersion.safeParse(rule.condition)
  if (!version.success) return result('ERROR', 'Phiên bản cấu trúc luật không được hỗ trợ.')
  const parsed = ruleCondition.safeParse(rule.condition)
  if (!parsed.success) return result('ERROR', 'Cấu hình luật không hợp lệ.')
  const config = parsed.data
  const names = (order: CheckContext['orders'][number]) => order.ingredients.map(i => i.key)
  const has = (order: CheckContext['orders'][number], key: string) => names(order).includes(key)
  switch (config.type) {
    case 'RECONCILE':
      return ctx.pending.length ? result('INSUFFICIENT_DATA', 'Còn thuốc tại nhà chưa đối chiếu.', { reviewIds: ctx.pending }, ['reconciliation']) : clear()
    case 'ALLERGY': {
      if (ctx.allergyStatus === 'UNKNOWN') return missing('Chưa xác minh tiền sử dị ứng.', 'allergyStatus')
      if (ctx.allergyStatus === 'NONE_REPORTED') return clear()
      const matches = ctx.orders.flatMap(i => i.allergens.filter(code => ctx.allergens.includes(code))
        .map(code => ({ medication: i.name, allergen: code })))
      if (matches.length) return result('MATCHED', 'Có thuốc mang tác nhân trùng với tiền sử dị ứng.', { matches })
      return ctx.orders.some(i => !i.allergens.length)
        ? missing('Chưa có ánh xạ tác nhân dị ứng cho ít nhất một thuốc.', 'medication.allergens') : clear()
    }
    case 'DUPLICATE': {
      const duplicates = new Set<string>()
      for (const [index, order] of ctx.orders.entries()) {
        for (const other of ctx.orders.slice(index + 1)) {
          if (ctx.itemId && order.id !== ctx.itemId && other.id !== ctx.itemId) continue
          if (order.medicationId === other.medicationId || names(other).some(key => has(order, key))) {
            duplicates.add(order.id)
            duplicates.add(other.id)
          }
        }
      }
      if (duplicates.size) return result('MATCHED', 'Các y lệnh trùng thuốc hoặc hoạt chất.', { orderIds: [...duplicates] })
      if (ctx.orders.some(i => !i.ingredients.length)) return missing('Chưa đủ thành phần hoạt chất.', 'medication.ingredients')
      return clear()
    }
    case 'INGREDIENT_PAIR': {
      const present = (key: string) => ctx.orders.some(i => has(i, key))
      if (present(config.left) && present(config.right)) return result('MATCHED', 'Có cặp hoạt chất thuộc luật thí điểm.', { ingredients: [config.left, config.right] })
      return ctx.orders.some(i => !i.ingredients.length) ? missing('Chưa đủ thành phần để đối chiếu cặp hoạt chất.', 'medication.ingredients') : clear()
    }
    case 'DISEASE_GROUP':
      if (!ctx.orders.some(i => i.groups.includes(config.group))) return clear()
      if (!ctx.diagnoses.length) return missing('Chưa ghi chẩn đoán cho đợt điều trị.', 'diagnoses')
      return ctx.diagnoses.includes(config.disease)
        ? result('MATCHED', 'Chẩn đoán và nhóm thuốc khớp luật thí điểm.', { disease: config.disease, group: config.group }) : clear()
    case 'WEIGHT_LIMIT': {
      const targets = ctx.orders.filter(i => has(i, config.ingredient))
      if (ctx.orders.some(i => !i.ingredients.length)) return missing('Thiếu thành phần để tính tổng liều hoạt chất.', 'medication.ingredients')
      if (!targets.length) return clear()
      if (!ctx.kilograms) return missing('Thiếu cân nặng trong đợt điều trị.', 'weight')
      if (targets.some(i => !i.timesPerDay || i.unit !== i.baseUnit)) return missing('Thiếu lịch cố định hoặc đơn vị quy đổi.', 'scheduleOrUnit')
      const total = targets.reduce((sum, i) => {
        const ingredient = i.ingredients.find(a => a.key === config.ingredient)!
        return sum.add(new Prisma.Decimal(i.dose).mul(ingredient.amount).mul(i.timesPerDay!))
      }, new Prisma.Decimal(0))
      const evidence = { ingredient: config.ingredient, totalMgDay: total.toString(), kilograms: ctx.kilograms, mgPerKgDay: config.mgPerKgDay }
      return total.gt(new Prisma.Decimal(ctx.kilograms).mul(config.mgPerKgDay))
        ? result('MATCHED', 'Tổng liều vượt ngưỡng của luật thí điểm.', evidence) : result('NOT_MATCHED', 'Trong ngưỡng luật thí điểm.', evidence)
    }
  }
}
export function runChecks(ctx: CheckContext) {
  const results = ctx.rules.map(rule => ({
    ruleCode: rule.code, ruleVersion: rule.version, ...evaluate(rule, ctx),
  }))
  const outcomes = new Set(results.map(r => r.outcome))
  const status: CheckStatus = outcomes.has('ERROR') ? 'ERROR' : outcomes.has('INSUFFICIENT_DATA') ? 'INSUFFICIENT_DATA'
    : outcomes.has('MATCHED') ? 'HAS_ALERT' : 'NO_ALERT'
  return { status, results }
}
