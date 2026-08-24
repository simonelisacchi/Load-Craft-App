import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RouteMap from './RouteMap'
import LineChart from './LineChart'
import { estimateVo2max } from '../lib/vo2max'
import { computeTrimp } from '../lib/acwr'
import { ACTIVITY_TYPES, activityTypeIcon, activityTypeLabel } from '../lib/activityTypes'

function fmtPace(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}/km`
}
function fmtDuration(s) {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtMinKm(s) {
  if (!Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// canManage: true quando la vista è aperta dall'atleta proprietario della
// corsa — abilita "Elimina" e "Ricalcola" (azioni sui propri dati, non
// disponibili al coach, coerente con le regole del database).
export default function ActivityDetail({ activityId, onClose, canManage = false, onDeleted }) {
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoverT, setHoverT] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)
  const [vo2Reason, setVo2Reason] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setHoverT(null)
    setActionMsg(null)
    supabase.from('activities').select('*').eq('id', activityId).single().then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setActivity(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [activityId])

  // Se manca la stima VO2max, capiamo e mostriamo il motivo esatto
  // invece di lasciare un trattino senza spiegazione.
  useEffect(() => {
    if (!activity || activity.vo2max_estimate != null) {
      setVo2Reason(null)
      return
    }
    if (activity.activity_type && activity.activity_type !== 'corsa') {
      setVo2Reason('la stima VO2max è supportata solo per la corsa.')
      return
    }
    let cancelled = false
    async function explain() {
      if (activity.duration_s && activity.duration_s < 300) {
        setVo2Reason('la corsa dura meno di 5 minuti: non basta per una stima affidabile.')
        return
      }
      const { data: prof } = await supabase.from('profiles').select('hr_rest, hr_max, sex').eq('id', activity.user_id).single()
      if (cancelled) return
      if (!prof?.hr_rest || !prof?.hr_max) {
        setVo2Reason('mancavano FC riposo/massima nel profilo al momento del caricamento. Completa il profilo e usa "Ricalcola".')
        return
      }
      const record = activity.record_stream || []
      const result = estimateVo2max(record, { hrRest: prof.hr_rest, hrMax: prof.hr_max, sex: prof.sex })
      if (cancelled) return
      setVo2Reason(result.note || 'dati insufficienti in questa corsa.')
    }
    explain()
    return () => { cancelled = true }
  }, [activity])

  async function handleDelete() {
    if (!confirm('Eliminare definitivamente questa attività? Non si può annullare.')) return
    setBusy(true)
    const { error } = await supabase.from('activities').delete().eq('id', activityId)
    setBusy(false)
    if (error) {
      setActionMsg({ type: 'error', text: error.message })
      return
    }
    onDeleted?.()
  }

  async function handleRecalculate() {
    setBusy(true)
    setActionMsg(null)
    try {
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('hr_rest, hr_max, sex')
        .eq('id', activity.user_id)
        .single()
      if (profError) throw profError
      if (!prof.hr_rest || !prof.hr_max) {
        setActionMsg({ type: 'error', text: 'Nel profilo mancano ancora FC riposo/massima: completale prima di ricalcolare.' })
        setBusy(false)
        return
      }
      const record = activity.record_stream || []
      // Il VO2max si ricalcola solo per le corse (vedi activityTypes.js):
      // per gli altri tipi di attività resta null a prescindere dai dati
      // in FC/ritmo, invece di riprodurre lo stesso errore di prima.
      const vo2 = activity.activity_type === 'corsa'
        ? estimateVo2max(record, { hrRest: prof.hr_rest, hrMax: prof.hr_max, sex: prof.sex })
        : { vo2max: null, confidence: null }
      const trimp = computeTrimp(record, { hrRest: prof.hr_rest, hrMax: prof.hr_max, sex: prof.sex }, activity.duration_s / 60)
      const updated = {
        vo2max_estimate: vo2.vo2max,
        vo2max_confidence: vo2.confidence,
        training_load: trimp ? Math.round(trimp * 10) / 10 : null,
      }
      const { error: updError } = await supabase.from('activities').update(updated).eq('id', activityId)
      if (updError) throw updError
      setActivity((a) => ({ ...a, ...updated }))
      setActionMsg({ type: 'success', text: 'Ricalcolato con i valori attuali del profilo.' })
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || String(err) })
    } finally {
      setBusy(false)
    }
  }

  // Corregge il tipo di attività di corse già caricate (importante per
  // quelle salvate PRIMA di questa versione: erano tutte trattate come
  // corsa, quindi vanno riclassificate a mano una volta). Se il nuovo
  // tipo non è "corsa" azzera subito il VO2max invece di lasciarlo lì
  // calcolato male; se diventa "corsa" bisogna poi premere "Ricalcola".
  async function handleTypeChange(newType) {
    if (!newType || newType === activity.activity_type) return
    setBusy(true)
    setActionMsg(null)
    try {
      const updated = { activity_type: newType }
      if (newType !== 'corsa') {
        updated.vo2max_estimate = null
        updated.vo2max_confidence = null
      }
      const { error: updError } = await supabase.from('activities').update(updated).eq('id', activityId)
      if (updError) throw updError
      setActivity((a) => ({ ...a, ...updated }))
      setActionMsg({
        type: 'success',
        text: newType === 'corsa'
          ? 'Tipo aggiornato a Corsa. Premi "Ricalcola" per stimare il VO2max con i dati di questa attività.'
          : 'Tipo aggiornato. VO2max azzerato (disponibile solo per la corsa).',
      })
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || String(err) })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="card"><p className="muted">Caricamento attività…</p></div>
  if (error) return <div className="card"><div className="error-box">{error}</div></div>
  if (!activity) return null

  const record = activity.record_stream || []
  const hrPoints = record.filter((p) => Number.isFinite(p.hr)).map((p) => ({ x: p.t, y: p.hr }))
  const pacePoints = record.filter((p) => Number.isFinite(p.paceSecPerKm) && p.paceSecPerKm > 0 && p.paceSecPerKm < 1200).map((p) => ({ x: p.t, y: p.paceSecPerKm }))
  const speedPoints = record.filter((p) => Number.isFinite(p.paceSecPerKm) && p.paceSecPerKm > 0 && p.paceSecPerKm < 1200).map((p) => ({ x: p.t, y: 3600 / p.paceSecPerKm }))
  const elePoints = record.filter((p) => Number.isFinite(p.ele)).map((p) => ({ x: p.t, y: p.ele }))

  const hasCharts = hrPoints.length > 1 || pacePoints.length > 1 || elePoints.length > 1

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>{activity.name || 'Corsa'}</h3>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>{fmtDateTime(activity.started_at)} · {activity.source?.replace('_upload', '')}</p>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            {canManage ? (
              <select
                value={activity.activity_type || ''}
                onChange={(e) => handleTypeChange(e.target.value)}
                disabled={busy}
                style={{ fontSize: '0.85rem', padding: '2px 6px' }}
                title="Correggi il tipo di attività se non è giusto"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            ) : (
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {activityTypeIcon(activity.activity_type)} {activityTypeLabel(activity.activity_type)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && (
            <>
              <button className="secondary" onClick={handleRecalculate} disabled={busy} title="Rifà il calcolo di VO2max e carico usando i valori attuali del profilo">Ricalcola</button>
              <button className="danger" onClick={handleDelete} disabled={busy}>Elimina</button>
            </>
          )}
          <button className="secondary" onClick={onClose}>Chiudi</button>
        </div>
      </div>

      {actionMsg && (
        <div className={actionMsg.type === 'error' ? 'error-box' : 'success-box'}>{actionMsg.text}</div>
      )}

      <div className="stat-grid" style={{ margin: '16px 0' }}>
        <div>
          <div className="stat">{activity.distance_m ? `${(activity.distance_m / 1000).toFixed(2)}` : '—'}</div>
          <div className="stat-label">km</div>
        </div>
        <div>
          <div className="stat">{fmtDuration(activity.duration_s)}</div>
          <div className="stat-label">durata</div>
        </div>
        <div>
          <div className="stat">{fmtPace(activity.avg_pace_s_per_km)}</div>
          <div className="stat-label">passo medio</div>
        </div>
        <div>
          <div className="stat">{activity.avg_hr ?? '—'}</div>
          <div className="stat-label">FC media</div>
        </div>
        <div>
          <div className="stat">{activity.max_hr ?? '—'}</div>
          <div className="stat-label">FC max</div>
        </div>
        <div>
          <div className="stat">{activity.vo2max_estimate ?? '—'}</div>
          <div className="stat-label">VO2max {activity.vo2max_confidence ? `(${activity.vo2max_confidence})` : ''}</div>
          {activity.vo2max_estimate == null && vo2Reason && (
            <div className="muted" style={{ fontSize: '0.7rem', marginTop: 4, maxWidth: 160 }}>{vo2Reason}</div>
          )}
        </div>
        <div>
          <div className="stat">{activity.training_load ?? '—'}</div>
          <div className="stat-label">carico (TRIMP)</div>
        </div>
      </div>

      <RouteMap record={record} hoverT={hoverT} />

      {hasCharts && (
        <div style={{ marginTop: 18 }}>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 0, marginBottom: 10 }}>
            Passa il dito o il mouse su un grafico: il punto corrispondente compare anche sugli altri grafici e sulla mappa.
          </p>
          {hrPoints.length > 1 && (
            <LineChart points={hrPoints} label="Frequenza cardiaca" unit=" bpm" color="var(--coral)" colorByValue hoverT={hoverT} onHover={setHoverT} />
          )}
          {pacePoints.length > 1 && (
            <LineChart points={pacePoints} label="Passo" unit="/km" color="var(--accent)" invert formatY={fmtMinKm} hoverT={hoverT} onHover={setHoverT} />
          )}
          {speedPoints.length > 1 && (
            <LineChart points={speedPoints} label="Velocità" unit=" km/h" color="var(--zone-safe-fg)" formatY={(v) => v.toFixed(1)} hoverT={hoverT} onHover={setHoverT} />
          )}
          {elePoints.length > 1 && (
            <LineChart points={elePoints} label="Altitudine" unit=" m" color="var(--amber)" hoverT={hoverT} onHover={setHoverT} />
          )}
        </div>
      )}
      {!hasCharts && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: 14 }}>Nessuno stream dettagliato disponibile per questa attività.</p>
      )}
    </div>
  )
}
