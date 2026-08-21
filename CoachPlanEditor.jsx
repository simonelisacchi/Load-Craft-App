import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const WORKOUT_TYPES = ['corsa facile', 'lungo', 'ripetute', 'soglia', 'recupero', 'riposo', 'altro']

export default function CoachPlanEditor({ athleteId, onChanged }) {
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savedId, setSavedId] = useState(null)

  // campi di testata modificabili
  const [title, setTitle] = useState('')
  const [weeks, setWeeks] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [headerBusy, setHeaderBusy] = useState(false)
  const [headerSaved, setHeaderSaved] = useState(false)

  const load = useCallback(async () => {
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
      setTitle(p.title)
      setWeeks(p.weeks)
      setStartDate(p.start_date)
      const { data: its, error: itsError } = await supabase
        .from('training_plan_items')
        .select('*')
        .eq('plan_id', p.id)
        .order('week_number')
        .order('day_number')
      if (itsError) setError(itsError.message)
      setItems(its || [])
    } else {
      setItems([])
    }
    setLoading(false)
  }, [athleteId])

  useEffect(() => { load() }, [load])

  async function saveHeader() {
    setHeaderBusy(true)
    setError(null)
    const { error } = await supabase
      .from('training_plans')
      .update({ title: title.trim(), weeks: Number(weeks), start_date: startDate })
      .eq('id', plan.id)
    setHeaderBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setHeaderSaved(true)
    setTimeout(() => setHeaderSaved(false), 2000)
    load()
    onChanged?.()
  }

  function updateLocal(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  async function saveItem(item) {
    setError(null)
    const { error } = await supabase
      .from('training_plan_items')
      .update({ title: item.title.trim(), workout_type: item.workout_type, description: item.description || null })
      .eq('id', item.id)
    if (error) {
      setError(error.message)
      return
    }
    setSavedId(item.id)
    setTimeout(() => setSavedId(null), 1500)
    onChanged?.()
  }

  async function deleteItem(item) {
    if (!confirm(`Eliminare "${item.title}" (Settimana ${item.week_number}, Giorno ${item.day_number})?`)) return
    const { error } = await supabase.from('training_plan_items').delete().eq('id', item.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
    onChanged?.()
  }

  async function addItem(weekNumber) {
    const dayNumbers = items.filter((i) => i.week_number === weekNumber).map((i) => i.day_number)
    const nextDay = dayNumbers.length ? Math.max(...dayNumbers) + 1 : 1
    const { error } = await supabase.from('training_plan_items').insert({
      plan_id: plan.id,
      week_number: weekNumber,
      day_number: nextDay,
      title: 'Nuovo allenamento',
      workout_type: 'corsa facile',
    })
    if (error) {
      setError(error.message)
      return
    }
    load()
    onChanged?.()
  }

  if (loading) return <p className="muted">Caricamento scheda…</p>
  if (!plan) return null // nessuna scheda attiva: nulla da modificare, si userà il costruttore qui sotto

  return (
    <div className="card">
      <h3>Modifica scheda attuale</h3>
      {error && <div className="error-box">{error}</div>}
      {headerSaved && <div className="success-box">Dati scheda aggiornati.</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 2, minWidth: 180 }}>
          <label>Titolo</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 90 }}>
          <label>Settimane</label>
          <input type="number" min={1} max={30} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label>Inizio Settimana 1</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field" style={{ flex: '0 0 auto' }}>
          <button onClick={saveHeader} disabled={headerBusy}>Aggiorna</button>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        Se allunghi le settimane, aggiungi qui sotto gli allenamenti per le
        nuove settimane con "+ aggiungi allenamento". Se cambi l'inizio della
        Settimana 1, le date che vede l'atleta si aggiornano subito.
      </p>

      {Array.from({ length: weeks }, (_, i) => i + 1).map((wk) => (
        <div className="week-block" key={wk}>
          <div className="week-title">SETTIMANA {wk}</div>
          {items.filter((it) => it.week_number === wk).map((item) => (
            <div key={item.id} className="day-grid" style={{ marginBottom: 8, alignItems: 'center' }}>
              <div className="muted mono" style={{ paddingTop: 8 }}>Giorno {item.day_number}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  style={{ flex: 2, minWidth: 140 }}
                  value={item.title}
                  onChange={(e) => updateLocal(item.id, 'title', e.target.value)}
                />
                <select style={{ flex: 1, minWidth: 130 }} value={item.workout_type || ''} onChange={(e) => updateLocal(item.id, 'workout_type', e.target.value)}>
                  {WORKOUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  style={{ flex: 2, minWidth: 140 }}
                  placeholder="note (opzionale)"
                  value={item.description || ''}
                  onChange={(e) => updateLocal(item.id, 'description', e.target.value)}
                />
                <button className="secondary" onClick={() => saveItem(item)}>{savedId === item.id ? 'Salvato ✓' : 'Salva'}</button>
                <button className="danger" onClick={() => deleteItem(item)}>Elimina</button>
              </div>
            </div>
          ))}
          <button className="secondary" onClick={() => addItem(wk)}>+ aggiungi allenamento</button>
        </div>
      ))}
    </div>
  )
}
