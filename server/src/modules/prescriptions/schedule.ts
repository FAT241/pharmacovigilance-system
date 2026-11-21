import { z } from 'zod'

export const dayParts = ['Sáng', 'Trưa', 'Chiều', 'Tối'] as const
export const scheduleSlots = z.array(z.enum(dayParts)).max(4).refine(items => new Set(items).size === items.length, 'Buổi dùng thuốc bị trùng.')
export function fixedSchedule(timesPerDay: number, slots?: string[]) {
  const ordered = dayParts.filter(s => slots?.includes(s))
  return { schemaVersion: 1, type: 'FIXED', timesPerDay, ...(ordered.length ? { slots: ordered } : {}) }
}
