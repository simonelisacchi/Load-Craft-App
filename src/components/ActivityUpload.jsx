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

      // Controllo doppioni: stessa persona, corsa iniziata entro 5 minuti
      // da un'altra già presente — capita facilmente ricaricando per
      // sbaglio lo stesso file due volte.
      if (parsed.started_at) {
        const windowMin = 5 * 60 * 1000
        const from = new Date(new Date(parsed.started_at).getTime() - windowMin).toISOString()
        const to = new Date(new Date(parsed.started_at).getTime() + windowMin).toISOString()
        const { data: similar } = await supabase
          .from('activities')
          .select('id, name, started_at')
          .eq('user_id', profile.id)
          .gte('started_at', from)
          .lte('started_at', to)
        if (similar?.length) {
          const ok = confirm(
            `Hai già una corsa caricata vicino a questo orario ("${similar[0].name}"). Caricare comunque questo file come corsa separata?`
          )
          if (!ok) {
            setBusy(false)
            e.target.value = ''
            return
          }
        }
      }

      const { error: insertError } = await supabase.from('activities').insert({
        user_id: profile.id,
        ...parsed,
      })
      if (insertError) throw insertError

      // Riepilogo diagnostico: quanti punti aveva il file e quanti con
      // FC valida — così se qualcosa non torna si vede subito il perché,
      // invece di scoprirlo solo aprendo il dettaglio della corsa.
      const totalPoints = parsed.record_stream?.length || 0
      const hrPoints = parsed.record_stream?.filter((p) => Number.isFinite(p.hr)).length || 0
      const vo2Msg = parsed.vo2max_estimate != null
        ? ` VO2max stimato: ${parsed.vo2max_estimate}.`
        : freshProfile.hr_rest && freshProfile.hr_max
          ? ' VO2max non calcolato per questa corsa (apri il dettaglio per il motivo esatto).'
          : ' VO2max non calcolato: mancano FC riposo/massima nel profilo.'
      setOkMsg(`Corsa "${file.name}" caricata. ${totalPoints} punti letti, ${hrPoints} con FC valida.${vo2Msg}`)
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
