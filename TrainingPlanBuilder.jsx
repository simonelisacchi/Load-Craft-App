import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const WORKOUT_TYPES = ['corsa facile', 'lungo', 'ripetute', 'soglia', 'recupero', 'riposo', 'altro']

export default function TrainingPlanBuilder({ coachId, athleteId, onCreated }) {
  const [title, setTitle] = useState('')
  const [weeks, setWeeks] = useState(6)
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState(() => buildEmptyGrid(6, 4))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function buildEmptyGrid(w, d) {
    const grid = {}
    for (let wk = 1; wk <= w; wk++) {
      grid[wk] = Array.from({ length: d }, () => ({ title: '', workout_type: 'corsa facile', description: '' }))
    }
    return grid
  }

  function resize(newWeeks, newDays) {
    setWeeks(newWeeks)
    setDaysPerWeek(newDays)
    setItems(buildEmptyGrid(newWeeks, newDays))
  }

  function updateCell(week, dayIdx, field, value) {
    setItems((prev) => {
      const copy = { ...prev, [week]: [...prev[week]] }
      copy[week][dayIdx] = { ...copy[week][dayIdx], [field]: value }
      return copy
    })
  }

  async function save() {
    if (!title.trim()) {
      setError('Dai un titolo alla scheda.')
      return
    }
    setBusy(true)
    setError(null)

    // Solo una scheda alla volta è "attiva" per l'atleta: creandone una
    // nuova, quella precedente (se c'era) viene disattivata ma resta nel
    // database, non viene cancellata.
    await supabase.from('training_plans').update({ active: false }).eq('athlete_id', athleteId).eq('active', true)

    const { data: plan, error: planError } = await supabase
      .from('training_plans')
      .insert({ coach_id: coachId, athlete_id: athleteId, title: title.trim(), weeks, start_date: startDate })
      .select()
      .single()
    if (planError) {
      setError(planError.message)
      setBusy(false)
      return
    }

    const rows = []
    for (let wk = 1; wk <= weeks; wk++) {
      items[wk].forEach((cell, idx) => {
        if (!cell.title.trim()) return
        rows.push({
          plan_id: plan.id,
          week_number: wk,
          day_number: idx + 1,
          title: cell.title.trim(),
          workout_type: cell.workout_type,
          description: cell.description || null,
        })
      })
    }
    if (rows.length) {
      const { error: itemsError } = await supabase.from('training_plan_items').insert(rows)
      if (itemsError) {
        setError(itemsError.message)
        setBusy(false)
        return
      }
    }
    setBusy(false)
    setTitle('')
    resize(6, 4)
    onCreated?.()
  }

  return (
    <div className="card">
      <h3>Crea una scheda nuova</h3>
      <p className="muted" style={{ fontSize: '0.82rem' }}>
        Serve solo se vuoi ripartire da zero. Per modificare la scheda
        attuale (aggiungere, correggere o togliere singoli allenamenti)
        usa "Modifica scheda attuale" qui sopra — è più veloce.
      </p>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label>Titolo scheda</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Preparazione 10km — Ottobre" />
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Numero di settimane</label>
          <input type="number" min={1} max={20} value={weeks} onChange={(e) => resize(Number(e.target.value) || 1, daysPerWeek)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Allenamenti a settimana</label>
          <input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => resize(weeks, Number(e.target.value) || 1)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Inizio Settimana 1</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.82rem' }}>
        Qui assegni solo "Giorno 1, 2, 3…" di ogni settimana — sarà l'atleta a scegliere a quale giorno della settimana solare corrisponde ciascuno.
      </p>

      {Array.from({ length: weeks }, (_, i) => i + 1).map((wk) => (
        <div className="week-block" key={wk}>
          <div className="week-title">SETTIMANA {wk}</div>
          {items[wk]?.map((cell, idx) => (
            <div key={idx} className="day-grid" style={{ marginBottom: 8 }}>
              <div className="muted mono" style={{ paddingTop: 8 }}>Giorno {idx + 1}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="titolo (es. 8km facile)"
                  value={cell.title}
                  onChange={(e) => updateCell(wk, idx, 'title', e.target.value)}
                />
                <select style={{ maxWidth: 150 }} value={cell.workout_type} onChange={(e) => updateCell(wk, idx, 'workout_type', e.target.value)}>
                  {WORKOUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      ))}

      <button onClick={save} disabled={busy}>Salva scheda</button>
    </div>
  )
}
