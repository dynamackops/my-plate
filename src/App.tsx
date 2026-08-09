import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Edit3,
  Expand,
  Eye,
  Filter,
  Focus,
  LayoutList,
  Mic,
  MoreHorizontal,
  Pause,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { categoryMeta, createPeriodId, formatDueDate, getFullness, getPeriodRange, suggestedActions } from './lib'
import { CapacityAssist } from './CapacityAssist'
import { PlateAssistant } from './PlateAssistant'
import { usePlateStore } from './store'
import { categories, type Category, type ItemCategory, type ItemStatus, type PlateItem, type PeriodType } from './types'
import { useDictation, type DictationTarget } from './useDictation'

const capacityOptions = [
  { value: 5, label: 'Tiny', hint: 'A quick, light lift' },
  { value: 10, label: 'Small', hint: 'Needs a little focus' },
  { value: 20, label: 'Medium', hint: 'A meaningful effort' },
  { value: 30, label: 'Large', hint: 'A major commitment' },
  { value: 40, label: 'Extra large', hint: 'A lot to carry' },
]

const icons = ['✨', '💼', '☎️', '📅', '🔎', '📚', '🎨', '🎬', '🧺', '🧹', '🏡', '♥', '☕', '🌿', '◷', '✉️']

function clampScore(score: number) {
  return Math.max(5, Math.min(40, score))
}

function scoreEstimate(time: string, multipleSteps: boolean, mental: number, emotional: number, social: number, sensory: number, recovery: boolean) {
  const timeScores: Record<string, number> = { 'under-15': 3, '15-30': 5, '30-60': 8, '1-3-hours': 12, 'several-hours': 18, ongoing: 25 }
  return clampScore((timeScores[time] ?? 5) + (multipleSteps ? 5 : 0) + (mental === 3 ? 5 : 0) + (emotional === 3 ? 5 : 0) + (social === 3 ? 4 : 0) + (sensory === 3 ? 4 : 0) + (recovery ? 4 : 0))
}

