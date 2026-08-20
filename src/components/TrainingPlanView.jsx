import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { itemDate, isSameDay, WEEKDAY_LABELS } from '../lib/planDates'

export default function TrainingPlanView({ athleteId }) {
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [mapping, setMapping] = useState({})
  const [completions, setCompletions] = useState({})
  const [rpeInput, setRpeInput] = useState({})
  const [loading, setLoading] = useState(true)

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

  if (loading) return <p className="muted">Caricamento scheda…</p>
  if (!plan) return <p className="muted">Il tuo coach non ha ancora creato una scheda per te.</p>

  const mappingComplete = dayNumbers.every((d) => mapping[d] != null)
  const today = new Date()

  return (
    <div className="card">
      <h3>{plan.title}</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>{plan.weeks} settimane · inizio {new Date(plan.start_date).toLocaleDateString('it-IT')}</p>

      {!mappingComplete && (
        <div className="card" style={{ background: 'var(--surface-2)' }}>
          <h4 style={{ marginTop: 0 }}>Scegli i tuoi giorni di allenamento</h4>
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
        </div>
      )}

      {mappingComplete && Array.from(new Set(items.map((i) => i.week_number))).map((wk) => (
        <div className="week-block" key={wk}>
          <div className="week-title">SETTIMANA {wk}</div>
          {items.filter((i) => i.week_number === wk).map((item) => {
            const date = itemDate(plan, mapping, item)
            const done = completions[item.id]
            const isToday = isSameDay(date, today)
            return (
              <div key={item.id} className="day-grid" style={{ marginBottom: 10, alignItems: 'center' }}>
                <div className="muted mono" style={{ fontSize: '0.8rem' }}>
                  {date ? date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                  {isToday && <div className="zone-badge zone-sicura" style={{ marginTop: 4 }}>oggi</div>}
                </div>
                <div>
                  <div><strong>{item.title}</strong> <span className="muted">· {item.workout_type}</span></div>
                  {item.description && <div className="muted" style={{ fontSize: '0.85rem' }}>{item.description}</div>}
                  {done ? (
                    <div className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>✓ completato{done.rpe ? ` · RPE ${done.rpe}` : ''}</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <select style={{ maxWidth: 110 }} value={rpeInput[item.id] || ''} onChange={(e) => setRpeInput((r) => ({ ...r, [item.id]: e.target.value }))}>
                        <option value="">RPE (1-10)</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <button className="secondary" onClick={() => markDone(item)}>Segna fatto</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
