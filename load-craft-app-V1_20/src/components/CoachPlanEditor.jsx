import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const WORKOUT_TYPES = ['corsa facile', 'lungo', 'ripetute', 'soglia', 'recupero', 'riposo', 'altro']

// planId: la scheda specifica da modificare (non più "sempre quella
// attiva" — il coach la sceglie da un elenco prima di arrivare qui).
export default function CoachPlanEditor({ planId, onBack, onChanged }) {
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveMsg, setSaveMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // campi di testata modificabili
  const [title, setTitle] = useState('')
  const [weeks, setWeeks] = useState(1)
  const [startDate, setStartDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: p, error: planError } = await supabase
      .from('training_plans')
      .select('*')
      .eq('id', planId)
      .single()
    if (planError) {
      setError(planError.message)
      setLoading(false)
      return
    }
    setPlan(p)
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
    setDirty(false)
    setLoading(false)
  }, [planId])

  useEffect(() => { load() }, [load])

  function updateLocal(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
    setDirty(true)
  }

  // Un solo pulsante "Salva" per tutto: intestazione della scheda +
  // titolo/tipo/note di ogni allenamento, in un'unica operazione.
  async function saveAll() {
    setSaving(true)
    setError(null)
    setSaveMsg(null)

    const { error: headerError } = await supabase
      .from('training_plans')
      .update({ title: title.trim(), weeks: Number(weeks), start_date: startDate })
      .eq('id', plan.id)

    const itemUpdates = await Promise.all(
      items.map((item) =>
        supabase
          .from('training_plan_items')
          .update({ title: item.title.trim(), workout_type: item.workout_type, description: item.description || null })
          .eq('id', item.id)
      )
    )
    const itemError = itemUpdates.find((r) => r.error)?.error

    setSaving(false)
    if (headerError || itemError) {
      setError((headerError || itemError).message)
      return
    }
    setDirty(false)
    setSaveMsg('Tutte le modifiche sono state salvate.')
    setTimeout(() => setSaveMsg(null), 3000)
    load()
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
  if (!plan) return null

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <button className="secondary" onClick={onBack} style={{ padding: '5px 10px', fontSize: '0.8rem' }}>← Elenco schede</button>
        {plan.active && <span className="zone-badge zone-sicura">attiva</span>}
      </div>

      <h3 style={{ marginBottom: 4 }}>Modifica scheda</h3>
      {error && <div className="error-box">{error}</div>}
      {saveMsg && <div className="success-box">{saveMsg}</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 2, minWidth: 180 }}>
          <label>Titolo</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true) }} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 90 }}>
          <label>Settimane</label>
          <input type="number" min={1} max={30} value={weeks} onChange={(e) => { setWeeks(e.target.value); setDirty(true) }} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label>Inizio Settimana 1</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDirty(true) }} />
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        Se allunghi le settimane, aggiungi qui sotto gli allenamenti per le
        nuove settimane con "+ aggiungi allenamento" (si aggiunge subito).
        Le altre modifiche si salvano tutte insieme col pulsante in fondo.
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
                <button className="danger" onClick={() => deleteItem(item)}>Elimina</button>
              </div>
            </div>
          ))}
          <button className="secondary" onClick={() => addItem(wk)}>+ aggiungi allenamento</button>
        </div>
      ))}

      <div style={{ position: 'sticky', bottom: 84, marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={saveAll} disabled={saving || !dirty} style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
          {saving ? 'Salvataggio…' : dirty ? 'Salva tutte le modifiche' : 'Nessuna modifica da salvare'}
        </button>
      </div>
    </div>
  )
}
