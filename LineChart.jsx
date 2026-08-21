import { useRef } from 'react'
import { colorForIntensity } from '../lib/colorScale'

// Grafico a linea interattivo e più dettagliato: griglia con valori
// sugli assi, area colorata sotto la curva, e — quando richiesto
// (colorByValue) — linea colorata punto per punto in base all'intensità
// (blu=basso, rosso=alto), stessa scala usata nella mappa del percorso.

export default function LineChart({ points, label, unit, color = 'var(--chart-line)', invert = false, formatY, hoverT, onHover, colorByValue = false }) {
  const svgRef = useRef(null)
  const valid = (points || []).filter((p) => Number.isFinite(p.y))
  if (valid.length < 2) return null

  const w = 560, h = 140, padL = 42, padR = 8, padT = 10, padB = 22
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  const xs = valid.map((p) => p.x)
  const ys = valid.map((p) => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  const toXY = (p) => {
    const x = padL + ((p.x - minX) / spanX) * plotW
    const yNorm = (p.y - minY) / spanY
    const y = invert ? padT + yNorm * plotH : padT + plotH - yNorm * plotH
    return [x, y]
  }

  const fmt = formatY || ((v) => Math.round(v))

  // 4 linee guida orizzontali con il valore corrispondente
  const gridLines = [0, 1 / 3, 2 / 3, 1].map((f) => {
    const val = invert ? minY + f * spanY : maxY - f * spanY
    const y = padT + f * plotH
    return { y, val }
  })

  const pathD = valid.map((p, i) => {
    const [x, y] = toXY(p)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const areaD = `${pathD} L${toXY(valid[valid.length - 1])[0].toFixed(1)},${padT + plotH} L${toXY(valid[0])[0].toFixed(1)},${padT + plotH} Z`

  const gradId = `grad-${label?.replace(/\s+/g, '') || 'chart'}`

  function nearestPoint(clientX) {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * w
    const t = minX + ((relX - padL) / plotW) * spanX
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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
        <span className="muted">{label}</span>
        <span className="mono" style={{ color: hovered ? color : 'var(--muted)', fontWeight: hovered ? 700 : 400 }}>
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
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={w - padR} y2={g.y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">
              {fmt(g.val)}
            </text>
          </g>
        ))}

        {!colorByValue && <path d={areaD} fill={`url(#${gradId})`} stroke="none" />}

        {colorByValue
          ? valid.slice(0, -1).map((p, i) => {
              const [x1, y1] = toXY(p)
              const [x2, y2] = toXY(valid[i + 1])
              let norm = (p.y - minY) / spanY
              if (invert) norm = 1 - norm
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colorForIntensity(norm)} strokeWidth="2.5" strokeLinecap="round" />
            })
          : <path d={pathD} fill="none" stroke={color} strokeWidth="2" />}

        {hoveredXY && (
          <>
            <line x1={hoveredXY[0]} y1={padT} x2={hoveredXY[0]} y2={padT + plotH} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hoveredXY[0]} cy={hoveredXY[1]} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="1.5" />
          </>
        )}
      </svg>
    </div>
  )
}
