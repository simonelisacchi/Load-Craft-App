import { useRef, useState } from 'react'

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Vista a schermo intero di un singolo grafico: più spazio sugli assi,
// tooltip con valore e tempo esatti, e zoom sull'intervallo temporale
// trascinando orizzontalmente (con pulsante per azzerarlo).
export default function ExpandedChartModal({ points, label, unit, color, invert, formatY, colorByValue, colorForIntensity, onClose }) {
  const svgRef = useRef(null)
  const [zoomDomain, setZoomDomain] = useState(null) // [minX, maxX] oppure null = tutto
  const [dragStart, setDragStart] = useState(null)
  const [dragCurrent, setDragCurrent] = useState(null)
  const [hoverPoint, setHoverPoint] = useState(null)

  const valid = (points || []).filter((p) => Number.isFinite(p.y))
  const fmt = formatY || ((v) => Math.round(v))

  const w = 900, h = 420, padL = 56, padR = 20, padT = 20, padB = 40
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  const fullMinX = Math.min(...valid.map((p) => p.x))
  const fullMaxX = Math.max(...valid.map((p) => p.x))
  const [minX, maxX] = zoomDomain || [fullMinX, fullMaxX]
  const spanX = maxX - minX || 1

  const visible = valid.filter((p) => p.x >= minX && p.x <= maxX)
  const minY = Math.min(...visible.map((p) => p.y))
  const maxY = Math.max(...visible.map((p) => p.y))
  const spanY = maxY - minY || 1

  function toXY(p) {
    const x = padL + ((p.x - minX) / spanX) * plotW
    const yNorm = (p.y - minY) / spanY
    const y = invert ? padT + yNorm * plotH : padT + plotH - yNorm * plotH
    return [x, y]
  }

  function xFromClientX(clientX) {
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * w
    return minX + ((relX - padL) / plotW) * spanX
  }

  const pathD = visible.map((p, i) => {
    const [x, y] = toXY(p)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const gridLinesY = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const val = invert ? minY + f * spanY : maxY - f * spanY
    return { y: padT + f * plotH, val }
  })
  const gridLinesX = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    x: padL + f * plotW,
    t: minX + f * spanX,
  }))

  function handlePointerDown(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    setDragStart(xFromClientX(clientX))
    setDragCurrent(xFromClientX(clientX))
  }
  function handlePointerMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const t = xFromClientX(clientX)
    if (dragStart != null) setDragCurrent(t)
    const closest = visible.reduce((best, p) => (Math.abs(p.x - t) < Math.abs(best.x - t) ? p : best), visible[0])
    setHoverPoint(closest || null)
  }
  function handlePointerUp() {
    if (dragStart != null && dragCurrent != null && Math.abs(dragCurrent - dragStart) > spanX * 0.02) {
      setZoomDomain([Math.min(dragStart, dragCurrent), Math.max(dragStart, dragCurrent)])
    }
    setDragStart(null)
    setDragCurrent(null)
  }

  const hoverXY = hoverPoint ? toXY(hoverPoint) : null
  const dragging = dragStart != null && dragCurrent != null && Math.abs(dragCurrent - dragStart) > spanX * 0.02

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 960, width: '100%', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>{label}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {zoomDomain && <button className="secondary" onClick={() => setZoomDomain(null)}>Azzera zoom</button>}
            <button className="secondary" onClick={onClose}>Chiudi</button>
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: 0 }}>Trascina orizzontalmente per ingrandire un intervallo. Passa il dito/mouse per il valore esatto.</p>

        <div style={{ position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            width="100%"
            height={h}
            style={{ touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={() => { setHoverPoint(null); setDragStart(null) }}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            {gridLinesY.map((g, i) => (
              <g key={i}>
                <line x1={padL} y1={g.y} x2={w - padR} y2={g.y} stroke="var(--border)" strokeWidth="1" />
                <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="var(--font-mono)">{fmt(g.val)}</text>
              </g>
            ))}
            {gridLinesX.map((g, i) => (
              <text key={i} x={g.x} y={h - padB + 20} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="var(--font-mono)">{fmtTime(g.t)}</text>
            ))}

            {colorByValue
              ? visible.slice(0, -1).map((p, i) => {
                  const [x1, y1] = toXY(p)
                  const [x2, y2] = toXY(visible[i + 1])
                  let norm = (p.y - minY) / spanY
                  if (invert) norm = 1 - norm
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colorForIntensity(norm)} strokeWidth="3" strokeLinecap="round" />
                })
              : <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" />}

            {dragging && (
              <rect
                x={Math.min(toXY({ x: dragStart, y: minY })[0], toXY({ x: dragCurrent, y: minY })[0])}
                y={padT}
                width={Math.abs(toXY({ x: dragCurrent, y: minY })[0] - toXY({ x: dragStart, y: minY })[0])}
                height={plotH}
                fill="var(--accent)"
                opacity="0.15"
              />
            )}

            {hoverXY && !dragging && (
              <>
                <line x1={hoverXY[0]} y1={padT} x2={hoverXY[0]} y2={padT + plotH} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={hoverXY[0]} cy={hoverXY[1]} r="5" fill={color || 'var(--accent)'} stroke="var(--surface)" strokeWidth="2" />
              </>
            )}
          </svg>

          {hoverPoint && !dragging && (
            <div
              className="card"
              style={{
                position: 'absolute', top: 8, right: 8, padding: '8px 12px', margin: 0,
                background: 'var(--surface-2)', pointerEvents: 'none', fontSize: '0.82rem',
              }}
            >
              <div className="mono" style={{ fontWeight: 700 }}>{fmt(hoverPoint.y)}{unit}</div>
              <div className="muted mono" style={{ fontSize: '0.72rem' }}>a {fmtTime(hoverPoint.x)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
