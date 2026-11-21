import { ruleCondition, supportedVersion } from './condition'

type Names = {
  ingredients: Map<string, string>
  diseases: Map<string, string>
  groups: Map<string, string>
}

export function describeRule(condition: unknown, names: Names) {
  const parsed = ruleCondition.safeParse(condition)
  if (!parsed.success || !supportedVersion.safeParse(condition).success) {
    return 'Chưa thể diễn giải điều kiện của luật này. Quản trị viên cần kiểm tra lại cấu hình.'
  }
  const rule = parsed.data
  switch (rule.type) {
    case 'RECONCILE':
      return 'Yêu cầu đối chiếu khi còn thuốc bệnh nhân dùng tại nhà chưa được bác sĩ xác nhận tiếp tục hay ngừng dùng.'
    case 'DUPLICATE':
      return 'Cảnh báo khi hai y lệnh trùng thuốc hoặc có chung hoạt chất.'
    case 'ALLERGY':
      return 'Cảnh báo khi thuốc có chứa tác nhân đã ghi nhận trong tiền sử dị ứng của bệnh nhân.'
    case 'INGREDIENT_PAIR': {
      if (rule.left === 'demo_a' && rule.right === 'demo_b') {
        return 'Cảnh báo khi hai hoạt chất giả lập A và B cùng xuất hiện trong các y lệnh được kiểm tra.'
      }
      const left = names.ingredients.get(rule.left)
      const right = names.ingredients.get(rule.right)
      return left && right
        ? `Cảnh báo khi các y lệnh có đồng thời hai hoạt chất ${left} và ${right}.`
        : 'Luật kiểm tra hai hoạt chất dùng đồng thời. Danh mục còn thiếu tên hoạt chất của cặp này.'
    }
    case 'WEIGHT_LIMIT': {
      const ingredient = rule.ingredient === 'demo_a' ? 'hoạt chất giả lập A' : names.ingredients.get(rule.ingredient)
      if (!ingredient) return 'Luật kiểm tra tổng liều theo cân nặng. Danh mục còn thiếu tên hoạt chất cần kiểm tra.'
      return `Cảnh báo khi tổng liều ${ingredient} trong ngày vượt ${rule.mgPerKgDay.toLocaleString('vi-VN', { maximumSignificantDigits: 21 })} mg/kg/ngày.`
    }
    case 'DISEASE_GROUP': {
      const disease = names.diseases.get(rule.disease)
      const group = names.groups.get(rule.group)
      return disease && group
        ? `Cảnh báo khi bệnh nhân có chẩn đoán hoặc bệnh nền “${disease}” và y lệnh có thuốc thuộc nhóm “${group}”.`
        : 'Luật đối chiếu bệnh với nhóm thuốc. Danh mục còn thiếu tên bệnh hoặc tên nhóm thuốc.'
    }
  }
}