function App() {
  const store = usePlateStore()
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [modal, setModal] = useState<'add' | 'edit' | 'settings' | 'assistant' | null>(null)
  const [selectedItem, setSelectedItem] = useState<PlateItem | null>(null)
  const [editingItem, setEditingItem] = useState<PlateItem | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const periodId = createPeriodId(store.periodType, store.periodOffset)
  const period = getPeriodRange(store.periodType, store.periodOffset)

  const currentItems = useMemo(() => store.items.filter((item) => item.planningPeriodId === periodId), [store.items, periodId])
  const capacityItems = currentItems.filter((item) => item.status === 'active' || item.status === 'waiting')
  const totalPoints = capacityItems.reduce((sum, item) => sum + item.capacityPoints, 0)
  const overallPercent = Math.round((totalPoints / store.totalCapacity) * 100)
  const fullness = getFullness(overallPercent)
  const categoryPoints = selectedCategory === 'all' ? totalPoints : capacityItems.filter((item) => item.category === selectedCategory).reduce((sum, item) => sum + item.capacityPoints, 0)
  const categoryPercent = selectedCategory === 'all' ? overallPercent : Math.round((categoryPoints / store.categoryLimits[selectedCategory]) * 100)
  const visibleItems = selectedCategory === 'all' ? currentItems : currentItems.filter((item) => item.category === selectedCategory)

  const openAdd = () => {
    setEditingItem(null)
    setModal('add')
  }
  const openEdit = (item: PlateItem) => {
    setEditingItem(item)
    setSelectedItem(null)
    setModal('edit')
  }

  if (focusMode) {
    return <FocusDisplay items={capacityItems} overallPercent={overallPercent} fullness={fullness} onExit={() => setFocusMode(false)} />
  }

  const preferenceClasses = [
    store.preferences.largeText ? 'large-text' : '',
    store.preferences.highContrast ? 'high-contrast' : '',
    store.preferences.reducedMotion ? 'reduce-motion' : '',
  ].join(' ')

  return (
    <div className={`app-shell ${preferenceClasses}`}>
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="My Plate home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>My Plate</span>
        </a>
        <div className="header-actions">
          <button className="quiet-button hide-mobile" onClick={() => setFocusMode(true)}><Focus size={17} /> Focus display</button>
          <button className="soft-button assistant-entry hide-mobile" onClick={() => setModal('assistant')}><BrainCircuit size={18} /> Brain dump</button>
          <button className="icon-button" onClick={() => setModal('settings')} aria-label="Open settings"><Settings size={20} /></button>
          <button className="primary-button hide-mobile" onClick={openAdd}><Plus size={18} /> Add item</button>
        </div>
      </header>

      <main id="main-content">
        <section className="welcome-row" aria-labelledby="page-heading">
          <div>
            <p className="eyebrow">YOUR CURRENT CAPACITY</p>
            <h1 id="page-heading">What’s on your plate?</h1>
            <p className="support-copy">A gentle view of everything asking for your energy.</p>
          </div>
          <PlanningPeriod
            type={store.periodType}
            offset={store.periodOffset}
            label={period.label}
            onType={store.setPeriodType}
            onOffset={store.setPeriodOffset}
          />
        </section>

        {store.hasSampleData && <section className="brain-dump-callout" aria-labelledby="brain-dump-heading">
          <span className="brain-dump-icon"><BrainCircuit size={24} /></span>
          <div><p className="eyebrow">SKIP THE STEP-BY-STEP SETUP</p><h2 id="brain-dump-heading">Start with everything on your mind.</h2><p>Type, paste, or talk through the whole messy list. Plate Assistant will organize it into a proposal you can review before replacing the sample items.</p></div>
          <button className="primary-button" onClick={() => setModal('assistant')}><Sparkles size={17} /> Start a brain dump</button>
        </section>}

        <CapacitySummary
          points={totalPoints}
          total={store.totalCapacity}
          percent={overallPercent}
          fullness={fullness}
          category={selectedCategory}
          categoryPoints={categoryPoints}
          categoryPercent={categoryPercent}
          categoryLimit={selectedCategory === 'all' ? store.totalCapacity : store.categoryLimits[selectedCategory]}
        />

        <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} items={capacityItems} />

        <section className="dashboard-grid">
          <PlateVisualization
            items={capacityItems.filter((item) => selectedCategory === 'all' || item.category === selectedCategory)}
            percent={categoryPercent}
            selectedCategory={selectedCategory}
            showDecorative={store.preferences.decorativeVisuals}
            onItem={setSelectedItem}
            onAdd={openAdd}
          />
          <TaskList
            items={visibleItems}
            compact={store.preferences.compactCards}
            onItem={setSelectedItem}
            onEdit={openEdit}
            onAdd={openAdd}
          />
        </section>
      </main>

      <div className="mobile-actions"><button className="mobile-assistant" onClick={() => setModal('assistant')}><BrainCircuit size={20} /> Brain dump</button><button className="mobile-add" onClick={openAdd}><Plus size={21} /> Add item</button></div>

      {(modal === 'add' || modal === 'edit') && (
        <ItemModal
          item={editingItem}
          periodId={periodId}
          initialCategory={selectedCategory === 'all' ? 'work' : selectedCategory}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'settings' && <SettingsPanel onClose={() => setModal(null)} />}
      {modal === 'assistant' && <PlateAssistant items={currentItems} periodId={periodId} hasSampleData={store.hasSampleData} onClose={() => setModal(null)} />}
      {selectedItem && <ItemDetails item={store.items.find((item) => item.id === selectedItem.id) ?? selectedItem} onClose={() => setSelectedItem(null)} onEdit={openEdit} />}
    </div>
  )
}

function PlanningPeriod({ type, offset, label, onType, onOffset }: { type: PeriodType; offset: number; label: string; onType: (type: PeriodType) => void; onOffset: (offset: number) => void }) {
  return (
    <div className="period-selector" aria-label="Planning period">
      <button className="period-arrow" onClick={() => onOffset(offset - 1)} aria-label="Previous period"><ArrowLeft size={18} /></button>
      <div>
        <select value={type} onChange={(event) => onType(event.target.value as PeriodType)} aria-label="Planning period type">
          <option value="weekly">Weekly plate</option>
          <option value="biweekly">Biweekly plate</option>
          <option value="monthly">Monthly plate</option>
        </select>
        <span>{label}</span>
      </div>
      <button className="period-arrow" onClick={() => onOffset(offset + 1)} aria-label="Next period"><ArrowRight size={18} /></button>
    </div>
  )
}

function CapacitySummary({ points, total, percent, fullness, category, categoryPoints, categoryPercent, categoryLimit }: { points: number; total: number; percent: number; fullness: ReturnType<typeof getFullness>; category: Category; categoryPoints: number; categoryPercent: number; categoryLimit: number }) {
  const displayPercent = Math.min(percent, 100)
  return (
    <section className={`capacity-card tone-${fullness.tone}`} aria-label="Capacity summary">
      <div className="capacity-number-wrap">
        <div className="capacity-number">{percent}%</div>
        <div><span className="status-pill"><span />{fullness.label}</span><p>{points} of {total} points in use</p></div>
      </div>
      <div className="capacity-message"><Sparkles size={18} aria-hidden="true" /><span>{fullness.message}</span></div>
      <div className="meter-group">
        <div className="meter-label"><span>{category === 'all' ? 'Overall plate' : `${categoryMeta[category].label} plate`}</span><strong>{category === 'all' ? `${points}/${total}` : `${categoryPoints}/${categoryLimit}`}</strong></div>
        <div className="meter"><span style={{ width: `${Math.min(category === 'all' ? displayPercent : categoryPercent, 100)}%` }} /></div>
        {category !== 'all' && <small>Overall plate: {percent}% full</small>}
      </div>
    </section>
  )
}

