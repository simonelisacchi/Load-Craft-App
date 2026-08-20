// Piccolo grafico a linea generico, stesso stile "disegnato a mano" di
// AcwrChart. Usato per FC, passo e altitudine nel dettaglio di una corsa
// — "small multiples" invece di più assi sullo stesso grafico, più
// facile da leggere su schermo piccolo.

export default function LineChart({ points, label, unit, color = 'var(--chart-line)', invert = false, formatY }) {
  const valid = (points || []).filter((p) => Number.isFinite(p.y))
  if (valid.length < 2) return null

  const w = 560, h = 110, pad = 8
  const xs = valid.map((p) => p.x)
  const ys = valid.map((p) => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  const toXY = (p) => {
    const x = pad + ((p.x - minX) / spanX) * (w - pad * 2)
    const yNorm = (p.y - minY) / spanY
    const y = invert ? pad + yNorm * (h - pad * 2) : h - pad - yNorm * (h - pad * 2)
    return [x, y]
  }

  const pathD = valid.map((p, i) => {
    const [x, y] = toXY(p)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const latest = valid[valid.length - 1].y
  const fmt = formatY || ((v) => Math.round(v))

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
        <span className="muted">{label}</span>
        <span className="mono muted">min {fmt(minY)}{unit} · max {fmt(maxY)}{unit}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  )
}
