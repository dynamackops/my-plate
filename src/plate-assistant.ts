import type { ItemCategory, ItemStatus, PlateItem } from './types'

export const assistantCapacityPoints = [5, 10, 20, 30, 40] as const

export interface PlateAssistantAddition {
  tempId: string
  title: string
  description: string | null
  category: ItemCategory
  status: ItemStatus
  capacityPoints: (typeof assistantCapacityPoints)[number]
  dueDate: string | null
  subtasks: string[]
  reason: string
}

export interface PlateAssistantUpdate {
  itemId: string
  title: string | null
  description: string | null
  clearDescription: boolean
  category: ItemCategory | null
  status: ItemStatus | null
  capacityPoints: (typeof assistantCapacityPoints)[number] | null
  dueDate: string | null
  clearDueDate: boolean
  subtasks: string[] | null
  reason: string
}

export interface PlateAssistantRemoval {
  itemId: string
  title: string
  reason: string
}

export interface PlateAssistantProposal {
  assistantMessage: string
  additions: PlateAssistantAddition[]
  updates: PlateAssistantUpdate[]
  removals: PlateAssistantRemoval[]
}

export interface PlateAssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PlateAssistantRequest {
  message: string
  currentDate: string
  items: Array<Pick<PlateItem, 'id' | 'title' | 'description' | 'category' | 'status' | 'capacityPoints' | 'dueDate' | 'subtasks'>>
  conversation: PlateAssistantMessage[]
}

const itemCategories: ItemCategory[] = ['work', 'personal', 'health', 'social', 'creative', 'waiting']
const itemStatuses: ItemStatus[] = ['active', 'waiting', 'postponed', 'completed']
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const safeText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const nullableText = (value: unknown, max: number) => value === null || (typeof value === 'string' && value.length <= max)
const validDate = (value: unknown) => value === null || (typeof value === 'string' && datePattern.test(value))
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => key in value)

export function isPlateAssistantProposal(value: unknown): value is PlateAssistantProposal {
  if (!value || typeof value !== 'object') return false
  const proposal = value as Record<string, unknown>
  if (!exactKeys(proposal, ['assistantMessage', 'additions', 'updates', 'removals'])) return false
  if (!safeText(proposal.assistantMessage, 800) || !Array.isArray(proposal.additions) || !Array.isArray(proposal.updates) || !Array.isArray(proposal.removals)) return false
  if (proposal.additions.length > 30 || proposal.updates.length > 30 || proposal.removals.length > 30) return false

  const additionsValid = proposal.additions.every((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const item = entry as Record<string, unknown>
    return exactKeys(item, ['tempId', 'title', 'description', 'category', 'status', 'capacityPoints', 'dueDate', 'subtasks', 'reason']) &&
      safeText(item.tempId, 80) && safeText(item.title, 240) && nullableText(item.description, 2000) &&
      itemCategories.includes(item.category as ItemCategory) && itemStatuses.includes(item.status as ItemStatus) &&
      assistantCapacityPoints.includes(item.capacityPoints as (typeof assistantCapacityPoints)[number]) && validDate(item.dueDate) &&
      Array.isArray(item.subtasks) && item.subtasks.length <= 20 && item.subtasks.every((step) => safeText(step, 240)) && safeText(item.reason, 400)
  })

  const updatesValid = proposal.updates.every((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const item = entry as Record<string, unknown>
    return exactKeys(item, ['itemId', 'title', 'description', 'clearDescription', 'category', 'status', 'capacityPoints', 'dueDate', 'clearDueDate', 'subtasks', 'reason']) &&
      safeText(item.itemId, 120) && nullableText(item.title, 240) && nullableText(item.description, 2000) && typeof item.clearDescription === 'boolean' &&
      (item.category === null || itemCategories.includes(item.category as ItemCategory)) &&
      (item.status === null || itemStatuses.includes(item.status as ItemStatus)) &&
      (item.capacityPoints === null || assistantCapacityPoints.includes(item.capacityPoints as (typeof assistantCapacityPoints)[number])) &&
      validDate(item.dueDate) && typeof item.clearDueDate === 'boolean' &&
      (item.subtasks === null || (Array.isArray(item.subtasks) && item.subtasks.length <= 20 && item.subtasks.every((step) => safeText(step, 240)))) && safeText(item.reason, 400)
  })

  const removalsValid = proposal.removals.every((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const item = entry as Record<string, unknown>
    return exactKeys(item, ['itemId', 'title', 'reason']) && safeText(item.itemId, 120) && safeText(item.title, 240) && safeText(item.reason, 400)
  })

  return additionsValid && updatesValid && removalsValid
}

export async function requestPlateAssistant(input: PlateAssistantRequest, signal?: AbortSignal): Promise<PlateAssistantProposal> {
  const response = await fetch('/api/plate-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : 'Plate Assistant is unavailable right now.'
    throw new Error(message)
  }
  if (!isPlateAssistantProposal(body)) throw new Error('Plate Assistant returned an unexpected proposal. Nothing was changed.')
  return body
}
