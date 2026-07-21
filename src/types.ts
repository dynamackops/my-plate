export const categories = ['all', 'work', 'personal', 'health', 'social', 'creative', 'waiting'] as const
export type Category = (typeof categories)[number]
export type ItemCategory = Exclude<Category, 'all'>
export type ItemStatus = 'active' | 'waiting' | 'postponed' | 'completed'
export type PeriodType = 'weekly' | 'biweekly' | 'monthly'

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface PlateItem {
  id: string
  title: string
  description?: string
  category: ItemCategory
  status: ItemStatus
  capacityPoints: number
  suggestedCapacityPoints?: number
  icon: string
  dueDate?: string
  estimatedTime?: string
  mentalEffort?: 1 | 2 | 3
  emotionalEffort?: 1 | 2 | 3
  socialEffort?: 1 | 2 | 3
  sensoryEffort?: 1 | 2 | 3
  recoveryNeeded?: boolean
  planningPeriodId: string
  subtasks: Subtask[]
  createdAt: string
  updatedAt: string
}

export interface Preferences {
  reducedMotion: boolean
  largeText: boolean
  highContrast: boolean
  decorativeVisuals: boolean
  compactCards: boolean
}

export interface FullnessState {
  label: string
  message: string
  tone: 'open' | 'balanced' | 'getting-full' | 'full' | 'overflowing'
}
