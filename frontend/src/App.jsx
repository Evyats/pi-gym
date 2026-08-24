import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, GripVertical, Moon, Pencil, Plus, RotateCcw, SlidersHorizontal, Sun, Trash2 } from 'lucide-react'
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { initialWeights, initialWorkouts } from './mockData'
import { deleteBodyWeight, deleteWorkoutDay, loadGymState, saveBodyWeight, saveWorkout, saveWorkoutDay } from './api'

const spring = { type: 'spring', stiffness: 430, damping: 34 }
const editTransition = { duration: .1, ease: 'easeOut' }
const DAY_IN_MS = 24 * 60 * 60 * 1000
const displayDate = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
const dateTimestamp = (value) => Date.parse(`${value}T00:00:00Z`)
const daysBetween = (start, end) => Math.round((dateTimestamp(end) - dateTimestamp(start)) / DAY_IN_MS)
const closestIncrementWeight = (weight, increment, min = 0, max = 300) => {
  const snapped = Math.round((Number(weight) - min) / increment) * increment + min
  return Math.min(max, Math.max(min, Number(snapped.toFixed(2))))
}
const localIsoDate = (value) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const createId = () => globalThis.crypto?.randomUUID?.()
  ?? `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const DEFAULT_LAYOUT = {
  contentWidth: 1020,
  pageGutter: 32,
  pageTop: 44,
  sectionGap: 44,
  gridGap: 18,
  cardPadding: 30,
  listPadding: 10,
  rowHeight: 58,
  statWidth: 40,
  statHeight: 40,
  statNumberSize: 15,
  statLabelSize: 10,
  calendarMarkStyle: 'badge',
}

const LAYOUT_PRESETS = {
  Compact: { contentWidth: 980, pageGutter: 24, pageTop: 34, sectionGap: 28, gridGap: 12, cardPadding: 10, listPadding: 6, rowHeight: 68, statWidth: 46, statHeight: 46, statNumberSize: 14, statLabelSize: 9, calendarMarkStyle: 'badge' },
  Current: DEFAULT_LAYOUT,
  Airy: { contentWidth: 1080, pageGutter: 44, pageTop: 76, sectionGap: 60, gridGap: 26, cardPadding: 20, listPadding: 16, rowHeight: 96, statWidth: 58, statHeight: 62, statNumberSize: 17, statLabelSize: 11, calendarMarkStyle: 'badge' },
}

const CALENDAR_MARK_STYLES = [
  { value: 'badge', label: 'Date badge' },
  { value: 'bar', label: 'Bottom bar' },
  { value: 'outline', label: 'Outline' },
  { value: 'tint', label: 'Soft tint' },
]

const LAYOUT_CONTROLS = [
  { key: 'contentWidth', label: 'Content width', min: 760, max: 1240, step: 20, unit: 'px' },
  { key: 'pageGutter', label: 'Page gutter', min: 16, max: 64, step: 2, unit: 'px' },
  { key: 'pageTop', label: 'Top spacing', min: 20, max: 100, step: 2, unit: 'px' },
  { key: 'sectionGap', label: 'Section spacing', min: 20, max: 80, step: 2, unit: 'px' },
  { key: 'gridGap', label: 'Card gap', min: 6, max: 36, step: 1, unit: 'px' },
  { key: 'cardPadding', label: 'Card header padding', min: 6, max: 30, step: 1, unit: 'px' },
  { key: 'listPadding', label: 'Exercise-list padding', min: 0, max: 24, step: 1, unit: 'px' },
  { key: 'rowHeight', label: 'Exercise row height', min: 58, max: 108, step: 2, unit: 'px' },
  { key: 'statWidth', label: 'Number button width', min: 40, max: 68, step: 1, unit: 'px' },
  { key: 'statHeight', label: 'Number button height', min: 40, max: 72, step: 1, unit: 'px' },
  { key: 'statNumberSize', label: 'Number text size', min: 12, max: 22, step: 1, unit: 'px' },
  { key: 'statLabelSize', label: 'Unit label size', min: 8, max: 14, step: 1, unit: 'px' },
]

function LayoutTuner({ value, onChange, onClose }) {
  const [copyStatus, setCopyStatus] = useState('')
  const changed = LAYOUT_CONTROLS.filter((control) => value[control.key] !== DEFAULT_LAYOUT[control.key])
  const selectedCalendarStyle = CALENDAR_MARK_STYLES.find((option) => option.value === value.calendarMarkStyle)
  const summaryParts = changed.map((control) => `${control.label.toLowerCase()} of ${value[control.key]}${control.unit}`)
  if (value.calendarMarkStyle !== DEFAULT_LAYOUT.calendarMarkStyle) summaryParts.push(`${selectedCalendarStyle.label.toLowerCase()} styling for marked calendar days`)
  const summary = summaryParts.length
    ? `Update the Pi Gym layout to use ${summaryParts.join(', ')}.`
    : 'Keep the current Pi Gym layout spacing and proportions.'

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary)
      setCopyStatus('Copied!')
      window.setTimeout(() => setCopyStatus(''), 1400)
    } catch {
      setCopyStatus('Copy unavailable')
    }
  }

  return (
    <motion.aside className="layout-tuner" aria-label="Temporary layout tuner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .16, ease: 'easeOut' }}>
      <header><div><p className="eyebrow">Temporary tools</p><h2>Layout tuner</h2></div><button type="button" className="tuner-close" onClick={onClose}>Close</button></header>
      <p className="tuner-note">Live only. These values reset when the app reloads.</p>
      <div className="tuner-presets" aria-label="Layout presets">
        {Object.entries(LAYOUT_PRESETS).map(([name, preset]) => <button type="button" key={name} onClick={() => onChange({ ...preset })}>{name}</button>)}
      </div>
      <fieldset className="tuner-choices"><legend>Calendar marks</legend><div>
        {CALENDAR_MARK_STYLES.map((option) => <button type="button" key={option.value} aria-pressed={value.calendarMarkStyle === option.value} onClick={() => onChange({ ...value, calendarMarkStyle: option.value })}>{option.label}</button>)}
      </div></fieldset>
      <div className="tuner-controls">
        {LAYOUT_CONTROLS.map((control) => (
          <label key={control.key}>
            <span>{control.label}<output>{value[control.key]}{control.unit}</output></span>
            <input type="range" min={control.min} max={control.max} step={control.step} value={value[control.key]} onChange={(event) => onChange({ ...value, [control.key]: Number(event.target.value) })} />
          </label>
        ))}
      </div>
      <div className="tuner-output"><p>{summary}</p><div><button type="button" onClick={() => onChange({ ...DEFAULT_LAYOUT })}><RotateCcw /> Reset</button><button type="button" onClick={copySummary}><Copy /> {copyStatus || 'Copy summary'}</button></div></div>
    </motion.aside>
  )
}

function IconButton({ label, children, ...props }) {
  return <button className="icon-button" aria-label={label} {...props}>{children}</button>
}

function NumberStat({ exercise, field, label, onPick }) {
  return (
    <button className={`exercise-stat ${field === 'weight' ? 'weight-stat' : ''}`} aria-label={`Change ${exercise.name} ${label}, currently ${exercise[field]}`} onClick={() => onPick({ exercise, field, label })}>
      <strong>{exercise[field]}</strong><span>{label}</span>
    </button>
  )
}

function DragHandle({ label, setRef, listeners, attributes }) {
  return <button className="drag-handle" ref={setRef} type="button" aria-label={label} {...attributes} {...listeners}><GripVertical aria-hidden="true" /></button>
}

function ExerciseRow({ exercise, editing, onChange, onRemove, onPick }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id, disabled: !editing })
  const sortableStyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 12 : undefined }
  return (
    <motion.div ref={setNodeRef} style={sortableStyle} className={`exercise-row ${editing ? 'is-editing' : ''} ${isDragging ? 'is-dragging' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {editing && <DragHandle label={`Move ${exercise.name}`} setRef={setActivatorNodeRef} listeners={listeners} attributes={attributes} />}
      <div className="exercise-copy">
        <AnimatePresence mode="popLayout" initial={false}>
          {editing ? (
            <motion.div className="editable-copy" key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition}>
              <input aria-label="Exercise name" value={exercise.name} onChange={(e) => onChange({ ...exercise, name: e.target.value })} />
              <input className="note-input" aria-label="Exercise notes" value={exercise.notes} placeholder="Add a note" onChange={(e) => onChange({ ...exercise, notes: e.target.value })} />
            </motion.div>
          ) : (
            <motion.div className="read-copy" key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition}>
              <strong>{exercise.name}</strong><small>{exercise.notes}</small>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <NumberStat exercise={exercise} field="weight" label="kg" onPick={(selection) => onPick({ ...selection, onSave: (value, weightIncrement) => onChange({ ...exercise, weight: value, weight_increment: weightIncrement }) })} />
      <NumberStat exercise={exercise} field="sets" label="sets" onPick={(selection) => onPick({ ...selection, onSave: (value) => onChange({ ...exercise, sets: value }) })} />
      <NumberStat exercise={exercise} field="reps" label="reps" onPick={(selection) => onPick({ ...selection, onSave: (value) => onChange({ ...exercise, reps: value }) })} />
      <AnimatePresence initial={false}>{editing && <motion.div className="row-action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition}><IconButton label={`Remove ${exercise.name}`} onClick={onRemove}><Trash2 /></IconButton></motion.div>}</AnimatePresence>
    </motion.div>
  )
}

