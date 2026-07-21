import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createPeriodId, defaultLimits } from './lib'
import type { ItemCategory, PeriodType, PlateItem, Preferences, Subtask } from './types'

const now = new Date().toISOString()
const futureDate = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const seedItems: PlateItem[] = [
  { id: 'seed-video', title: 'Finish creative video', description: 'Polish the final cut and export.', category: 'creative', status: 'active', capacityPoints: 30, icon: '🎬', dueDate: futureDate(5), planningPeriodId: createPeriodId('weekly', 0), subtasks: [{ id: 's1', title: 'Review rough cut', completed: true }, { id: 's2', title: 'Finish color pass', completed: false }, { id: 's3', title: 'Export final', completed: false }], createdAt: now, updatedAt: now },
  { id: 'seed-call', title: 'Call dermatologist', category: 'health', status: 'active', capacityPoints: 5, icon: '☎️', dueDate: futureDate(1), planningPeriodId: createPeriodId('weekly', 0), subtasks: [], createdAt: now, updatedAt: now },
  { id: 'seed-client', title: 'Complete client project', description: 'Wrap up final deliverables and send for review.', category: 'work', status: 'active', capacityPoints: 25, icon: '💼', dueDate: futureDate(3), planningPeriodId: createPeriodId('weekly', 0), subtasks: [{ id: 's4', title: 'Finish revisions', completed: true }, { id: 's5', title: 'QA deliverables', completed: false }, { id: 's6', title: 'Send handoff', completed: false }], createdAt: now, updatedAt: now },
  { id: 'seed-grocery', title: 'Grocery shopping', category: 'personal', status: 'active', capacityPoints: 10, icon: '🧺', planningPeriodId: createPeriodId('weekly', 0), subtasks: [], createdAt: now, updatedAt: now },
  { id: 'seed-insurance', title: 'Wait for insurance response', category: 'waiting', status: 'waiting', capacityPoints: 5, icon: '◷', planningPeriodId: createPeriodId('weekly', 0), subtasks: [], createdAt: now, updatedAt: now },
]

interface PlateStore {
  items: PlateItem[]
  categoryLimits: Record<ItemCategory, number>
  totalCapacity: number
  periodType: PeriodType
  periodOffset: number
  preferences: Preferences
  hasSampleData: boolean
  addItem: (item: PlateItem) => void
  updateItem: (id: string, patch: Partial<PlateItem>) => void
  deleteItem: (id: string) => void
  clearSampleData: () => void
  toggleSubtask: (itemId: string, subtaskId: string) => void
  addSubtask: (itemId: string, title: string) => void
  setCategoryLimit: (category: ItemCategory, limit: number) => void
  setTotalCapacity: (capacity: number) => void
  setPeriodType: (type: PeriodType) => void
  setPeriodOffset: (offset: number) => void
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  resetAll: () => void
}

const initialPreferences: Preferences = { reducedMotion: false, largeText: false, highContrast: false, decorativeVisuals: true, compactCards: false }

export const usePlateStore = create<PlateStore>()(
  persist(
    (set) => ({
      items: seedItems,
      categoryLimits: defaultLimits,
      totalCapacity: 100,
      periodType: 'weekly',
      periodOffset: 0,
      preferences: initialPreferences,
      hasSampleData: true,
      addItem: (item) => set((state) => ({ items: [...state.items, item], hasSampleData: false })),
      updateItem: (id, patch) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) })),
      deleteItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id), hasSampleData: false })),
      clearSampleData: () => set((state) => ({ items: state.items.filter((item) => !item.id.startsWith('seed-')), hasSampleData: false })),
      toggleSubtask: (itemId, subtaskId) => set((state) => ({ items: state.items.map((item) => item.id === itemId ? { ...item, subtasks: item.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask) } : item) })),
      addSubtask: (itemId, title) => set((state) => ({ items: state.items.map((item) => item.id === itemId ? { ...item, subtasks: [...item.subtasks, { id: crypto.randomUUID(), title, completed: false } satisfies Subtask] } : item) })),
      setCategoryLimit: (category, limit) => set((state) => ({ categoryLimits: { ...state.categoryLimits, [category]: limit } })),
      setTotalCapacity: (totalCapacity) => set({ totalCapacity }),
      setPeriodType: (periodType) => set({ periodType, periodOffset: 0 }),
      setPeriodOffset: (periodOffset) => set({ periodOffset }),
      setPreference: (key, value) => set((state) => ({ preferences: { ...state.preferences, [key]: value } })),
      resetAll: () => set({ items: seedItems, categoryLimits: defaultLimits, totalCapacity: 100, periodType: 'weekly', periodOffset: 0, preferences: initialPreferences, hasSampleData: true }),
    }),
    { name: 'my-plate-storage-v1' },
  ),
)
