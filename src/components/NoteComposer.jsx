import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function NoteComposer({ coachId, athleteId, onSent }) {
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function send() {
    if (!body.trim()) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('coach_notes').insert({
      coach_id: coachId,
      athlete_id: athleteId,
      body: body.trim(),
      priority,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setBody('')
    setPriority(false)
    onSent?.()
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Scrivi una nota o un feedback per l'atleta…" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={priority} onChange={(e) => setPriority(e.target.checked)} />
          Segna come priorità
        </label>
        <button onClick={send} disabled={busy || !body.trim()}>Invia nota</button>
      </div>
    </div>
  )
}