function MuscleGroup({ group, index, editing, onChange, onRemove, confirmRemove, onPick }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: group.id, disabled: !editing })
  const exerciseSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const setCount = group.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)
  const addExercise = () => onChange({ ...group, exercises: [...group.exercises, { id: createId(), name: 'New exercise', weight: 0, sets: 3, reps: 10, notes: '', weight_increment: 1.25 }] })
  const reorderExercises = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = group.exercises.findIndex((item) => item.id === active.id)
    const newIndex = group.exercises.findIndex((item) => item.id === over.id)
    onChange({ ...group, exercises: arrayMove(group.exercises, oldIndex, newIndex) })
  }
  return (
    <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 11 : undefined }} className={`muscle-group ${isDragging ? 'is-dragging' : ''}`}>
      <header className="group-header">
        {editing && <DragHandle label={`Move ${group.name}`} setRef={setActivatorNodeRef} listeners={listeners} attributes={attributes} />}
        <span className="group-number">{String(index + 1).padStart(2, '0')}</span>
        <AnimatePresence mode="popLayout" initial={false}>
          {editing ? <motion.input key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition} className="group-name-input" aria-label="Category name" value={group.name} onChange={(e) => onChange({ ...group, name: e.target.value })} /> : <motion.h2 key="heading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition}>{group.name}</motion.h2>}
        </AnimatePresence>
        <span className="set-count">{setCount} sets</span>
        <AnimatePresence initial={false}>{editing && <motion.div className="header-action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition}><IconButton label={`Remove ${group.name}`} onClick={() => confirmRemove({ name: group.name, kind: 'category', action: onRemove })}><Trash2 /></IconButton></motion.div>}</AnimatePresence>
      </header>
      <div className="exercise-list">
        <DndContext sensors={exerciseSensors} collisionDetection={closestCenter} onDragEnd={reorderExercises}>
          <SortableContext items={group.exercises.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence initial={false}>
              {group.exercises.map((exercise) => <ExerciseRow key={exercise.id} exercise={exercise} editing={editing} onChange={(next) => onChange({ ...group, exercises: group.exercises.map((item) => item.id === next.id ? next : item) })} onRemove={() => confirmRemove({ name: exercise.name, kind: 'exercise', action: () => onChange({ ...group, exercises: group.exercises.filter((item) => item.id !== exercise.id) }) })} onPick={onPick} />)}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
        <AnimatePresence initial={false}>{editing && <motion.button className="add-exercise" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition} onClick={addExercise}><Plus aria-hidden="true" /> Add exercise</motion.button>}</AnimatePresence>
      </div>
    </article>
  )
}

