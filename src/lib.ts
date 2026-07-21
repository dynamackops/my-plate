import type { FullnessState, ItemCategory, PeriodType, PlateItem } from './types'

export const categoryMeta: Record<ItemCategory, { label: string; color: string; soft: string; icon: string }> = {
  work: { label: 'Work', color: '#5d7d74', soft: '#dfeae6', icon: '💼' },
  personal: { label: 'Personal', color: '#af795d', soft: '#f1e2d8', icon: '🏡' },
  health: { label: 'Health', color: '#9b5f69', soft: '#f1dfe2', icon: '♥' },
  social: { label: 'Social', color: '#6f75a3', soft: '#e4e5f0', icon: '☕' },
  creative: { label: 'Creative', color: '#a1773e', soft: '#f2e8d5', icon: '🎨' },
  waiting: { label: 'Waiting', color: '#71706d', soft: '#e7e5e1', icon: '◷' },
}

export const defaultLimits: Record<ItemCategory, number> = {
  work: 35,
  personal: 20,
  health: 15,
  social: 10,
  creative: 15,
  waiting: 5,
}

export const createPeriodId = (type: PeriodType, offset: number) => `${type}:${offset}`

export function getPeriodRange(type: PeriodType, offset: number) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  let start: Date
  let end: Date
  if (type === 'monthly') {
    start = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12)
    end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0, 12)
  } else {
    const mondayIndex = (today.getDay() + 6) % 7
    const span = type === 'weekly' ? 7 : 14
    start = new Date(today)
    start.setDate(today.getDate() - mondayIndex + offset * span)
    end = new Date(start)
    end.setDate(start.getDate() + span - 1)
  }
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  const year = end.getFullYear() !== today.getFullYear() ? `, ${end.getFullYear()}` : ''
  return { start, end, label: `${formatter.format(start)} – ${formatter.format(end)}${year}` }
}

export function getFullness(percent: number): FullnessState {
  if (percent < 50) return { label: 'Open', message: 'You still have room on your plate.', tone: 'open' }
  if (percent < 75) return { label: 'Balanced', message: 'Your plate looks manageable.', tone: 'balanced' }
  if (percent < 90) return { label: 'Getting full', message: 'Your plate is getting full. Consider what deserves your energy.', tone: 'getting-full' }
  if (percent <= 100) return { label: 'Full', message: 'Your plate is full. Adding something may require moving another item.', tone: 'full' }
  return { label: 'Overflowing', message: 'You are carrying more than your selected capacity. This is information, not failure.', tone: 'overflowing' }
}

export function suggestedActions(items: PlateItem[]) {
  const active = items.filter((item) => item.status === 'active')
  const byDate = [...active].filter((item) => item.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const urgentSmall = byDate.find((item) => item.capacityPoints <= 10) ?? active.find((item) => item.capacityPoints <= 10)
  const closest = byDate.find((item) => item.id !== urgentSmall?.id)
  const biggest = [...active].sort((a, b) => b.capacityPoints - a.capacityPoints).find((item) => item.id !== urgentSmall?.id && item.id !== closest?.id)
  return [urgentSmall, closest, biggest].filter(Boolean) as PlateItem[]
}

export function formatDueDate(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}
