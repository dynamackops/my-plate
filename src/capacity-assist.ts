export const capacityAssistSizes = ['Tiny', 'Small', 'Medium', 'Large', 'Extra Large'] as const
export const capacityAssistPoints = [5, 10, 20, 30, 40] as const

export type CapacityAssistSize = (typeof capacityAssistSizes)[number]
export type CapacityAssistPoints = (typeof capacityAssistPoints)[number]
export type EstimatedTime = 'under-30' | '30-60' | '1-3-hours' | 'several-hours-ongoing'
export type EffortLevel = 'low' | 'moderate' | 'high'
export type CoordinationLevel = 'just-me' | 'some-coordination' | 'heavy-coordination'
export type RecoveryNeed = 'little-none' | 'some' | 'significant'

export interface CapacityAssistRequest {
  title?: string
  description?: string
  estimatedTime: EstimatedTime
  mentalComplexity: EffortLevel
  emotionalEffort: EffortLevel
  coordinationRequired: CoordinationLevel
  recoveryNeed: RecoveryNeed
}

export interface CapacityAssistResponse {
  points: CapacityAssistPoints
  size: CapacityAssistSize
  reason: string
  breakdownSuggestion: string | null
}

const pointsBySize: Record<CapacityAssistSize, CapacityAssistPoints> = {
  Tiny: 5,
  Small: 10,
  Medium: 20,
  Large: 30,
  'Extra Large': 40,
}

const unsafeSuggestionLanguage = /\b(?:burn(?:ed|t)\s*out|depress(?:ed|ion)|anxi(?:ous|ety)|adhd|autis(?:tic|m)|diagnos(?:e|ed|is)|medical claim|mental health condition|(?:must|should)\s+(?:cancel|avoid)|lazy|worthless)\b/i

export function isCapacityAssistResponse(value: unknown): value is CapacityAssistResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const allowedKeys = ['points', 'size', 'reason', 'breakdownSuggestion']
  if (Object.keys(candidate).some((key) => !allowedKeys.includes(key))) return false
  if (!capacityAssistSizes.includes(candidate.size as CapacityAssistSize)) return false
  if (!capacityAssistPoints.includes(candidate.points as CapacityAssistPoints)) return false
  if (pointsBySize[candidate.size as CapacityAssistSize] !== candidate.points) return false
  if (typeof candidate.reason !== 'string' || candidate.reason.trim().length === 0 || candidate.reason.length > 600 || unsafeSuggestionLanguage.test(candidate.reason)) return false
  return candidate.breakdownSuggestion === null || (
    typeof candidate.breakdownSuggestion === 'string' &&
    candidate.breakdownSuggestion.length <= 600 &&
    !unsafeSuggestionLanguage.test(candidate.breakdownSuggestion)
  )
}

export async function requestCapacityEstimate(input: CapacityAssistRequest, signal?: AbortSignal): Promise<CapacityAssistResponse> {
  const response = await fetch('/api/capacity-assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : 'Capacity Assist is unavailable right now.'
    throw new Error(message)
  }
  if (!isCapacityAssistResponse(body)) throw new Error('Capacity Assist returned an unexpected response. Please choose a size manually.')
  return body
}