function CategoryTabs({ selected, onSelect, items }: { selected: Category; onSelect: (category: Category) => void; items: PlateItem[] }) {
  const touchStart = useRef<number | null>(null)
  const swipe = (end: number) => {
    if (touchStart.current === null || Math.abs(end - touchStart.current) < 45) return
    const index = categories.indexOf(selected)
    const direction = end < touchStart.current ? 1 : -1
    const next = Math.max(0, Math.min(categories.length - 1, index + direction))
    onSelect(categories[next])
    touchStart.current = null
  }
  return (
    <nav className="category-tabs" aria-label="Plate categories" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={(event) => swipe(event.changedTouches[0].clientX)}>
      {categories.map((category) => {
        const count = category === 'all' ? items.length : items.filter((item) => item.category === category).length
        return <button key={category} className={selected === category ? 'active' : ''} onClick={() => onSelect(category)} aria-current={selected === category ? 'page' : undefined}>
          {category === 'all' ? 'All' : categoryMeta[category].label}<span>{count}</span>
        </button>
      })}
    </nav>
  )
}

const platePositions = [
  { left: 20, top: 15 }, { left: 52, top: 12 }, { left: 13, top: 48 }, { left: 55, top: 51 }, { left: 36, top: 35 },
  { left: 33, top: 69 }, { left: 67, top: 32 }, { left: 4, top: 29 }, { left: 68, top: 68 }, { left: 8, top: 72 },
]

