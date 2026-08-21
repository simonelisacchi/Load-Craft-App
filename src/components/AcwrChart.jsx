import { computeAcwrSeries } from '../lib/acwr'

function toDailyLoads(activities) {
  const byDate = {}
  for (const a of activities) {
    if (!a.started_at || a.training_load == null) continue
    const d = a.started_at.slice(0, 10)
    byDate[d] = (byDate[d] || 0) + a.training_load
  }
  const dates = Object.keys(byDate).sort()
  if (!dates.length) return []
  const start = new Date(dates[0])
  const end = new Date(dates[dates.length - 1])
  const out = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, load: byDate[key] || 0 })
  }
  return out
}

const ZONE_DOT = {
  'sicura': 'var(--zone-safe-fg)',
  'attenzione': 'var(--zone-warn-fg)',
  'rischio': 'var(--zone-risk-fg)',
  'sotto-carico': 'var(--zone-neutral-fg)',
}

export default function AcwrChart({ activities }) {
  const daily = toDailyLoads(activities)
  if (daily.length < 3) {
    return <p className="muted">Servono più corse distribuite nel tempo per calcolare l'ACWR.</p>
  }
  const series = computeAcwrSeries(daily)
  const values = series.map((s) => s.acwr).filter((v) => v != null)
  const maxY = Math.max(2, ...values) * 1.05
  const w = 640
  const h = 160
  const pad = 24

  const points = series
    .map((s, i) => {
      if (s.acwr == null) return null
      const x = pad + (i / (series.length - 1)) * (w - pad * 2)
      const y = h - pad - (s.acwr / maxY) * (h - pad * 2)
      return `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

  const bandY = (v) => h - pad - (v / maxY) * (h - pad * 2)
  const latest = series[series.length - 1]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span className="stat">{latest.acwr ? latest.acwr.toFixed(2) : '—'}</span>
        {latest.zone && <span className={`zone-badge zone-${latest.zone}`}>{latest.zone}</span>}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="160">
        {/* bande di sfondo per zona */}
        <rect x={pad} y={0} width={w - pad * 2} height={bandY(1.5)} fill="var(--chart-tint-risk)" />
        <rect x={pad} y={bandY(1.5)} width={w - pad * 2} height={bandY(1.3) - bandY(1.5)} fill="var(--chart-tint-warn)" />
        <rect x={pad} y={bandY(1.3)} width={w - pad * 2} height={bandY(0.8) - bandY(1.3)} fill="var(--chart-tint-safe)" />
        <rect x={pad} y={bandY(0.8)} width={w - pad * 2} height={h - pad - bandY(0.8)} fill="var(--chart-tint-neutral)" />
        <polyline points={points} fill="none" stroke="var(--chart-line)" strokeWidth="2" />
        {series.map((s, i) => {
          if (s.acwr == null || !s.load) return null // pallino solo nei giorni con almeno una corsa
          const x = pad + (i / (series.length - 1)) * (w - pad * 2)
          const y = bandY(s.acwr)
          return <circle key={i} cx={x} cy={y} r="3.5" fill={ZONE_DOT[s.zone] || 'var(--chart-line)'} stroke="var(--surface)" strokeWidth="1" />
        })}
      </svg>
      <div className="muted" style={{ fontSize: '0.72rem', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span><span style={{ color: 'var(--zone-neutral-fg)' }}>■</span> sotto-carico &lt;0.8</span>
        <span><span style={{ color: 'var(--zone-safe-fg)' }}>■</span> sicura 0.8–1.3</span>
        <span><span style={{ color: 'var(--zone-warn-fg)' }}>■</span> attenzione 1.3–1.5</span>
        <span><span style={{ color: 'var(--zone-risk-fg)' }}>■</span> rischio &gt;1.5</span>
      </div>
    </div>
  )
}
