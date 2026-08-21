import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { itemDate, isSameDay, WEEKDAY_LABELS } from '../lib/planDates'

// readOnly = true quando la vista è aperta dal coach: può vedere tutto,
// ma non toccare lo stato "fatto/non fatto" — quello è una decisione
// esclusiva dell'atleta (anche a livello di database, le regole RLS
// bloccherebbero comunque la scrittura; qui nascondiamo i controlli
// perché non abbia senso proporli).
export default function TrainingPlanView({ athleteId, readOnly = false }) {
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [mapping, setMapping] = useState({})
  const [completions, setCompletions] = useState({})
  const [rpeInput, setRpeInput] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  async function load() {
    setLoading(true)
    const { data: plans } = await supabase
      .from('training_plans')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    const p = plans?.[0] || null
    setPlan(p)
    if (p) {
      const [{ data: its }, { data: maps }, { data: comps }] = await Promise.all([
        supabase.from('training_plan_items').select('*').eq('plan_id', p.id).order('week_number').order('day_number'),
        supabase.from('athlete_day_mapping').select('*').eq('plan_id', p.id),
        supabase.from('workout_completions').select('*').eq('athlete_id', athleteId),
      ])
      setItems(its || [])
      const m = {}
      for (const row of maps || []) m[row.day_number] = row.weekday
      setMapping(m)
      const c = {}
      for (const row of comps || []) c[row.plan_item_id] = row
      setCompletions(c)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [athleteId])

  const dayNumbers = useMemo(() => [...new Set(items.map((i) => i.day_number))].sort((a, b) => a - b), [items])

  async function setWeekday(dayNumber, weekday) {
    setMapping((m) => ({ ...m, [dayNumber]: weekday }))
    await supabase.from('athlete_day_mapping').upsert({ plan_id: plan.id, day_number: dayNumber, weekday })
  }

  async function markDone(item) {
    const today = new Date().toISOString().slice(0, 10)
    const rpe = rpeInput[item.id] ? Number(rpeInput[item.id]) : null
    const { error } = await supabase.from('workout_completions').upsert(
      { plan_item_id: item.id, athlete_id: athleteId, completed_date: today, rpe },
      { onConflict: 'plan_item_id,completed_date' }
    )
    if (!error) load()
  }

  async function undoDone(item) {
    const done = completions[item.id]
    if (!done) return
    if (!confirm('Segnare di nuovo questo allenamento come "da fare"?')) return
    await supabase.from('workout_completions').delete().eq('id', done.id)
    load()
  }

  if (loading) return <p className="muted">Caricamento scheda…</p>
  if (!plan) return <p className="muted">{readOnly ? "Non hai ancora creato una scheda per questo atleta." : 'Il tuo coach non ha ancora creato una scheda per te.'}</p>

  const mappingComplete = dayNumbers.every((d) => mapping[d] != null)
  const today = new Date()

  // Lista piatta con la data reale calcolata, ordinata cronologicamente:
  // i prossimi allenamenti da fare prima, quelli completati dopo.
  const withDates = items.map((item) => ({ item, date: itemDate(plan, mapping, item), done: completions[item.id] }))
  const upcoming = withDates.filter((x) => !x.done).sort((a, b) => (a.date && b.date ? a.date - b.date : 0))
  const done = withDates.filter((x) => x.done).sort((a, b) => (a.date && b.date ? b.date - a.date : 0))

  function renderItem({ item, date, done }) {
    const isToday = isSameDay(date, today)
    return (
      <div key={item.id} className="day-grid" style={{ marginBottom: 10, alignItems: 'center', opacity: done ? 0.55 : 1 }}>
        <div className="muted mono" style={{ fontSize: '0.8rem' }}>
          {date ? date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
          {isToday && !done && <div className="zone-badge zone-sicura" style={{ marginTop: 4 }}>oggi</div>}
        </div>
        <div>
          <div><strong style={{ textDecoration: done ? 'line-through' : 'none' }}>{item.title}</strong> <span className="muted">· {item.workout_type}</span></div>
          {item.description && <div className="muted" style={{ fontSize: '0.85rem' }}>{item.description}</div>}

          {done ? (
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>✓ completato{done.rpe ? ` · RPE ${done.rpe}` : ''}</span>
              {!readOnly && (
                <button className="secondary" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => undoDone(item)}>Annulla</button>
              )}
            </div>
          ) : (
            !readOnly && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <select style={{ maxWidth: 110 }} value={rpeInput[item.id] || ''} onChange={(e) => setRpeInput((r) => ({ ...r, [item.id]: e.target.value }))}>
                  <option value="">RPE (1-10)</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button className="secondary" onClick={() => markDone(item)}>Segna fatto</button>
              </div>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>{plan.title}</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>{plan.weeks} settimane · inizio {new Date(plan.start_date).toLocaleDateString('it-IT')}</p>

      {!mappingComplete && (
        <div className="card" style={{ background: 'var(--surface-2)' }}>
          <h4 style={{ marginTop: 0 }}>{readOnly ? "In attesa che l'atleta scelga i giorni di allenamento" : 'Scegli i tuoi giorni di allenamento'}</h4>
          {readOnly ? (
            <p className="muted" style={{ fontSize: '0.82rem' }}>Solo l'atleta può assegnare a quale giorno della settimana corrisponde ciascun "Giorno N" della scheda.</p>
          ) : (
            <>
              <p className="muted" style={{ fontSize: '0.82rem' }}>Il coach ha assegnato "Giorno 1, 2, 3…" per ogni settimana. Dì tu a quale giorno della settimana corrisponde ciascuno.</p>
              {dayNumbers.map((d) => (
                <div key={d} className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ marginBottom: 0, minWidth: 70 }}>Giorno {d}</label>
                  <select value={mapping[d] ?? ''} onChange={(e) => setWeekday(d, Number(e.target.value))}>
                    <option value="" disabled>scegli il giorno…</option>
                    {WEEKDAY_LABELS.map((label, idx) => <option key={idx} value={idx}>{label}</option>)}
                  </select>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {mappingComplete && (
        <>
          <div className="week-title" style={{ marginTop: 10 }}>PROSSIMI ALLENAMENTI</div>
          {upcoming.length ? upcoming.map(renderItem) : <p className="muted" style={{ fontSize: '0.85rem' }}>Nessun allenamento da fare — tutti completati.</p>}

          {done.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button className="secondary" onClick={() => setShowCompleted((s) => !s)}>
                {showCompleted ? 'Nascondi' : 'Mostra'} completati ({done.length})
              </button>
              {showCompleted && <div style={{ marginTop: 12 }}>{done.map(renderItem)}</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