function PlateVisualization({ items, percent, selectedCategory, showDecorative, onItem, onAdd }: { items: PlateItem[]; percent: number; selectedCategory: Category; showDecorative: boolean; onItem: (item: PlateItem) => void; onAdd: () => void }) {
  return (
    <article className="plate-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">VISUAL VIEW</p><h2>{selectedCategory === 'all' ? 'Everything on your plate' : `${categoryMeta[selectedCategory].label} plate`}</h2></div>
        <span className="view-hint"><Eye size={15} /> Size shows capacity</span>
      </div>
      <div className={`plate-stage ${percent > 100 ? 'overflow' : ''}`}>
        {showDecorative && <><span className="leaf leaf-one">⌁</span><span className="leaf leaf-two">⌁</span></>}
        <div className="plate-rim" aria-label={`${items.length} items shown on ${selectedCategory} plate`}>
          <div className="plate-inner">
            {items.length === 0 ? (
              <div className="empty-plate">
                <span className="empty-icon"><CircleDashed size={28} /></span>
                <h3>Your plate is clear.</h3>
                <p>Add a task, responsibility, project, or commitment to begin visualizing what you are carrying.</p>
                <button className="soft-button" onClick={onAdd}><Plus size={17} /> Add your first item</button>
              </div>
            ) : items.map((item, index) => {
              const position = platePositions[index % platePositions.length]
              const size = 68 + item.capacityPoints * 1.9
              return (
                <button
                  key={item.id}
                  className="plate-item"
                  style={{
                    width: size,
                    height: size,
                    left: `${position.left}%`,
                    top: `${position.top}%`,
                    background: categoryMeta[item.category].soft,
                    borderColor: `${categoryMeta[item.category].color}55`,
                    zIndex: Math.max(1, 50 - item.capacityPoints),
                  }}
                  onClick={() => onItem(item)}
                  aria-label={`${item.title}, ${item.capacityPoints} capacity points`}
                >
                  <span className="plate-item-icon" aria-hidden="true">{item.icon}</span>
                  <strong>{item.title}</strong>
                  <small>{item.capacityPoints} pts</small>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {percent > 100 && <div className="overflow-note"><span>↗</span><p><strong>A few things are near the edge.</strong> Your capacity can be adjusted without judgment.</p></div>}
    </article>
  )
}

type SortType = 'newest' | 'oldest' | 'capacity' | 'due'

function TaskList({ items, compact, onItem, onEdit, onAdd }: { items: PlateItem[]; compact: boolean; onItem: (item: PlateItem) => void; onEdit: (item: PlateItem) => void; onAdd: () => void }) {
  const updateItem = usePlateStore((state) => state.updateItem)
  const deleteItem = usePlateStore((state) => state.deleteItem)
  const [sort, setSort] = useState<SortType>('due')
  const [status, setStatus] = useState<ItemStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const sorted = useMemo(() => {
    const filtered = items.filter((item) => (status === 'all' || item.status === status) && item.title.toLowerCase().includes(search.toLowerCase()))
    return [...filtered].sort((a, b) => {
      if (sort === 'capacity') return b.capacityPoints - a.capacityPoints
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
    })
  }, [items, sort, status, search])

  const moveWaiting = (item: PlateItem) => updateItem(item.id, { category: 'waiting', status: 'waiting', capacityPoints: Math.max(5, Math.min(10, item.capacityPoints - 5)) })
  return (
    <article className="task-panel">
      <div className="panel-heading task-heading">
        <div><p className="eyebrow">LIST VIEW</p><h2>Your items <span>{sorted.length}</span></h2></div>
        <button className="icon-button desktop-add-icon" onClick={onAdd} aria-label="Add item"><Plus size={19} /></button>
      </div>
      <div className="list-controls">
        <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an item" aria-label="Find an item" /></label>
        <label className="select-control"><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value as ItemStatus | 'all')} aria-label="Filter by status"><option value="all">All statuses</option><option value="active">Active</option><option value="waiting">Waiting</option><option value="postponed">Postponed</option><option value="completed">Completed</option></select></label>
        <label className="select-control sort-control"><SlidersHorizontal size={15} /><select value={sort} onChange={(event) => setSort(event.target.value as SortType)} aria-label="Sort items"><option value="due">Due date</option><option value="capacity">Capacity</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label>
      </div>
      <div className={`task-list ${compact ? 'compact' : ''}`}>
        {sorted.length === 0 ? <div className="list-empty"><LayoutList size={25} /><p>No items match this view.</p></div> : sorted.map((item) => {
          const completed = item.subtasks.filter((task) => task.completed).length
          return (
            <div className={`task-card status-${item.status}`} key={item.id}>
              <button className="complete-button" onClick={() => updateItem(item.id, { status: item.status === 'completed' ? 'active' : 'completed' })} aria-label={item.status === 'completed' ? `Mark ${item.title} active` : `Complete ${item.title}`}>
                {item.status === 'completed' ? <Check size={17} /> : null}
              </button>
              <button className="task-main" onClick={() => onItem(item)}>
                <span className="task-icon" style={{ background: categoryMeta[item.category].soft }}>{item.icon}</span>
                <span className="task-copy">
                  <strong>{item.title}</strong>
                  <span className="task-meta"><span className="category-dot" style={{ background: categoryMeta[item.category].color }} />{categoryMeta[item.category].label}<i>•</i>{item.capacityPoints} pts{item.dueDate && <><i>•</i><CalendarDays size={13} /> {formatDueDate(item.dueDate)}</>}</span>
                  {item.subtasks.length > 0 && <span className="subtask-progress"><span><i style={{ width: `${(completed / item.subtasks.length) * 100}%` }} /></span>{completed} of {item.subtasks.length} steps</span>}
                </span>
              </button>
              <div className="menu-wrap">
                <button className="more-button" onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)} aria-label={`Actions for ${item.title}`} aria-expanded={openMenu === item.id}><MoreHorizontal size={19} /></button>
                {openMenu === item.id && <div className="item-menu">
                  <button onClick={() => { onEdit(item); setOpenMenu(null) }}><Edit3 size={15} /> Edit</button>
                  <button onClick={() => { moveWaiting(item); setOpenMenu(null) }}><Clock3 size={15} /> Move to Waiting</button>
                  <button onClick={() => { updateItem(item.id, { status: 'postponed' }); setOpenMenu(null) }}><Pause size={15} /> Postpone</button>
                  <button className="danger" onClick={() => { if (window.confirm(`Remove “${item.title}”?`)) deleteItem(item.id); setOpenMenu(null) }}><Trash2 size={15} /> Delete</button>
                </div>}
              </div>
            </div>
          )
        })}
      </div>
      {sorted.length > 0 && <p className="list-footer">Showing {sorted.length} item{sorted.length === 1 ? '' : 's'} • {sorted.filter((item) => item.status === 'active' || item.status === 'waiting').reduce((sum, item) => sum + item.capacityPoints, 0)} active points</p>}
    </article>
  )
}

interface FormState {
  title: string; description: string; category: ItemCategory; status: ItemStatus; capacityPoints: number; icon: string; dueDate: string; estimatedTime: string;
  multipleSteps: boolean; mentalEffort: number; emotionalEffort: number; socialEffort: number; sensoryEffort: number; recoveryNeeded: boolean; subtasks: string[]
}

