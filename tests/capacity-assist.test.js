import assert from 'node:assert/strict'
import test from 'node:test'
import { handleCapacityAssist, isValidCapacityRequest, isValidCapacityResponse } from '../server/capacity-assist.js'

const validRequest = {
  estimatedTime: '1-3-hours',
  mentalComplexity: 'high',
  emotionalEffort: 'moderate',
  coordinationRequired: 'some-coordination',
  recoveryNeed: 'some',
}

test('accepts only the five matched point and size options', () => {
  assert.equal(isValidCapacityResponse({ points: 30, size: 'Large', reason: 'A sustained effort.', breakdownSuggestion: null }), true)
  assert.equal(isValidCapacityResponse({ points: 25, size: 'Large', reason: 'A sustained effort.', breakdownSuggestion: null }), false)
  assert.equal(isValidCapacityResponse({ points: 30, size: 'Small', reason: 'A sustained effort.', breakdownSuggestion: null }), false)
  assert.equal(isValidCapacityResponse({ points: 30, size: 'Large', reason: 'You sound burned out.', breakdownSuggestion: null }), false)
})

test('validates every required user answer', () => {
  assert.equal(isValidCapacityRequest(validRequest), true)
  assert.equal(isValidCapacityRequest({ ...validRequest, recoveryNeed: 'unknown' }), false)
  assert.equal(isValidCapacityRequest({ ...validRequest, mentalComplexity: undefined }), false)
})

test('returns a validated structured estimate', async () => {
  const fetcher = async () => new Response(JSON.stringify({
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ points: 30, size: 'Large', reason: 'This calls for sustained focus and coordination.', breakdownSuggestion: 'Consider separating preparation from review.' }) }] }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  const request = new Request('https://example.test/api/capacity-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validRequest) })
  const response = await handleCapacityAssist(request, { OPENAI_API_KEY: 'server-only-test-key' }, fetcher)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { points: 30, size: 'Large', reason: 'This calls for sustained focus and coordination.', breakdownSuggestion: 'Consider separating preparation from review.' })
})

test('fails gently when the AI service is unavailable', async () => {
  const request = new Request('https://example.test/api/capacity-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validRequest) })
  const response = await handleCapacityAssist(request, { OPENAI_API_KEY: 'server-only-test-key' }, async () => new Response('nope', { status: 500 }))
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /choose a size manually/i)
})

test('does not call the provider when no server key is configured', async () => {
  const request = new Request('https://example.test/api/capacity-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validRequest) })
  const response = await handleCapacityAssist(request, {}, () => { throw new Error('should not be called') })
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /not configured/i)
})
