import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const today = () => new Date().toISOString().slice(0, 10)

export default function CheckinForm({ athleteId, existing, onSaved }) {
  const [tqr, setTqr] = useState(existing?.tqr || '')
  const [sleepH, setSleepH] = useState(existing?.sleep_h || '')
  const [restingHr, setRestingHr] = useState(existing?.resting_hr || '')
  const [note, setNote] = useState(existing?.note || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('daily_checkins').upsert(
      {
        user_id: athleteId,
        the_date: today(),
        tqr: tqr ? Number(tqr) : null,
        sleep_h: sleepH ? Number(sleepH) : null,
        resting_hr: restingHr ? Number(restingHr) : null,
        note: note || null,
      },
      { onConflict: 'user_id,the_date' }
    )
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    onSaved?.()
  }

  return (
    <div className="card">
      <h3>Check-in di oggi</h3>
      {error && <div className="error-box">{error}</div>}
      {saved && <div className="success-box">Check-in salvato.</div>}
      <div className="field">
        <label>TQR — qualità del recupero (6 = pessimo, 20 = ottimo)</label>
        <input type="number" min={6} max={20} value={tqr} onChange={(e) => setTqr(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Ore di sonno (opzionale)</label>
          <input type="number" step="0.1" value={sleepH} onChange={(e) => setSleepH(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>FC a riposo (opzionale)</label>
          <input type="number" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Note (opzionale)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button onClick={save} disabled={busy || !tqr}>Salva check-in</button>
    </div>
  )
}
