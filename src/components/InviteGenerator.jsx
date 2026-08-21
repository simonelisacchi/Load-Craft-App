import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function randomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export default function InviteGenerator({ coachId }) {
  const [invites, setInvites] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('invites').select('*').eq('created_by', coachId).order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      return
    }
    setError(null)
    setInvites(data || [])
  }
  useEffect(() => { load() }, [coachId])

  async function generate() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('invites').insert({ code: randomCode(), created_by: coachId })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  return (
    <div className="card">
      <h3>Inviti atleti</h3>
      {error && <div className="error-box">{error}</div>}
      <button onClick={generate} disabled={busy}>Genera nuovo codice invito</button>
      <div style={{ marginTop: 14 }}>
        {invites.map((inv) => (
          <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="mono">{inv.code}</span>
            <span className={inv.used_by ? 'muted' : ''} style={{ fontSize: '0.8rem' }}>
              {inv.used_by ? 'usato' : 'da usare'}
            </span>
          </div>
        ))}
        {!invites.length && <p className="muted">Nessun invito generato ancora.</p>}
      </div>
    </div>
  )
}