function WeightChart({ weights }) {
  const [selectedDate, setSelectedDate] = useState(null)
  if (!weights.length) return <div className="chart-empty">Add a measurement to start your graph.</div>

  const width = 640, height = 210, pad = 18
  const chronologicalWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const values = chronologicalWeights.map((item) => item.value)
  const min = Math.min(...values) - .25, max = Math.max(...values) + .25
  const firstDate = chronologicalWeights[0].date
  const lastDate = chronologicalWeights.at(-1).date
  const totalDays = daysBetween(firstDate, lastDate)
  const pixelsPerDay = totalDays > 0 ? (width - pad * 2) / totalDays : 0
  const points = chronologicalWeights.map((item) => ({
    ...item,
    x: totalDays === 0
      ? width / 2
      : pad + daysBetween(firstDate, item.date) * pixelsPerDay,
    y: pad + ((max - item.value) / (max - min)) * (height - pad * 2),
  }))
  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x},${point.y}`
    const previous = points[index - 1]
    const beforePrevious = points[index - 2] || previous
    const next = points[index + 1] || point
    const tension = .18
    const controlOneX = previous.x + (point.x - beforePrevious.x) * tension
    const controlOneY = previous.y + (point.y - beforePrevious.y) * tension
    const controlTwoX = point.x - (next.x - previous.x) * tension
    const controlTwoY = point.y - (next.y - previous.y) * tension
    return `${path} C${controlOneX},${controlOneY} ${controlTwoX},${controlTwoY} ${point.x},${point.y}`
  }, '')
  const area = `${line} L${points.at(-1).x},${height} L${points[0].x},${height} Z`
  const selectedPoint = points.find((point) => point.date === selectedDate)
  const selectPoint = (point) => setSelectedDate((current) => current === point.date ? null : point.date)
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Weight trend from ${chronologicalWeights[0].value} to ${chronologicalWeights.at(-1).value} kilograms`}>
        <g className="chart-grid"><path d="M18 28H622M18 100H622M18 172H622" /></g>
        <motion.path className="chart-area" d={area} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .45 }} />
        <motion.path className="chart-line" d={line} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .65, ease: 'easeOut' }} />
        {points.map((point, index) => (
          <g key={point.date} className="chart-point-control" role="button" tabIndex="0" aria-label={`${displayDate(point.date)}: ${point.value} kilograms`} aria-pressed={selectedDate === point.date} onClick={() => selectPoint(point)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPoint(point) } }}>
            <circle className="chart-point-hit" cx={point.x} cy={point.y} r="22" />
            <motion.circle className="chart-point" cx={point.x} cy={point.y} r="5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .2 + index * .045 }} />
          </g>
        ))}
        {selectedPoint && (
          <g className="chart-tooltip" transform={`translate(${Math.min(width - 96, Math.max(4, selectedPoint.x - 46))} ${selectedPoint.y < 62 ? selectedPoint.y + 14 : selectedPoint.y - 54})`}>
            <rect width="92" height="42" />
            <text className="chart-tooltip-value" x="46" y="17">{selectedPoint.value} kg</text>
            <text className="chart-tooltip-date" x="46" y="33">{displayDate(selectedPoint.date)}</text>
          </g>
        )}
      </svg>
      <div className="chart-labels"><span>{displayDate(firstDate)}</span>{chronologicalWeights.length > 1 && <><span>{displayDate(localIsoDate(new Date(dateTimestamp(firstDate) + totalDays * DAY_IN_MS / 2)))}</span><span>{displayDate(lastDate)}</span></>}</div>
    </div>
  )
}

