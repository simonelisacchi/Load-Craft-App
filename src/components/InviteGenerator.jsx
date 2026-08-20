import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function randomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export default function InviteGenerator({ coachId }) {
  const [invites, setInvites] = useState([])
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('invites').select('*').eq('created_by', coachId).order('created_at', { ascending: false })
    setInvites(data || [])
  }
  useEffect(() => { load() }, [coachId])

  async function generate() {
    setBusy(true)
    await supabase.from('invites').insert({ code: randomCode(), created_by: coachId })
    setBusy(false)
    load()
  }

  return (
    <div className="card">
      <h3>Inviti atleti</h3>
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
