import { useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, Sparkles, X } from 'lucide-react'
import {
  requestCapacityEstimate,
  type CapacityAssistPoints,
  type CapacityAssistRequest,
  type CapacityAssistResponse,
  type CoordinationLevel,
  type EffortLevel,
  type EstimatedTime,
  type RecoveryNeed,
} from './capacity-assist'

interface CapacityAssistProps {
  title: string
  description: string
  onUse: (points: CapacityAssistPoints) => void
  onChooseDifferent: () => void
  onCancel: () => void
}

const initialAnswers: Omit<CapacityAssistRequest, 'title' | 'description'> = {
  estimatedTime: '30-60',
  mentalComplexity: 'moderate',
  emotionalEffort: 'moderate',
  coordinationRequired: 'just-me',
  recoveryNeed: 'little-none',
}

export function CapacityAssist({ title, description, onUse, onChooseDifferent, onCancel }: CapacityAssistProps) {
  const [answers, setAnswers] = useState(initialAnswers)
  const [result, setResult] = useState<CapacityAssistResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const setAnswer = <K extends keyof typeof answers>(key: K, value: (typeof answers)[K]) => {
    setAnswers((current) => ({ ...current, [key]: value }))
    setResult(null)
    setError('')
  }

  const estimate = async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const suggestion = await requestCapacityEstimate({
        ...answers,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      }, controller.signal)
      setResult(suggestion)
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(caught instanceof Error ? caught.message : 'Capacity Assist is unavailable right now. Please choose a size manually.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <section className="assist-panel" aria-labelledby="capacity-assist-title">
      <div className="assist-heading">
        <div><span className="assist-icon"><Sparkles size={17} /></span><div><h3 id="capacity-assist-title">Capacity Assist</h3><p>Share what this task may ask of you.</p></div></div>
        <button type="button" className="assist-close" onClick={onCancel} aria-label="Close Capacity Assist"><X size={17} /></button>
      </div>

      <div className="assist-fields">
        <label className="field"><span>Estimated time</span><select value={answers.estimatedTime} onChange={(event) => setAnswer('estimatedTime', event.target.value as EstimatedTime)}><option value="under-30">Under 30 minutes</option><option value="30-60">30–60 minutes</option><option value="1-3-hours">1–3 hours</option><option value="several-hours-ongoing">Several hours / ongoing</option></select></label>
        <label className="field"><span>Mental complexity</span><select value={answers.mentalComplexity} onChange={(event) => setAnswer('mentalComplexity', event.target.value as EffortLevel)}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label className="field"><span>Emotional effort</span><select value={answers.emotionalEffort} onChange={(event) => setAnswer('emotionalEffort', event.target.value as EffortLevel)}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        <label className="field"><span>Coordination required</span><select value={answers.coordinationRequired} onChange={(event) => setAnswer('coordinationRequired', event.target.value as CoordinationLevel)}><option value="just-me">Just me</option><option value="some-coordination">Some coordination with others</option><option value="heavy-coordination">Heavy coordination / waiting on others</option></select></label>
        <label className="field"><span>Recovery need</span><select value={answers.recoveryNeed} onChange={(event) => setAnswer('recoveryNeed', event.target.value as RecoveryNeed)}><option value="little-none">Little or none</option><option value="some">Some recovery afterward</option><option value="significant">Significant recovery afterward</option></select></label>
      </div>

      {!result && <button type="button" className="assist-submit" onClick={estimate} disabled={loading}>
        {loading ? <><LoaderCircle className="spin" size={17} /> Estimating…</> : <><Sparkles size={17} /> Get suggestion</>}
      </button>}

      {error && <div className="assist-error" role="alert"><strong>We couldn’t make a suggestion.</strong><span>{error} You can keep choosing capacity manually.</span></div>}

      {result && <div className="assist-result" aria-live="polite">
        <p className="eyebrow">SUGGESTED CAPACITY</p>
        <div className="assist-recommendation"><strong>{result.points}</strong><div><b>{result.size}</b><span>capacity points</span></div></div>
        <p>{result.reason}</p>
        {result.breakdownSuggestion && <div className="assist-breakdown"><Sparkles size={15} /><span>{result.breakdownSuggestion}</span></div>}
        <div className="assist-result-actions">
          <button type="button" className="primary-button" onClick={() => onUse(result.points)}><Check size={16} /> Use {result.points} points</button>
          <button type="button" className="quiet-button" onClick={onChooseDifferent}>Choose a different size</button>
          <button type="button" className="assist-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>}

      <p className="assist-note">AI suggestions are informational. You know your capacity best.</p>
    </section>
  )
}
