import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { importActivityFile, estimateVo2maxForActivity } from '../lib/importActivity'
import { ACTIVITY_TYPES } from '../lib/activityTypes'

export default function ActivityUpload({ profile, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [okMsg, setOkMsg] = useState(null)
  // Attività appena analizzata, in attesa che l'utente confermi il tipo
  // prima del salvataggio definitivo.
  const [pending, setPending] = useState(null)
  const [pendingFileName, setPendingFileName] = useState(null)
  const [selectedType, setSelectedType] = useState('')
  const [wasDetected, setWasDetected] = useState(false)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      // Leggiamo FC riposo/massima fresche dal database invece di
      // fidarci di quelle in memoria: se le hai appena salvate, questo
      // evita qualunque possibile ritardo di sincronizzazione.
      const { data: freshProfile, error: profError } = await supabase
        .from('profiles')
        .select('hr_rest, hr_max, sex')
        .eq('id', profile.id)
        .single()
      if (profError) throw profError

      const parsed = await importActivityFile(file, freshProfile)
      setPending({ parsed, freshProfile })
      setPendingFileName(file.name)
      setSelectedType(parsed.detected_activity_type || '')
      setWasDetected(!!parsed.detected_activity_type)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  function cancelPending() {
    setPending(null)
    setPendingFileName(null)
    setSelectedType('')
    setWasDetected(false)
  }

  async function confirmAndSave() {
    if (!pending || !selectedType) return
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const { parsed, freshProfile } = pending
      const vo2 = estimateVo2maxForActivity(parsed._record_full, freshProfile, selectedType)

      const toInsert = {
        source: parsed.source,
        name: parsed.name,
        started_at: parsed.started_at,
        duration_s: parsed.duration_s,
        distance_m: parsed.distance_m,
        avg_hr: parsed.avg_hr,
        max_hr: parsed.max_hr,
        avg_pace_s_per_km: parsed.avg_pace_s_per_km,
        training_load: parsed.training_load,
        record_stream: parsed.record_stream,
        activity_type: selectedType,
        vo2max_estimate: vo2.vo2max,
        vo2max_confidence: vo2.confidence,
      }

      // Controllo doppioni: stessa persona, attività iniziata entro 5
      // minuti da un'altra già presente — capita facilmente ricaricando
      // per sbaglio lo stesso file due volte.
      if (toInsert.started_at) {
        const windowMin = 5 * 60 * 1000
        const from = new Date(new Date(toInsert.started_at).getTime() - windowMin).toISOString()
        const to = new Date(new Date(toInsert.started_at).getTime() + windowMin).toISOString()
        const { data: similar } = await supabase
          .from('activities')
          .select('id, name, started_at')
          .eq('user_id', profile.id)
          .gte('started_at', from)
          .lte('started_at', to)
        if (similar?.length) {
          const ok = confirm(
            `Hai già un'attività caricata vicino a questo orario ("${similar[0].name}"). Caricare comunque questo file come attività separata?`
          )
          if (!ok) {
            setBusy(false)
            return
          }
        }
      }

      const { error: insertError } = await supabase.from('activities').insert({
        user_id: profile.id,
        ...toInsert,
      })
      if (insertError) throw insertError

      // Riepilogo diagnostico: quanti punti aveva il file e quanti con
      // FC valida — così se qualcosa non torna si vede subito il perché,
      // invece di scoprirlo solo aprendo il dettaglio dell'attività.
      const totalPoints = parsed.record_stream?.length || 0
      const hrPoints = parsed.record_stream?.filter((p) => Number.isFinite(p.hr)).length || 0
      const vo2Msg = toInsert.vo2max_estimate != null
        ? ` VO2max stimato: ${toInsert.vo2max_estimate}.`
        : selectedType !== 'corsa'
          ? ' VO2max non calcolato (disponibile solo per la corsa).'
          : freshProfile.hr_rest && freshProfile.hr_max
            ? ' VO2max non calcolato per questa corsa (apri il dettaglio per il motivo esatto).'
            : ' VO2max non calcolato: mancano FC riposo/massima nel profilo.'
      setOkMsg(`Attività "${pendingFileName}" caricata. ${totalPoints} punti letti, ${hrPoints} con FC valida.${vo2Msg}`)
      cancelPending()
      onDone?.()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Carica un'attività</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        File .fit (Garmin, Wahoo, Zwift), .gpx o .tcx. L'analisi (VO2max,
        carico) avviene subito, nel browser.
      </p>
      {error && <div className="error-box">{error}</div>}
      {okMsg && <div className="success-box">{okMsg}</div>}

      {!pending && (
        <>
          <input type="file" accept=".fit,.gpx,.tcx" onChange={onFile} disabled={busy} />
          {busy && <p className="muted">Analisi in corso…</p>}
        </>
      )}

      {pending && (
        <div style={{ marginTop: 10 }}>
          <div className="field">
            <label>
              Tipo di attività
              {wasDetected ? ' (rilevato dal file, correggi se serve)' : ' — non rilevato dal file, selezionalo tu'}
            </label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="" disabled>— seleziona —</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          {selectedType && selectedType !== 'corsa' && (
            <p className="muted" style={{ fontSize: '0.8rem' }}>
              Il VO2max non verrà calcolato per questo tipo di attività (l'algoritmo funziona solo per la corsa).
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={confirmAndSave} disabled={busy || !selectedType}>
              {busy ? 'Salvataggio…' : 'Carica attività'}
            </button>
            <button className="secondary" onClick={cancelPending} disabled={busy}>Annulla</button>
          </div>
        </div>
      )}

      {(!profile.hr_rest || !profile.hr_max) && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>
          Nota: senza FC riposo e FC massima nel tuo profilo non posso stimare VO2max e carico di allenamento.
        </p>
      )}
    </div>
  )
}
