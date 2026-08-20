import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RouteMap from './RouteMap'
import LineChart from './LineChart'

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

export default function ActivityDetail({ activityId, onClose }) {
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase.from('activities').select('*').eq('id', activityId).single().then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setActivity(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [activityId])

  if (loading) return <div className="card"><p className="muted">Caricamento corsa…</p></div>
  if (error) return <div className="card"><div className="error-box">{error}</div></div>
  if (!activity) return null

  const record = activity.record_stream || []
  const hrPoints = record.filter((p) => Number.isFinite(p.hr)).map((p) => ({ x: p.t, y: p.hr }))
  const pacePoints = record.filter((p) => Number.isFinite(p.paceSecPerKm) && p.paceSecPerKm > 0 && p.paceSecPerKm < 1200).map((p) => ({ x: p.t, y: p.paceSecPerKm }))
  const elePoints = record.filter((p) => Number.isFinite(p.ele)).map((p) => ({ x: p.t, y: p.ele }))

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h3 style={{ margin: 0 }}>{activity.name || 'Corsa'}</h3>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>{fmtDateTime(activity.started_at)} · {activity.source?.replace('_upload', '')}</p>
        </div>
        <button className="secondary" onClick={onClose}>Chiudi</button>
      </div>

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
        </div>
        <div>
          <div className="stat">{activity.training_load ?? '—'}</div>
          <div className="stat-label">carico (TRIMP)</div>
        </div>
      </div>

      <RouteMap record={record} />

      <div style={{ marginTop: 18 }}>
        {hrPoints.length > 1 && (
          <LineChart points={hrPoints} label="Frequenza cardiaca" unit=" bpm" color="var(--coral)" />
        )}
        {pacePoints.length > 1 && (
          <LineChart points={pacePoints} label="Passo" unit="/km" color="var(--accent)" invert formatY={fmtPace} />
        )}
        {elePoints.length > 1 && (
          <LineChart points={elePoints} label="Altitudine" unit=" m" color="var(--amber)" />
        )}
        {hrPoints.length <= 1 && pacePoints.length <= 1 && elePoints.length <= 1 && (
          <p className="muted" style={{ fontSize: '0.85rem' }}>Nessuno stream dettagliato disponibile per questa corsa.</p>
        )}
      </div>
    </div>
  )
}
