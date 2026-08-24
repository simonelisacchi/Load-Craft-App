import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { parseTakeoutFiles } from '../lib/parsers/googleHealthTakeout'

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function GoogleHealthImport({ athleteId, onImported }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [okMsg, setOkMsg] = useState(null)
  const [preview, setPreview] = useState(null) // { byDate, diagnostics }
  const [showUnrecognized, setShowUnrecognized] = useState(false)

  async function onFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setBusy(true)
    setError(null)
    setOkMsg(null)
    setPreview(null)
    try {
      const result = await parseTakeoutFiles(files)
      if (!result.byDate.size) {
        setError('Nessun dato riconosciuto in questi file. Controlla di aver selezionato i file JSON dentro le cartelle "Sleep" / "Heart Rate" dell\'archivio Takeout (non altre cartelle).')
      } else {
        setPreview(result)
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function confirmImport() {
    if (!preview) return
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const rows = Array.from(preview.byDate.entries()).map(([the_date, fields]) => ({
        user_id: athleteId,
        the_date,
        ...fields, // solo i campi che il file conteneva davvero: TQR e note restano quelli che hai già inserito a mano
      }))
      const { error: upsertError } = await supabase
        .from('daily_checkins')
        .upsert(rows, { onConflict: 'user_id,the_date' })
      if (upsertError) throw upsertError
      setOkMsg(`Importati/aggiornati ${rows.length} giorni. TQR e note che avevi già inserito a mano non sono stati toccati.`)
      setPreview(null)
      onImported?.()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  const previewRows = preview ? Array.from(preview.byDate.entries()).sort((a, b) => b[0].localeCompare(a[0])) : []

  return (
    <div className="card">
      <h3>Importa da Google Takeout (Fitbit Air)</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Una tantum, da ripetere quando vuoi dati aggiornati: vai su{' '}
        <a href="https://takeout.google.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>takeout.google.com</a>,
        clicca "Deseleziona tutto" e spunta solo "Fitbit" (è ancora chiamata così anche se l'app oggi è Google Health), scegli formato JSON.
        Quando l'archivio è pronto, scaricalo ed estrailo, poi qui sotto seleziona i file JSON dentro le cartelle{' '}
        <strong>Sleep</strong>, <strong>Heart Rate</strong> (FC riposo) e, se presenti, <strong>Heart Rate Variability</strong> / respiro
        — puoi selezionarne più di uno insieme.
      </p>
      {error && <div className="error-box">{error}</div>}
      {okMsg && <div className="success-box">{okMsg}</div>}

      {!preview && (
        <>
          <input type="file" accept=".json" multiple onChange={onFiles} disabled={busy} />
          {busy && <p className="muted">Analisi in corso…</p>}
        </>
      )}

      {preview && (
        <div style={{ marginTop: 10 }}>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            {preview.diagnostics.filesRead} file letti, {preview.diagnostics.daysFound} giorni riconosciuti.
            {preview.diagnostics.unrecognizedFiles.length > 0 && (
              <>
                {' '}{preview.diagnostics.unrecognizedFiles.length} file non riconosciuti —{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setShowUnrecognized((s) => !s)}
                  style={{ fontSize: '0.8rem', padding: 0, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showUnrecognized ? 'nascondi elenco' : 'mostra elenco'}
                </button>
              </>
            )}
          </p>
          {showUnrecognized && (
            <ul className="muted" style={{ fontSize: '0.75rem', marginTop: 0 }}>
              {preview.diagnostics.unrecognizedFiles.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}

          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Controlla che i numeri siano plausibili prima di importare — confrontali con quello che ricordi (es. ore di sonno, FC a riposo):
          </p>
          <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="mono">Sonno</th>
                  <th className="mono">FC riposo</th>
                  <th className="mono">HRV</th>
                  <th className="mono">Respiro</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(([date, f]) => (
                  <tr key={date}>
                    <td>{fmtDate(date)}</td>
                    <td className="mono">{f.sleep_h != null ? `${f.sleep_h} h` : '—'}</td>
                    <td className="mono">{f.resting_hr != null ? `${f.resting_hr} bpm` : '—'}</td>
                    <td className="mono">{f.hrv != null ? f.hrv : '—'}</td>
                    <td className="mono">{f.respiration != null ? f.respiration : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={confirmImport} disabled={busy}>
              {busy ? 'Importazione…' : `Importa ${preview.diagnostics.daysFound} giorni`}
            </button>
            <button className="secondary" onClick={() => setPreview(null)} disabled={busy}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  )
}
