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

function fmtShortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function AcwrChart({ activities }) {
  const daily = toDailyLoads(activities)
  if (daily.length < 3) {
    return <p className="muted">Servono più corse distribuite nel tempo per calcolare l'ACWR.</p>
  }
  const series = computeAcwrSeries(daily)
  const values = series.map((s) => s.acwr).filter((v) => v != null)
  const maxY = Math.max(2, ...values) * 1.05
  const w = 640, h = 190
  const padL = 34, padR = 10, padT = 10, padB = 22
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  const xAt = (i) => padL + (i / (series.length - 1)) * plotW
  const bandY = (v) => padT + plotH - (v / maxY) * plotH

  const points = series
    .map((s, i) => (s.acwr == null ? null : `${xAt(i)},${bandY(s.acwr)}`))
    .filter(Boolean)
    .join(' ')

  const latest = series[series.length - 1]

  const yTicks = [0.8, 1.3, 1.5].filter((v) => v <= maxY)
  const xTickIdx = [0, Math.floor((series.length - 1) / 2), series.length - 1]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span className="stat">{latest.acwr ? latest.acwr.toFixed(2) : '—'}</span>
        {latest.zone && <span className={`zone-badge zone-${latest.zone}`}>{latest.zone}</span>}
        <span className="muted" style={{ fontSize: '0.78rem' }}>oggi</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        {/* bande di sfondo per zona */}
        <rect x={padL} y={padT} width={plotW} height={bandY(1.5) - padT} fill="var(--chart-tint-risk)" />
        <rect x={padL} y={bandY(1.5)} width={plotW} height={bandY(1.3) - bandY(1.5)} fill="var(--chart-tint-warn)" />
        <rect x={padL} y={bandY(1.3)} width={plotW} height={bandY(0.8) - bandY(1.3)} fill="var(--chart-tint-safe)" />
        <rect x={padL} y={bandY(0.8)} width={plotW} height={padT + plotH - bandY(0.8)} fill="var(--chart-tint-neutral)" />

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padL} y1={bandY(v)} x2={w - padR} y2={bandY(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" />
            <text x={padL - 5} y={bandY(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">{v.toFixed(1)}</text>
          </g>
        ))}

        <polyline points={points} fill="none" stroke="var(--chart-line)" strokeWidth="2" />
        {series.map((s, i) => {
          if (s.acwr == null || !s.load) return null
          return <circle key={i} cx={xAt(i)} cy={bandY(s.acwr)} r="3.5" fill={ZONE_DOT[s.zone] || 'var(--chart-line)'} stroke="var(--surface)" strokeWidth="1" />
        })}

        {xTickIdx.map((i) => (
          <text key={i} x={xAt(i)} y={h - 6} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'} fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">
            {fmtShortDate(series[i].date)}
          </text>
        ))}
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
