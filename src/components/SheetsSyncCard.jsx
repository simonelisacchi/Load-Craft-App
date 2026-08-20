import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { syncActivitiesToSheet, syncCheckinsToSheet } from '../lib/googleSheets'

const LS_KEY = (uid) => `sheets_id_${uid}`

export default function SheetsSyncCard({ athleteId }) {
  const [sheetId, setSheetId] = useState(localStorage.getItem(LS_KEY(athleteId)) || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)

  async function syncNow() {
    if (!sheetId.trim()) {
      setError('Incolla prima l\'ID del foglio Google Sheets (lo trovi nell\'URL del foglio).')
      return
    }
    localStorage.setItem(LS_KEY(athleteId), sheetId.trim())
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const [{ data: activities }, { data: checkins }] = await Promise.all([
        supabase.from('activities').select('*').eq('user_id', athleteId).order('started_at'),
        supabase.from('daily_checkins').select('*').eq('user_id', athleteId).order('the_date'),
      ])
      const r1 = await syncActivitiesToSheet(sheetId.trim(), activities || [])
      const r2 = await syncCheckinsToSheet(sheetId.trim(), checkins || [])
      setMsg(`Sincronizzato: ${r1.synced} corse, ${r2.synced} check-in aggiunti al foglio.`)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Backup su Google Sheets</h3>
      <p className="muted" style={{ fontSize: '0.82rem' }}>
        Crea un foglio Google Sheets vuoto, condividilo con il tuo account
        Google, incolla qui il suo ID (la parte dell'URL tra
        <code> /d/</code> e <code>/edit</code>), poi sincronizza quando vuoi.
        Ogni volta ti verrà chiesto il consenso Google — è normale, serve
        a non dover custodire credenziali a lungo termine da nessuna parte.
      </p>
      {error && <div className="error-box">{error}</div>}
      {msg && <div className="success-box">{msg}</div>}
      <div className="field">
        <label>ID foglio Google Sheets</label>
        <input value={sheetId} onChange={(e) => setSheetId(e.target.value)} placeholder="es. 1AbCdEfGhIjKlMnOpQrStUvWxYz" />
      </div>
      <button onClick={syncNow} disabled={busy}>{busy ? 'Sincronizzazione…' : 'Sincronizza ora'}</button>
    </div>
  )
}
