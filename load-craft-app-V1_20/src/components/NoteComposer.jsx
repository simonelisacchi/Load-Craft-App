import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const URGENCY_OPTIONS = [
  { id: 'info', label: 'Informativa', hint: 'solo da sapere, nessuna azione richiesta' },
  { id: 'normale', label: 'Normale', hint: 'feedback ordinario' },
  { id: 'attenzione', label: 'Attenzione', hint: 'da leggere a breve' },
  { id: 'urgente', label: 'Urgente', hint: 'da leggere subito' },
]

export default function NoteComposer({ coachId, athleteId, onSent }) {
  const [body, setBody] = useState('')
  const [urgency, setUrgency] = useState('normale')
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
      urgency,
      priority: urgency === 'urgente', // colonna legacy, mantenuta allineata
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setBody('')
    setUrgency('normale')
    onSent?.()
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Scrivi una nota o un feedback per l'atleta…" />
      </div>
      <div className="field">
        <label>Livello di urgenza</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {URGENCY_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={urgency === o.id ? '' : 'secondary'}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setUrgency(o.id)}
              title={o.hint}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={send} disabled={busy || !body.trim()}>Invia nota</button>
    </div>
  )
}
