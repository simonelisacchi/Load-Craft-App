import { useRef } from 'react'

// Grafico a linea interattivo: passandoci sopra (mouse o dito) mostra un
// crosshair col valore esatto, e segnala il tempo "sotto il dito" al
// componente genitore (onHover) — così ActivityDetail può sincronizzare
// lo stesso istante su più grafici e sul puntino nella mappa.

export default function LineChart({ points, label, unit, color = 'var(--chart-line)', invert = false, formatY, hoverT, onHover }) {
  const svgRef = useRef(null)
  const valid = (points || []).filter((p) => Number.isFinite(p.y))
  if (valid.length < 2) return null

  const w = 560, h = 120, pad = 8
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

  const fmt = formatY || ((v) => Math.round(v))

  function nearestPoint(clientX) {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * w
    const t = minX + ((relX - pad) / (w - pad * 2)) * spanX
    let closest = valid[0]
    let bestDiff = Infinity
    for (const p of valid) {
      const d = Math.abs(p.x - t)
      if (d < bestDiff) { bestDiff = d; closest = p }
    }
    return closest
  }

  function handleMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const p = nearestPoint(clientX)
    if (p) onHover?.(p.x)
  }

  const hovered = hoverT != null ? valid.reduce((best, p) => (Math.abs(p.x - hoverT) < Math.abs(best.x - hoverT) ? p : best), valid[0]) : null
  const hoveredXY = hovered ? toXY(hovered) : null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
        <span className="muted">{label}</span>
        <span className="mono muted">
          {hovered ? `${fmt(hovered.y)}${unit}` : `min ${fmt(minY)}${unit} · max ${fmt(maxY)}${unit}`}
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={() => onHover?.(null)}
        onTouchMove={handleMove}
        onTouchEnd={() => onHover?.(null)}
      >
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
        {hoveredXY && (
          <>
            <line x1={hoveredXY[0]} y1={pad} x2={hoveredXY[0]} y2={h - pad} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hoveredXY[0]} cy={hoveredXY[1]} r="4" fill={color} stroke="var(--surface)" strokeWidth="1.5" />
          </>
        )}
      </svg>
    </div>
  )
}
