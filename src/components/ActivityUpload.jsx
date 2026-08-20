import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { importActivityFile } from '../lib/importActivity'

export default function ActivityUpload({ profile, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [okMsg, setOkMsg] = useState(null)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const parsed = await importActivityFile(file, profile)
      const { error: insertError } = await supabase.from('activities').insert({
        user_id: profile.id,
        ...parsed,
      })
      if (insertError) throw insertError
      setOkMsg(`Corsa "${file.name}" caricata e analizzata.`)
      onDone?.()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="card">
      <h3>Carica una corsa</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        File .fit (Garmin, Wahoo, Zwift), .gpx o .tcx. L'analisi (VO2max,
        carico) avviene subito, nel browser.
      </p>
      {error && <div className="error-box">{error}</div>}
      {okMsg && <div className="success-box">{okMsg}</div>}
      <input type="file" accept=".fit,.gpx,.tcx" onChange={onFile} disabled={busy} />
      {busy && <p className="muted">Analisi in corso…</p>}
      {(!profile.hr_rest || !profile.hr_max) && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>
          Nota: senza FC riposo e FC massima nel tuo profilo non posso stimare VO2max e carico di allenamento.
        </p>
      )}
    </div>
  )
}
