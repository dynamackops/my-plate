import { useMemo, useRef, useState } from 'react'
import { Check, LoaderCircle, MessageCircle, Mic, Send, Sparkles, WandSparkles, X } from 'lucide-react'
import { categoryMeta, formatDueDate } from './lib'
import {
  requestPlateAssistant,
  type PlateAssistantMessage,
  type PlateAssistantProposal,
  type PlateAssistantUpdate,
} from './plate-assistant'
import { usePlateStore } from './store'
import type { PlateItem } from './types'
import { useDictation } from './useDictation'

function updateSummary(update: PlateAssistantUpdate) {
  const parts: string[] = []
  if (update.title) parts.push(`rename to “${update.title}”`)
  if (update.category) parts.push(`move to ${categoryMeta[update.category].label}`)
  if (update.status) parts.push(`mark ${update.status}`)
  if (update.capacityPoints) parts.push(`set to ${update.capacityPoints} points`)
  if (update.dueDate) parts.push(`due ${formatDueDate(update.dueDate)}`)
  if (update.clearDueDate) parts.push('remove the due date')
  if (update.description) parts.push('update the description')
  if (update.clearDescription) parts.push('clear the description')
  if (update.subtasks) parts.push(`replace steps with ${update.subtasks.length} suggested step${update.subtasks.length === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'No field changes proposed'
}

export function PlateAssistant({ items, periodId, hasSampleData, onClose }: { items: PlateItem[]; periodId: string; hasSampleData: boolean; onClose: () => void }) {
  const addItem = usePlateStore((state) => state.addItem)
  const updateItem = usePlateStore((state) => state.updateItem)
  const deleteItem = usePlateStore((state) => state.deleteItem)
  const clearSampleData = usePlateStore((state) => state.clearSampleData)
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<PlateAssistantMessage[]>([])
  const [proposal, setProposal] = useState<PlateAssistantProposal | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appliedMessage, setAppliedMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dictation = useDictation((_, transcript) => setMessage((current) => current.trimEnd() ? `${current.trimEnd()} ${transcript}` : transcript))

  const changeCount = (proposal?.additions.length ?? 0) + (proposal?.updates.length ?? 0) + (proposal?.removals.length ?? 0)
  const allKeys = useMemo(() => proposal ? [
    ...proposal.additions.map((item) => `add:${item.tempId}`),
    ...proposal.updates.map((item) => `update:${item.itemId}`),
    ...proposal.removals.map((item) => `remove:${item.itemId}`),
  ] : [], [proposal])

  const toggle = (key: string) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    setAppliedMessage('')
    setProposal(null)
    const nextConversation: PlateAssistantMessage[] = [...conversation, { role: 'user', content: trimmed }]
    setConversation(nextConversation)
    setMessage('')
    try {
      const response = await requestPlateAssistant({
        message: trimmed,
        currentDate: new Date().toISOString().slice(0, 10),
        items: items.map(({ id, title, description, category, status, capacityPoints, dueDate, subtasks }) => ({ id, title, description, category, status, capacityPoints, dueDate, subtasks })),
        conversation: conversation.slice(-8),
      })
      setProposal(response)
      setSelected(new Set([
        ...response.additions.map((item) => `add:${item.tempId}`),
        ...response.updates.map((item) => `update:${item.itemId}`),
        ...response.removals.map((item) => `remove:${item.itemId}`),
      ]))
      setConversation((current) => [...current, { role: 'assistant', content: response.assistantMessage }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Plate Assistant is unavailable right now. Nothing was changed.')
    } finally {
      setLoading(false)
    }
  }

  const applyChanges = () => {
    if (!proposal || selected.size === 0) return
    if (hasSampleData && proposal.additions.some((item) => selected.has(`add:${item.tempId}`))) clearSampleData()
    const timestamp = new Date().toISOString()

    proposal.additions.forEach((item) => {
      if (!selected.has(`add:${item.tempId}`)) return
      addItem({
        id: crypto.randomUUID(),
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        category: item.category,
        status: item.category === 'waiting' ? 'waiting' : item.status,
        capacityPoints: item.capacityPoints,
        icon: categoryMeta[item.category].icon,
        dueDate: item.dueDate || undefined,
        planningPeriodId: periodId,
        subtasks: item.subtasks.map((title) => ({ id: crypto.randomUUID(), title, completed: false })),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    })

    proposal.updates.forEach((change) => {
      if (!selected.has(`update:${change.itemId}`)) return
      const existing = items.find((item) => item.id === change.itemId)
      if (!existing) return
      const patch: Partial<PlateItem> = {}
      if (change.title) patch.title = change.title.trim()
      if (change.clearDescription) patch.description = undefined
      else if (change.description !== null) patch.description = change.description.trim()
      if (change.category) patch.category = change.category
      if (change.status) patch.status = change.status
      if (change.capacityPoints) patch.capacityPoints = change.capacityPoints
      if (change.clearDueDate) patch.dueDate = undefined
      else if (change.dueDate !== null) patch.dueDate = change.dueDate
      if (change.subtasks !== null) patch.subtasks = change.subtasks.map((title) => {
        const previous = existing.subtasks.find((step) => step.title.toLowerCase() === title.toLowerCase())
        return { id: previous?.id ?? crypto.randomUUID(), title, completed: previous?.completed ?? false }
      })
      const finalCategory = change.category ?? existing.category
      const finalStatus = change.status ?? existing.status
      if (finalCategory === 'waiting' && finalStatus === 'active') patch.status = 'waiting'
      updateItem(change.itemId, patch)
    })

    proposal.removals.forEach((item) => {
      if (selected.has(`remove:${item.itemId}`)) deleteItem(item.itemId)
    })

    const applied = selected.size
    setProposal(null)
    setSelected(new Set())
    setAppliedMessage(`Done — I applied ${applied} change${applied === 1 ? '' : 's'} to your plate. You can keep chatting if anything needs adjusting.`)
  }

  return (
    <div className="modal-backdrop assistant-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="modal-card plate-assistant-modal" role="dialog" aria-modal="true" aria-labelledby="plate-assistant-title">
        <div className="assistant-header">
          <div className="assistant-title-wrap"><span className="assistant-mark"><WandSparkles size={21} /></span><div><p className="eyebrow">A GENTLER WAY TO BEGIN</p><h2 id="plate-assistant-title">Brain dump your plate</h2></div></div>
          <button className="icon-button" onClick={onClose} aria-label="Close Plate Assistant"><X size={20} /></button>
        </div>

        <div className="assistant-body">
          {conversation.length === 0 && <div className="assistant-intro">
            <h3>Say everything that’s taking up space.</h3>
            <p>Messy is welcome. Paste a list, ramble, dictate, or describe what changed. I’ll sort it into a proposal for you to review before anything touches your plate.</p>
            <div className="assistant-prompts">
              <button type="button" onClick={() => { setMessage('Here’s everything on my mind right now: '); textareaRef.current?.focus() }}>Set up my plate</button>
              <button type="button" onClick={() => { setMessage('Please help me update my plate. '); textareaRef.current?.focus() }}>Edit what’s here</button>
              <button type="button" onClick={() => { setMessage('Help me break these things into manageable steps: '); textareaRef.current?.focus() }}>Break things down</button>
            </div>
          </div>}

          {conversation.length > 0 && <div className="assistant-conversation" aria-live="polite">
            {conversation.map((entry, index) => <div className={`assistant-bubble ${entry.role}`} key={`${entry.role}-${index}`}><span>{entry.role === 'assistant' ? <Sparkles size={14} /> : 'You'}</span><p>{entry.content}</p></div>)}
            {loading && <div className="assistant-thinking"><LoaderCircle className="spin" size={17} /> Sorting this gently…</div>}
          </div>}

          {proposal && <section className="assistant-proposal" aria-label="Proposed plate changes">
            <div className="proposal-heading"><div><p className="eyebrow">REVIEW BEFORE APPLYING</p><h3>{changeCount ? `${changeCount} proposed change${changeCount === 1 ? '' : 's'}` : 'No changes needed yet'}</h3></div>{changeCount > 0 && <button type="button" onClick={() => setSelected(selected.size === allKeys.length ? new Set() : new Set(allKeys))}>{selected.size === allKeys.length ? 'Select none' : 'Select all'}</button>}</div>
            <div className="proposal-list">
              {proposal.additions.map((item) => <label className="proposal-card add" key={`add:${item.tempId}`}><input type="checkbox" checked={selected.has(`add:${item.tempId}`)} onChange={() => toggle(`add:${item.tempId}`)} /><span className="proposal-icon" style={{ background: categoryMeta[item.category].soft }}>{categoryMeta[item.category].icon}</span><span className="proposal-copy"><span className="proposal-kind">ADD · {categoryMeta[item.category].label}</span><strong>{item.title}</strong><small>{item.capacityPoints} pts{item.dueDate ? ` · due ${formatDueDate(item.dueDate)}` : ''}</small><em>{item.reason}</em>{item.subtasks.length > 0 && <span className="proposal-steps">{item.subtasks.length} suggested step{item.subtasks.length === 1 ? '' : 's'}</span>}</span></label>)}
              {proposal.updates.map((item) => {
                const existing = items.find((candidate) => candidate.id === item.itemId)
                return <label className="proposal-card update" key={`update:${item.itemId}`}><input type="checkbox" checked={selected.has(`update:${item.itemId}`)} onChange={() => toggle(`update:${item.itemId}`)} /><span className="proposal-icon"><MessageCircle size={18} /></span><span className="proposal-copy"><span className="proposal-kind">EDIT</span><strong>{existing?.title ?? item.itemId}</strong><small>{updateSummary(item)}</small><em>{item.reason}</em></span></label>
              })}
              {proposal.removals.map((item) => <label className="proposal-card remove" key={`remove:${item.itemId}`}><input type="checkbox" checked={selected.has(`remove:${item.itemId}`)} onChange={() => toggle(`remove:${item.itemId}`)} /><span className="proposal-icon"><X size={18} /></span><span className="proposal-copy"><span className="proposal-kind">REMOVE</span><strong>{item.title}</strong><em>{item.reason}</em></span></label>)}
            </div>
            {selected.size > 0 && <button type="button" className="primary-button apply-proposal" onClick={applyChanges}><Check size={17} /> Apply {selected.size} selected change{selected.size === 1 ? '' : 's'}</button>}
            <p className="proposal-note">Nothing changes until you confirm. You can uncheck anything that doesn’t feel right.</p>
          </section>}

          {appliedMessage && <div className="assistant-success" role="status"><Check size={17} /><p>{appliedMessage}</p></div>}
          {error && <div className="assist-error" role="alert"><strong>Nothing was changed.</strong><span>{error}</span></div>}
        </div>

        <form className="assistant-composer" onSubmit={submit}>
          <div className="assistant-composer-tools">
            <span>Talk it out or type it however it comes.</span>
            <div className="voice-actions">
              <button type="button" className={dictation.listeningTarget === 'assistant' ? 'listening' : ''} onClick={() => dictation.start('assistant')} disabled={!dictation.supported}><Mic size={14} /> {dictation.listeningTarget === 'assistant' ? 'Listening…' : 'Dictate'}</button>
              <button type="button" className="wispr-button" onClick={() => dictation.prepareWispr('assistant', () => textareaRef.current?.focus())}><Sparkles size={14} /> Wispr Flow</button>
            </div>
          </div>
          <div className="assistant-input-row"><textarea ref={textareaRef} autoFocus value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="I need to finish the deck, call my doctor, plan dinner… and the laundry can wait until next week." maxLength={6000} rows={3} /><button type="submit" disabled={!message.trim() || loading} aria-label="Send to Plate Assistant"><Send size={19} /></button></div>
          {dictation.feedback?.target === 'assistant' && <p className="voice-feedback" role="status">{dictation.feedback.text}</p>}
          <p className="assistant-privacy">Only this message and the items on the current plate are sent for this request. AI suggestions are optional and may need correction.</p>
        </form>
      </section>
    </div>
  )
}