function WorkoutCalendar({ workoutDays, editing, onToggle }) {
  const now = new Date()
  const earliestMonth = new Date(2026, 0, 1)
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const leadingBlanks = month.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cellCount = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7
  const marked = new Set(workoutDays)
  const today = localIsoDate(now)
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month)
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
  const markedThisMonth = workoutDays.filter((value) => value.startsWith(monthPrefix)).length
  const todayIsMarked = marked.has(today)
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - leadingBlanks + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })
  const canGoPrevious = month.getTime() > earliestMonth.getTime()
  const moveMonth = (amount) => {
    const next = new Date(year, monthIndex + amount, 1)
    setMonth(next < earliestMonth ? earliestMonth : next)
  }

  return (
    <section className="calendar-view" aria-label="Workout calendar">
      <header className="section-heading">
        <div><p className="eyebrow">Training history</p><h2>Calendar</h2></div>
        {!editing && (
          <button className="primary-button compact" type="button" aria-pressed={todayIsMarked} onClick={() => onToggle(today)}>
            <Check aria-hidden="true" />
            {todayIsMarked ? 'Unmark today' : 'Mark today'}
          </button>
        )}
      </header>
      <div className="calendar-panel">
        <div className="calendar-panel-toolbar">
          <div className="calendar-month-marker">
            <h3>{monthLabel}</h3>
            <p><strong>{markedThisMonth}</strong> {markedThisMonth === 1 ? 'workout' : 'workouts'} this month</p>
          </div>
          <div className="calendar-controls">
            <div className="calendar-navigation">
              <IconButton label="Previous month" disabled={!canGoPrevious} onClick={() => moveMonth(-1)}><ChevronLeft /></IconButton>
              <button type="button" onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>Today</button>
              <IconButton label="Next month" onClick={() => moveMonth(1)}><ChevronRight /></IconButton>
            </div>
          </div>
        </div>
        <div className="calendar-board">
        <div className="calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {cells.map((day, index) => {
            if (day === null) return <span className="calendar-empty-day" aria-hidden="true" key={`empty-${index}`} />
            const value = localIsoDate(new Date(year, monthIndex, day))
            const isMarked = marked.has(value)
            const label = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, monthIndex, day))
            return (
              <button
                type="button"
                className={`calendar-day ${isMarked ? 'is-marked' : ''} ${value === today ? 'is-today' : ''}`}
                key={value}
                disabled={!editing}
                aria-pressed={isMarked}
                aria-label={`${label}${isMarked ? ', workout completed' : ''}`}
                onClick={() => onToggle(value)}
              >
                <span>{day}</span>
                {isMarked && <span className="calendar-check"><Check aria-hidden="true" /></span>}
              </button>
            )
          })}
        </div>
        </div>
      </div>
    </section>
  )
}

