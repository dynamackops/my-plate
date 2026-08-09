import assert from 'node:assert/strict'
import test from 'node:test'
import { handlePlateAssistant, isValidPlateAssistantProposal, isValidPlateAssistantRequest } from '../server/plate-assistant.js'

const currentItem = {
  id: 'item-1', title: 'Finish deck', description: 'Draft is ready', category: 'work', status: 'active', capacityPoints: 20,
  dueDate: '2026-08-12', subtasks: [{ id: 'step-1', title: 'Review slides', completed: false }],
}

const validRequest = {
  message: 'Add groceries and move the deck to Friday.',
  currentDate: '2026-08-08',
  items: [currentItem],
  conversation: [{ role: 'user', content: 'Add groceries and move the deck to Friday.' }],
}

const validProposal = {
  assistantMessage: 'I found one new item and one date change for you to review.',
  additions: [{ tempId: 'new-1', title: 'Buy groceries', description: null, category: 'personal', status: 'active', capacityPoints: 10, dueDate: null, subtasks: [], reason: 'You named this as a separate task.' }],
  updates: [{ itemId: 'item-1', title: null, description: null, clearDescription: false, category: null, status: null, capacityPoints: null, dueDate: '2026-08-14', clearDueDate: false, subtasks: null, reason: 'You asked to move the deck to Friday.' }],
  removals: [],
}

test('validates a bounded brain dump and current plate', () => {
  assert.equal(isValidPlateAssistantRequest(validRequest), true)
  assert.equal(isValidPlateAssistantRequest({ ...validRequest, message: '' }), false)
  assert.equal(isValidPlateAssistantRequest({ ...validRequest, currentDate: 'Friday' }), false)
})

test('accepts only safe proposals referencing current item ids', () => {
  assert.equal(isValidPlateAssistantProposal(validProposal, ['item-1']), true)
  assert.equal(isValidPlateAssistantProposal({ ...validProposal, updates: [{ ...validProposal.updates[0], itemId: 'invented' }] }, ['item-1']), false)
  assert.equal(isValidPlateAssistantProposal({ ...validProposal, additions: [{ ...validProposal.additions[0], capacityPoints: 25 }] }, ['item-1']), false)
})

test('returns a validated review-only proposal', async () => {
  const fetcher = async () => new Response(JSON.stringify({ status: 'completed', output_text: JSON.stringify(validProposal) }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  const request = new Request('https://example.test/api/plate-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validRequest) })
  const response = await handlePlateAssistant(request, { OPENAI_API_KEY: 'server-only-test-key' }, fetcher)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), validProposal)
})

test('fails without changing anything when the provider is unavailable', async () => {
  const request = new Request('https://example.test/api/plate-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validRequest) })
  const response = await handlePlateAssistant(request, { OPENAI_API_KEY: 'server-only-test-key' }, async () => new Response('nope', { status: 500 }))
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /nothing was changed/i)
})