function VoiceActions({ target, supported, listening, onDictate, onWispr }: { target: DictationTarget; supported: boolean; listening: boolean; onDictate: () => void; onWispr: () => void }) {
  return <div className="voice-actions" aria-label={`Voice options for ${target}`}>
    <button type="button" className={listening ? 'listening' : ''} onClick={onDictate} disabled={!supported} title={supported ? `Dictate ${target}` : 'Browser dictation is unavailable; Wispr Flow still works'} aria-pressed={listening}><Mic size={14} /> {listening ? 'Listening…' : 'Dictate'}</button>
    <button type="button" className="wispr-button" onClick={onWispr}><Sparkles size={14} /> Wispr Flow</button>
  </div>
}

function ItemModal({ item, periodId, initialCategory, onClose }: { item: PlateItem | null; periodId: string; initialCategory: ItemCategory; onClose: () => void }) {
  const addItem = usePlateStore((state) => state.addItem)
  const updateItem = usePlateStore((state) => state.updateItem)
  const [guidedOpen, setGuidedOpen] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [subtask, setSubtask] = useState('')
  const capacityPickerRef = useRef<HTMLFieldSetElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const [form, setForm] = useState<FormState>({
    title: item?.title ?? '', description: item?.description ?? '', category: item?.category ?? initialCategory, status: item?.status ?? (initialCategory === 'waiting' ? 'waiting' : 'active'),
    capacityPoints: item?.capacityPoints ?? 10, icon: item?.icon ?? categoryMeta[initialCategory].icon, dueDate: item?.dueDate ?? '', estimatedTime: item?.estimatedTime ?? '15-30',
    multipleSteps: (item?.subtasks.length ?? 0) > 1, mentalEffort: item?.mentalEffort ?? 1, emotionalEffort: item?.emotionalEffort ?? 1, socialEffort: item?.socialEffort ?? 1, sensoryEffort: item?.sensoryEffort ?? 1, recoveryNeeded: item?.recoveryNeeded ?? false,
    subtasks: item?.subtasks.map((task) => task.title) ?? [],
  })
  const dictation = useDictation((target, transcript) => {
    setForm((current) => {
      if (target === 'assistant') return current
      const existing = current[target].trimEnd()
      return { ...current, [target]: existing ? `${existing} ${transcript}` : transcript }
    })
  })
  const suggested = scoreEstimate(form.estimatedTime, form.multipleSteps, form.mentalEffort, form.emotionalEffort, form.socialEffort, form.sensoryEffort, form.recoveryNeeded)
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    const timestamp = new Date().toISOString()
    const status = form.category === 'waiting' && form.status === 'active' ? 'waiting' : form.status
    if (item) {
      updateItem(item.id, {
        ...form, title: form.title.trim(), description: form.description.trim(), status, suggestedCapacityPoints: suggested,
        mentalEffort: form.mentalEffort as 1 | 2 | 3, emotionalEffort: form.emotionalEffort as 1 | 2 | 3, socialEffort: form.socialEffort as 1 | 2 | 3, sensoryEffort: form.sensoryEffort as 1 | 2 | 3,
        subtasks: form.subtasks.map((title, index) => ({ id: item.subtasks[index]?.id ?? crypto.randomUUID(), title, completed: item.subtasks[index]?.completed ?? false })),
      })
    } else {
      addItem({
        id: crypto.randomUUID(), title: form.title.trim(), description: form.description.trim(), category: form.category, status, capacityPoints: form.capacityPoints,
        suggestedCapacityPoints: suggested, icon: form.icon, dueDate: form.dueDate || undefined, estimatedTime: form.estimatedTime, mentalEffort: form.mentalEffort as 1 | 2 | 3,
        emotionalEffort: form.emotionalEffort as 1 | 2 | 3, socialEffort: form.socialEffort as 1 | 2 | 3, sensoryEffort: form.sensoryEffort as 1 | 2 | 3,
        recoveryNeeded: form.recoveryNeeded, planningPeriodId: periodId, subtasks: form.subtasks.map((title) => ({ id: crypto.randomUUID(), title, completed: false })), createdAt: timestamp, updatedAt: timestamp,
      })
    }
    onClose()
  }
  const addSubtaskToForm = () => {
    if (!subtask.trim()) return
    setField('subtasks', [...form.subtasks, subtask.trim()])
    setSubtask('')
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="modal-card item-modal" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
        <div className="modal-header"><div><p className="eyebrow">{item ? 'MAKE A CHANGE' : 'WHAT ARE YOU CARRYING?'}</p><h2 id="item-modal-title">{item ? 'Edit item' : 'Add to your plate'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        <form onSubmit={submit}>
          <div className="form-body">
            <div className="field full voice-field">
              <div className="field-label-row"><label htmlFor="item-title">Item title <b>*</b></label><VoiceActions target="title" supported={dictation.supported} listening={dictation.listeningTarget === 'title'} onDictate={() => dictation.start('title')} onWispr={() => dictation.prepareWispr('title', () => titleInputRef.current?.focus())} /></div>
              <input id="item-title" ref={titleInputRef} autoFocus value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="e.g. Book dentist appointment" required />
              {dictation.feedback?.target === 'title' && <p className="voice-feedback" role="status">{dictation.feedback.text}</p>}
            </div>
            <div className="form-grid">
              <label className="field"><span>Category <b>*</b></span><select value={form.category} onChange={(event) => { const category = event.target.value as ItemCategory; setField('category', category); if (!item) setField('icon', categoryMeta[category].icon) }}>{Object.keys(categoryMeta).map((category) => <option key={category} value={category}>{categoryMeta[category as ItemCategory].label}</option>)}</select></label>
              <label className="field"><span>Status</span><select value={form.status} onChange={(event) => setField('status', event.target.value as ItemStatus)}><option value="active">Active</option><option value="waiting">Waiting</option><option value="postponed">Postponed</option><option value="completed">Completed</option></select></label>
            </div>
            <fieldset className="capacity-picker" ref={capacityPickerRef}><legend>How much space does this take? <b>*</b></legend><div>{capacityOptions.map((option) => <button type="button" className={form.capacityPoints === option.value ? 'selected' : ''} onClick={() => setField('capacityPoints', option.value)} key={option.value}><strong>{option.value}</strong><span>{option.label}</span><small>{option.hint}</small></button>)}</div></fieldset>
            <div className="estimator-actions">
              <button type="button" className={`assist-toggle ${assistOpen ? 'active' : ''}`} onClick={() => { setAssistOpen(!assistOpen); setGuidedOpen(false) }} aria-expanded={assistOpen} aria-controls="capacity-assist-panel"><Sparkles size={18} /> Help me estimate</button>
              <button type="button" className="guided-toggle" onClick={() => { setGuidedOpen(!guidedOpen); setAssistOpen(false) }} aria-expanded={guidedOpen}><span>Use the manual guide</span><ChevronDown size={18} className={guidedOpen ? 'rotate' : ''} /></button>
            </div>
            {assistOpen && <div id="capacity-assist-panel"><CapacityAssist
              title={form.title}
              description={form.description}
              onUse={(points) => { setField('capacityPoints', points); setAssistOpen(false) }}
              onChooseDifferent={() => {
                setAssistOpen(false)
                requestAnimationFrame(() => capacityPickerRef.current?.querySelector<HTMLButtonElement>('button.selected')?.focus())
              }}
              onCancel={() => setAssistOpen(false)}
            /></div>}
            {guidedOpen && <div className="guided-panel">
              <div className="guided-intro"><div><strong>Suggested capacity: {suggested} points</strong><span>Based on your answers below</span></div><button type="button" onClick={() => setField('capacityPoints', suggested)}>Use suggestion</button></div>
              <div className="form-grid">
                <label className="field"><span>How long will it take?</span><select value={form.estimatedTime} onChange={(event) => setField('estimatedTime', event.target.value)}><option value="under-15">Under 15 minutes</option><option value="15-30">15–30 minutes</option><option value="30-60">30–60 minutes</option><option value="1-3-hours">1–3 hours</option><option value="several-hours">Several hours or days</option><option value="ongoing">Ongoing project</option></select></label>
                <label className="switch-row boxed"><input type="checkbox" checked={form.multipleSteps} onChange={(event) => setField('multipleSteps', event.target.checked)} /><span>Multiple steps</span></label>
              </div>
              <div className="effort-grid">{([['mentalEffort', 'Mental effort'], ['emotionalEffort', 'Emotional effort'], ['socialEffort', 'Social effort'], ['sensoryEffort', 'Sensory effort']] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><select value={form[key]} onChange={(event) => setField(key, Number(event.target.value))}><option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option></select></label>)}</div>
              <label className="switch-row"><input type="checkbox" checked={form.recoveryNeeded} onChange={(event) => setField('recoveryNeeded', event.target.checked)} /><span>I’ll need recovery time afterward</span></label>
            </div>}
            <div className="field full voice-field">
              <div className="field-label-row"><label htmlFor="item-description">Description <em>Optional</em></label><VoiceActions target="description" supported={dictation.supported} listening={dictation.listeningTarget === 'description'} onDictate={() => dictation.start('description')} onWispr={() => dictation.prepareWispr('description', () => descriptionInputRef.current?.focus())} /></div>
              <textarea id="item-description" ref={descriptionInputRef} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Add any context that would make this easier to return to…" rows={3} />
              {dictation.feedback?.target === 'description' && <p className="voice-feedback" role="status">{dictation.feedback.text}</p>}
              <p className="voice-privacy">Browser dictation may use your browser’s speech service. Wispr Flow inserts text into the focused field using your existing Flow setup.</p>
            </div>
            <div className="form-grid">
              <label className="field"><span>Due date <em>Optional</em></span><input type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} /></label>
              <div className="field"><span>Icon</span><div className="icon-picker">{icons.map((icon) => <button type="button" key={icon} className={form.icon === icon ? 'selected' : ''} onClick={() => setField('icon', icon)} aria-label={`Use ${icon} icon`}>{icon}</button>)}</div></div>
            </div>
            <div className="subtask-builder">
              <span>Steps <em>Optional</em></span>
              {form.subtasks.map((task, index) => <div className="draft-subtask" key={`${task}-${index}`}><span>{index + 1}</span><p>{task}</p><button type="button" onClick={() => setField('subtasks', form.subtasks.filter((_, taskIndex) => taskIndex !== index))} aria-label={`Remove ${task}`}><X size={15} /></button></div>)}
              <div className="add-subtask-row"><input value={subtask} onChange={(event) => setSubtask(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSubtaskToForm() } }} placeholder="Add a step" /><button type="button" onClick={addSubtaskToForm}><Plus size={16} /> Add</button></div>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={17} /> {item ? 'Save changes' : 'Add to plate'}</button></div>
        </form>
      </section>
    </div>
  )
}