function ConfirmDialog({ item, onClose }) {
  const remove = () => { item.action(); onClose() }
  return (
    <motion.div className="dialog-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} transition={spring}>
        <div className="confirm-icon"><AlertTriangle aria-hidden="true" /></div>
        <h2 id="confirm-title">Remove {item.kind}?</h2>
        <p id="confirm-description">“{item.name}” will be removed{item.kind === 'category' ? ' together with all its exercises' : ''}.</p>
        <div className="confirm-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="button" className="danger-button" onClick={remove}><Trash2 /> Remove</button></div>
      </motion.div>
    </motion.div>
  )
}

function NumberPickerSheet({ picker, onClose }) {
  const exerciseWeight = picker.field === 'weight' && !picker.config
  const initialWeightStep = picker.exercise?.weight_increment ?? 1.25
  const rawInitialValue = picker.value ?? picker.exercise[picker.field]
  const initialValue = exerciseWeight
    ? closestIncrementWeight(rawInitialValue, initialWeightStep)
    : rawInitialValue
  const [value, setValue] = useState(initialValue)
  const [weightStep, setWeightStep] = useState(initialWeightStep)
  const config = picker.config ?? (picker.field === 'weight' ? { min: 0, max: 300, step: weightStep } : picker.field === 'sets' ? { min: 1, max: 20, step: 1 } : { min: 1, max: 100, step: 1 })
  const options = useMemo(() => {
    const values = Array.from({ length: Math.floor((config.max - config.min) / config.step) + 1 }, (_, index) => Number((config.min + index * config.step).toFixed(2)))
    if (!exerciseWeight && !values.includes(initialValue)) values.push(initialValue)
    return values.sort((a, b) => a - b).map((number) => ({ value: number, label: number.toString() }))
  }, [config.max, config.min, config.step, exerciseWeight, initialValue])
  const changeWeightStep = (nextStep) => {
    setValue((current) => closestIncrementWeight(current, nextStep))
    setWeightStep(nextStep)
  }
  const save = () => { picker.onSave(value, exerciseWeight ? weightStep : undefined); onClose() }

  return (
    <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section className="picker-sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={spring}>
        <div className="sheet-handle" aria-hidden="true" />
        <header><button className="sheet-action" type="button" onClick={onClose}>Cancel</button><div><small>{picker.subtitle ?? picker.exercise.name}</small><h2 id="picker-title">{picker.title ?? `Choose ${picker.label}`}</h2></div><button className="sheet-action save" type="button" onClick={save}>Save</button></header>
        {exerciseWeight && <div className="picker-step-switch" role="group" aria-label="Weight increment">
          {[1.25, 1].map((step) => <button key={step} type="button" aria-pressed={weightStep === step} className={weightStep === step ? 'is-active' : ''} onClick={() => changeWeightStep(step)}>{step} kg</button>)}
        </div>}
        <div className="wheel-stage">
          <WheelPickerWrapper className="number-wheel-wrapper">
            <WheelPicker options={options} value={value} onValueChange={setValue} visibleCount={20} optionItemHeight={48} dragSensitivity={1.4} scrollSensitivity={1.1} classNames={{ optionItem: 'wheel-option', highlightWrapper: 'wheel-highlight', highlightItem: 'wheel-highlight-item' }} />
          </WheelPickerWrapper>
          <span className="wheel-unit">{picker.label}</span>
        </div>
      </motion.section>
    </motion.div>
  )
}

