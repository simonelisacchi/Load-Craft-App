import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// readOnly = true quando la vista è aperta dal coach: può vedere tutto,
// ma non toccare lo stato "fatto/non fatto" — quello è una decisione
// esclusiva dell'atleta.
//
// Nota di progettazione: qui NON si chiede più all'atleta di fissare in
// anticipo "Giorno N = sempre questo giorno della settimana" per tutta
// la scheda — troppo rigido nella pratica. L'ordine è semplicemente la
// sequenza della scheda (Settimana 1/Giorno 1, poi 2, ecc.); il
// "prossimo" è sempre il primo allenamento non ancora completato.
export default function TrainingPlanView({ athleteId, readOnly = false }) {
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [completions, setCompletions] = useState({})
  const [rpeInput, setRpeInput] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    const { data: plans, error: plansError } = await supabase
      .from('training_plans')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    if (plansError) {
      setError(plansError.message)
      setLoading(false)
      return
    }
    const p = plans?.[0] || null
    setPlan(p)
    if (p) {
      const [itsRes, compsRes] = await Promise.all([
        supabase.from('training_plan_items').select('*').eq('plan_id', p.id).order('week_number').order('day_number'),
        supabase.from('workout_completions').select('*').eq('athlete_id', athleteId),
      ])
      if (itsRes.error || compsRes.error) {
        setError((itsRes.error || compsRes.error).message)
      }
      setItems(itsRes.data || [])
      const c = {}
      for (const row of compsRes.data || []) c[row.plan_item_id] = row
      setCompletions(c)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [athleteId])

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
  if (error) return <div className="error-box">{error}</div>
  if (!plan) return <p className="muted">{readOnly ? "Non hai ancora creato una scheda per questo atleta." : 'Il tuo coach non ha ancora creato una scheda per te.'}</p>

  // Ordine di sequenza della scheda: Settimana 1/Giorno 1, poi 2, ecc.
  const bySequence = [...items].sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number)
  const withStatus = bySequence.map((item) => ({ item, done: completions[item.id] }))
  const upcoming = withStatus.filter((x) => !x.done)
  const done = withStatus
    .filter((x) => x.done)
    .sort((a, b) => new Date(b.done.completed_date) - new Date(a.done.completed_date))

  function renderItem({ item, done }, isNext) {
    return (
      <div key={item.id} className="day-grid" style={{ marginBottom: 10, alignItems: 'center', opacity: done ? 0.55 : 1 }}>
        <div className="muted mono" style={{ fontSize: '0.8rem' }}>
          Sett. {item.week_number}
          <br />Giorno {item.day_number}
          {isNext && !done && <div className="zone-badge zone-sicura" style={{ marginTop: 4 }}>prossimo</div>}
        </div>
        <div>
          <div><strong style={{ textDecoration: done ? 'line-through' : 'none' }}>{item.title}</strong> <span className="muted">· {item.workout_type}</span></div>
          {item.description && <div className="muted" style={{ fontSize: '0.85rem' }}>{item.description}</div>}

          {done ? (
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 4, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>✓ completato il {new Date(done.completed_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}{done.rpe ? ` · RPE ${done.rpe}` : ''}</span>
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
      <p className="muted" style={{ fontSize: '0.85rem' }}>{plan.weeks} settimane</p>
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        I giorni della settimana in cui allenarti li scegli tu, senza doverli fissare in anticipo — qui vedi semplicemente il prossimo allenamento della scheda, in ordine.
      </p>

      <div className="week-title" style={{ marginTop: 10 }}>ALLENAMENTI</div>
      {upcoming.length
        ? upcoming.map((x, i) => renderItem(x, i === 0))
        : <p className="muted" style={{ fontSize: '0.85rem' }}>Nessun allenamento da fare — tutti completati.</p>}

      {done.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button className="secondary" onClick={() => setShowCompleted((s) => !s)}>
            {showCompleted ? 'Nascondi' : 'Mostra'} completati ({done.length})
          </button>
          {showCompleted && <div style={{ marginTop: 12 }}>{done.map((x) => renderItem(x, false))}</div>}
        </div>
      )}
    </div>
  )
}