function ItemDetails({ item, onClose, onEdit }: { item: PlateItem; onClose: () => void; onEdit: (item: PlateItem) => void }) {
  const updateItem = usePlateStore((state) => state.updateItem)
  const toggleSubtask = usePlateStore((state) => state.toggleSubtask)
  const addSubtask = usePlateStore((state) => state.addSubtask)
  const deleteItem = usePlateStore((state) => state.deleteItem)
  const [newStep, setNewStep] = useState('')
  const completed = item.subtasks.filter((task) => task.completed).length
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <aside className="details-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="drawer-header"><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={20} /></button></div>
        <div className="drawer-body">
          <span className="detail-icon" style={{ background: categoryMeta[item.category].soft }}>{item.icon}</span>
          <span className="detail-category" style={{ color: categoryMeta[item.category].color }}>{categoryMeta[item.category].label}</span>
          <h2 id="detail-title">{item.title}</h2>
          <div className="detail-chips"><span>{item.capacityPoints} capacity points</span><span>{item.status}</span>{item.dueDate && <span>Due {formatDueDate(item.dueDate)}</span>}</div>
          {item.description && <p className="detail-description">{item.description}</p>}
          <section className="detail-section">
            <div className="detail-section-title"><h3>Steps</h3>{item.subtasks.length > 0 && <span>{completed} of {item.subtasks.length}</span>}</div>
            {item.subtasks.length > 0 && <div className="detail-progress"><i style={{ width: `${(completed / item.subtasks.length) * 100}%` }} /></div>}
            <div className="detail-subtasks">{item.subtasks.map((task) => <label key={task.id}><input type="checkbox" checked={task.completed} onChange={() => toggleSubtask(item.id, task.id)} /><span>{task.title}</span></label>)}</div>
            <div className="add-subtask-row"><input value={newStep} onChange={(event) => setNewStep(event.target.value)} placeholder="Add another step" /><button onClick={() => { if (newStep.trim()) { addSubtask(item.id, newStep.trim()); setNewStep('') } }}><Plus size={16} /> Add</button></div>
          </section>
          <section className="detail-section"><h3>Capacity notes</h3><dl><div><dt>Estimated time</dt><dd>{item.estimatedTime?.replaceAll('-', ' ') || 'Not set'}</dd></div><div><dt>Mental effort</dt><dd>{['', 'Low', 'Medium', 'High'][item.mentalEffort ?? 0] || 'Not set'}</dd></div><div><dt>Recovery afterward</dt><dd>{item.recoveryNeeded ? 'Likely' : 'Not marked'}</dd></div></dl></section>
        </div>
        <div className="drawer-actions"><button className="soft-button" onClick={() => onEdit(item)}><Edit3 size={16} /> Edit item</button><button className="primary-button" onClick={() => { updateItem(item.id, { status: item.status === 'completed' ? 'active' : 'completed' }); onClose() }}><CheckCircle2 size={17} /> {item.status === 'completed' ? 'Mark active' : 'Mark complete'}</button><button className="text-danger" onClick={() => { if (window.confirm(`Remove “${item.title}”?`)) { deleteItem(item.id); onClose() } }}><Trash2 size={16} /> Remove item</button></div>
      </aside>
    </div>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const store = usePlateStore()
  const sum = Object.values(store.categoryLimits).reduce((total, value) => total + value, 0)
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-header"><div><p className="eyebrow">MAKE IT YOURS</p><h2 id="settings-title">Plate settings</h2></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={20} /></button></div>
        <div className="settings-body">
          <section><h3>Overall capacity</h3><p>Choose a number that reflects what you can realistically carry this period.</p><label className="range-setting"><input type="range" min="50" max="150" step="5" value={store.totalCapacity} onChange={(event) => store.setTotalCapacity(Number(event.target.value))} /><strong>{store.totalCapacity} pts</strong></label></section>
          <section><div className="settings-section-heading"><div><h3>Category limits</h3><p>These are guides, not rules.</p></div><span className={sum > store.totalCapacity ? 'warning-chip' : ''}>{sum} total</span></div>
            {sum > store.totalCapacity && <div className="gentle-warning"><Sparkles size={17} /><span>Your category guides add up to more than overall capacity. That’s okay—just keep it in mind.</span></div>}
            <div className="limit-list">{Object.entries(categoryMeta).map(([category, meta]) => <label key={category}><span><i style={{ background: meta.color }} />{meta.label}</span><span><input type="number" min="0" max="100" value={store.categoryLimits[category as ItemCategory]} onChange={(event) => store.setCategoryLimit(category as ItemCategory, Math.max(0, Number(event.target.value)))} /> pts</span></label>)}</div>
          </section>
          <section><h3>Display preferences</h3><p>Adjust the interface to feel comfortable for you.</p><div className="preference-list">{([
            ['reducedMotion', 'Reduced motion', 'Minimize interface movement'],
            ['largeText', 'Large text', 'Increase text throughout the app'],
            ['highContrast', 'High contrast', 'Strengthen borders and text contrast'],
            ['decorativeVisuals', 'Decorative visuals', 'Show calming marks around the plate'],
            ['compactCards', 'Compact task cards', 'Fit more list items on screen'],
          ] as const).map(([key, title, detail]) => <label key={key}><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" checked={store.preferences[key]} onChange={(event) => store.setPreference(key, event.target.checked)} /></label>)}</div></section>
          <section className="data-section"><h3>Sample & saved data</h3>{store.hasSampleData && <button className="soft-button" onClick={store.clearSampleData}><Trash2 size={16} /> Clear sample items</button>}<button className="text-danger" onClick={() => { if (window.confirm('Reset My Plate to its original sample data and settings?')) store.resetAll() }}><RotateCcw size={16} /> Reset all local data</button><p className="storage-note">Your information is saved only in this browser.</p></section>
        </div>
        <div className="settings-footer"><button className="primary-button" onClick={onClose}>Done</button></div>
      </aside>
    </div>
  )
}

function FocusDisplay({ items, overallPercent, fullness, onExit }: { items: PlateItem[]; overallPercent: number; fullness: ReturnType<typeof getFullness>; onExit: () => void }) {
  const next = suggestedActions(items)
  const upcoming = [...items].filter((item) => item.dueDate && item.status === 'active').sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0]
  const enterFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.()
    else await document.exitFullscreen?.()
  }
  return (
    <main className="focus-display">
      <header><div className="brand"><span className="brand-mark"><span /></span><span>My Plate</span></div><div className="focus-date"><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</strong><span>A gentle view of today</span></div><div><button className="quiet-button" onClick={enterFullscreen}><Expand size={17} /> Fullscreen</button><button className="icon-button" onClick={onExit} aria-label="Exit focus display"><X size={20} /></button></div></header>
      <div className="focus-grid">
        <section className="focus-plate-wrap"><div className={`focus-percent tone-${fullness.tone}`}><strong>{overallPercent}%</strong><div><span>{fullness.label}</span><p>{fullness.message}</p></div></div><PlateVisualization items={items} percent={overallPercent} selectedCategory="all" showDecorative onItem={() => {}} onAdd={() => {}} /></section>
        <aside className="focus-sidebar">
          <section><p className="eyebrow">A GOOD PLACE TO START</p><h2>Three gentle next moves</h2><div className="next-actions">{next.length ? next.map((item, index) => <div key={item.id}><span>{index + 1}</span><span className="task-icon" style={{ background: categoryMeta[item.category].soft }}>{item.icon}</span><div><strong>{item.title}</strong><small>{item.capacityPoints} pts{item.dueDate ? ` • due ${formatDueDate(item.dueDate)}` : ''}</small></div></div>) : <p>Your active list is clear. Take a breath.</p>}</div></section>
          <section className="upcoming-card"><p className="eyebrow">UPCOMING</p>{upcoming ? <><div><CalendarDays size={22} /><span>Due {formatDueDate(upcoming.dueDate)}</span></div><h3>{upcoming.title}</h3><p>{upcoming.capacityPoints} capacity points • {categoryMeta[upcoming.category].label}</p></> : <><h3>Nothing urgent is due.</h3><p>There’s no upcoming date asking for your attention.</p></>}</section>
          <blockquote>“Capacity is information,<br />not a measure of worth.”</blockquote>
        </aside>
      </div>
    </main>
  )
}

export default App