export default function App() {
  const reduceMotion = useReducedMotion()
  const loadedFromApi = useRef(false)
  const groupSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const [theme, setTheme] = useState(() => localStorage.getItem('pi-gym-theme') || 'light')
  const [workoutKey, setWorkoutKey] = useState('A')
  const [editing, setEditing] = useState(false)
  const [tuningOpen, setTuningOpen] = useState(false)
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [weights, setWeights] = useState(initialWeights)
  const [workoutDays, setWorkoutDays] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [numberPicker, setNumberPicker] = useState(null)
  const [syncError, setSyncError] = useState('')
  const isWeightTab = workoutKey === 'W'
  const isCalendarTab = workoutKey === 'C'
  const workout = isWeightTab || isCalendarTab ? [] : workouts[workoutKey]
  const exerciseCount = workout.reduce((sum, group) => sum + group.exercises.length, 0)
  const groupNames = workout.map((group) => group.name.toLowerCase()).join(' · ')
  const latest = weights.at(-1)?.value ?? null
  const change = weights.length > 1 ? (latest - weights[0].value).toFixed(1) : null
  const toggleTheme = () => { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); localStorage.setItem('pi-gym-theme', next) }
  const toggleEditing = () => {
    if (editing) setTuningOpen(false)
    setEditing(!editing)
  }

  useEffect(() => {
    const background = theme === 'dark' ? '#0f1218' : '#e9edf2'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
    document.documentElement.style.backgroundColor = background
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const updateGroups = (groups) => setWorkouts((current) => ({ ...current, [workoutKey]: groups }))
  const addGroup = () => updateGroups([...workout, { id: createId(), name: 'New category', exercises: [] }])
  const reorderGroups = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = workout.findIndex((item) => item.id === active.id)
    const newIndex = workout.findIndex((item) => item.id === over.id)
    updateGroups(arrayMove(workout, oldIndex, newIndex))
  }
  const addWeight = async (value) => {
    try {
      const saved = await saveBodyWeight(value)
      setWeights((current) => [...current.filter((item) => item.date !== saved.date), saved].sort((a, b) => a.date.localeCompare(b.date)))
      setSyncError('')
    } catch (error) {
      setSyncError(error.message)
    }
  }
  const updateWeight = async (measuredDate, value) => {
    try {
      const saved = await saveBodyWeight(value, measuredDate)
      setWeights((current) => current.map((item) => item.date === measuredDate ? saved : item))
      setSyncError('')
    } catch (error) {
      setSyncError(`Could not update measurement: ${error.message}`)
    }
  }
  const removeWeight = async (measuredDate) => {
    try {
      await deleteBodyWeight(measuredDate)
      setWeights((current) => current.filter((item) => item.date !== measuredDate))
      setSyncError('')
    } catch (error) {
      setSyncError(`Could not remove measurement: ${error.message}`)
    }
  }
  const toggleWorkoutDay = async (workoutDate) => {
    const wasMarked = workoutDays.includes(workoutDate)
    setWorkoutDays((current) => wasMarked
      ? current.filter((value) => value !== workoutDate)
      : [...current, workoutDate].sort())
    try {
      if (wasMarked) await deleteWorkoutDay(workoutDate)
      else await saveWorkoutDay(workoutDate)
      setSyncError('')
    } catch (error) {
      setWorkoutDays((current) => wasMarked
        ? [...current, workoutDate].sort()
        : current.filter((value) => value !== workoutDate))
      setSyncError(`Could not update workout calendar: ${error.message}`)
    }
  }
  const editWeight = (measurement) => setNumberPicker({ value: measurement.value, label: 'kg', title: 'Edit weight', subtitle: displayDate(measurement.date), config: { min: 30, max: 300, step: .1 }, onSave: (value) => updateWeight(measurement.date, value) })
  const openWeightEntry = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const previousWeight = weights.find((item) => item.date === localIsoDate(yesterday))?.value || 0
    const initialWeight = previousWeight || latest || 70
    const subtitle = previousWeight
      ? `Yesterday · ${previousWeight} kg`
      : latest
        ? `Latest · ${latest} kg`
        : 'New measurement'
    setNumberPicker({ value: initialWeight, label: 'kg', title: 'Add weight', subtitle, config: { min: 30, max: 300, step: .1 }, onSave: addWeight })
  }
  const pageTransition = reduceMotion ? { duration: 0 } : spring

  useEffect(() => {
    if (!numberPicker) return undefined
    window.history.pushState({ piGymPicker: true }, '')
    const closeOnBack = () => setNumberPicker(null)
    const closeOnEscape = (event) => { if (event.key === 'Escape') setNumberPicker(null) }
    window.addEventListener('popstate', closeOnBack)
    window.addEventListener('keydown', closeOnEscape)
    return () => { window.removeEventListener('popstate', closeOnBack); window.removeEventListener('keydown', closeOnEscape) }
  }, [numberPicker])

  const closeNumberPicker = () => {
    setNumberPicker(null)
    if (window.history.state?.piGymPicker) window.history.back()
  }

  useEffect(() => {
    let cancelled = false
    loadGymState()
      .then((state) => {
        if (cancelled) return
        setWorkouts(state.workouts)
        setWeights(state.weights)
        setWorkoutDays(state.workout_days)
        loadedFromApi.current = true
        setSyncError('')
      })
      .catch((error) => { if (!cancelled) setSyncError(`Backend unavailable: ${error.message}`) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!loadedFromApi.current) return undefined
    const timer = window.setTimeout(() => {
      Promise.all([saveWorkout('A', workouts.A), saveWorkout('B', workouts.B)])
        .then(() => setSyncError(''))
        .catch((error) => setSyncError(`Could not save workout: ${error.message}`))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [workouts])

  return (
    <div className="app" data-theme={theme} data-calendar-mark={layout.calendarMarkStyle} style={{
      '--layout-content-width': `${layout.contentWidth}px`,
      '--layout-page-gutter': `${layout.pageGutter}px`,
      '--layout-page-top': `${layout.pageTop}px`,
      '--layout-section-gap': `${layout.sectionGap}px`,
      '--layout-grid-gap': `${layout.gridGap}px`,
      '--layout-card-padding': `${layout.cardPadding}px`,
      '--layout-list-padding': `${layout.listPadding}px`,
      '--layout-row-height': `${layout.rowHeight}px`,
      '--layout-stat-width': `${layout.statWidth}px`,
      '--layout-stat-height': `${layout.statHeight}px`,
      '--layout-stat-number-size': `${layout.statNumberSize}px`,
      '--layout-stat-label-size': `${layout.statLabelSize}px`,
    }}>
      <main className="app-shell">
        {syncError && <div className="sync-error" role="status">{syncError}</div>}
        <header className="app-header">
          <div><p className="eyebrow">Personal training log</p><h1>Keep showing up.</h1><p className="intro">Two workouts. Clear numbers. Your progress in one place.</p></div>
          <div className="header-actions">
            <AnimatePresence initial={false}>
              {editing && <motion.div key="layout-tuner-button" className="header-tool" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 44 }} exit={{ opacity: 0, width: 0 }} transition={editTransition}><IconButton label="Open temporary layout tuner" aria-pressed={tuningOpen} onClick={() => setTuningOpen((current) => !current)}><SlidersHorizontal /></IconButton></motion.div>}
              {editing && <motion.div key="theme-button" className="header-tool" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 44 }} exit={{ opacity: 0, width: 0 }} transition={editTransition}><IconButton label={`Use ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={toggleTheme}>{theme === 'light' ? <Moon /> : <Sun />}</IconButton></motion.div>}
            </AnimatePresence>
            <motion.button className={`edit-button ${editing ? 'is-active' : ''}`} onClick={toggleEditing}>{editing ? <><Check /> Done</> : <><Pencil /> Edit</>}</motion.button>
          </div>
        </header>
        <AnimatePresence>{editing && tuningOpen && <LayoutTuner value={layout} onChange={setLayout} onClose={() => setTuningOpen(false)} />}</AnimatePresence>

        <section className="workout-section">
          <div className="workout-nav">
            <p className="workout-meta"><strong>{isCalendarTab ? `${workoutDays.length} workout days` : isWeightTab ? `${weights.length} measurements` : `${exerciseCount} exercises`}</strong><span>{isCalendarTab ? 'Your training history' : isWeightTab ? (weights.length ? `${displayDate(weights[0].date)} · ${displayDate(weights.at(-1).date)}` : 'No measurements yet') : groupNames}</span></p>
            <div className="workout-tabs" role="tablist" aria-label="Training, weight, and calendar sections">{['A', 'B', 'W', 'C'].map((key) => <button key={key} role="tab" aria-selected={workoutKey === key} className={workoutKey === key ? 'is-active' : ''} onClick={() => { setWorkoutKey(key); setEditing(false); setTuningOpen(false) }}><span>{key === 'W' ? 'Weight' : key === 'C' ? 'Calendar' : 'Workout'}</span> {key}</button>)}</div>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {isCalendarTab ? (
              <motion.div className="calendar-section" key="C" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={pageTransition}>
                <WorkoutCalendar workoutDays={workoutDays} editing={editing} onToggle={toggleWorkoutDay} />
              </motion.div>
            ) : isWeightTab ? (
              <motion.section className="weight-section tab-weight-section" key="W" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={pageTransition}>
                <header className="section-heading"><div><p className="eyebrow">Daily measure</p><h2>Weight progress</h2></div><button className="primary-button compact" onClick={openWeightEntry}><Plus /> Add weight</button></header>
                <div className="weight-panel">
                  <div className="weight-summary"><span>Latest</span>{latest === null ? <strong>—</strong> : <><strong>{latest}<small> kg</small></strong><p>{change === null ? 'First measurement' : <><b>{change} kg</b> since {displayDate(weights[0].date)}</>}</p></>}</div>
                  <WeightChart weights={weights} />
                </div>
                <AnimatePresence initial={false}>
                  {editing && (
                    <motion.div className="weight-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition}>
                      {weights.length === 0 ? <p className="weight-editor-empty">No measurements to edit.</p> : [...weights].reverse().map((measurement) => (
                        <div className="weight-editor-row" key={measurement.date}>
                          <span>{displayDate(measurement.date)}</span>
                          <button type="button" className="weight-value-button" onClick={() => editWeight(measurement)}>{measurement.value} kg</button>
                          <IconButton label={`Remove ${displayDate(measurement.date)} measurement`} onClick={() => setPendingDelete({ name: `${displayDate(measurement.date)} · ${measurement.value} kg`, kind: 'measurement', action: () => removeWeight(measurement.date) })}><Trash2 /></IconButton>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            ) : (
              <motion.div className="workout-grid" key={workoutKey} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={pageTransition}>
                <DndContext sensors={groupSensors} collisionDetection={closestCenter} onDragEnd={reorderGroups}>
                  <SortableContext items={workout.map((item) => item.id)} strategy={rectSortingStrategy}>
                    {workout.map((group, index) => <MuscleGroup key={group.id} group={group} index={index} editing={editing} onChange={(next) => updateGroups(workout.map((item) => item.id === next.id ? next : item))} onRemove={() => updateGroups(workout.filter((item) => item.id !== group.id))} confirmRemove={setPendingDelete} onPick={setNumberPicker} />)}
                    <AnimatePresence initial={false}>{editing && <motion.button className="add-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={editTransition} onClick={addGroup}><Plus /> Add category</motion.button>}</AnimatePresence>
                  </SortableContext>
                </DndContext>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
      <AnimatePresence>{pendingDelete && <ConfirmDialog item={pendingDelete} onClose={() => setPendingDelete(null)} />}</AnimatePresence>
      <AnimatePresence>{numberPicker && <NumberPickerSheet picker={numberPicker} onClose={closeNumberPicker} />}</AnimatePresence>
    </div>
  )
}
