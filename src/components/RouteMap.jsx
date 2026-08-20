// Disegna il percorso GPS come schizzo stilizzato (non una mappa reale
// con vie/edifici) usando solo i punti lat/lon della corsa. Nessuna
// richiesta esce verso servizi di mappe esterni: le coordinate restano
// tra il browser e Supabase, coerente con l'impostazione "niente terze
// parti non necessarie" del progetto.

export default function RouteMap({ record }) {
  const points = (record || []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))

  if (points.length < 2) {
    return (
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Mappa non disponibile per questa corsa (il file caricato non conteneva coordinate GPS).
      </p>
    )
  }

  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)

  const w = 560, h = 320, pad = 24
  // correzione approssimativa: un grado di longitudine è più "corto" di
  // uno di latitudine man mano che ci si allontana dall'equatore
  const latMid = (minLat + maxLat) / 2
  const lonScale = Math.cos((latMid * Math.PI) / 180)

  const spanLat = Math.max(maxLat - minLat, 0.0001)
  const spanLon = Math.max((maxLon - minLon) * lonScale, 0.0001)
  const scale = Math.min((w - pad * 2) / spanLon, (h - pad * 2) / spanLat)

  const toXY = (lat, lon) => {
    const x = pad + ((lon - minLon) * lonScale) * scale + ((w - pad * 2) - spanLon * scale) / 2
    const y = h - pad - (lat - minLat) * scale - ((h - pad * 2) - spanLat * scale) / 2
    return [x, y]
  }

  const pathD = points
    .map((p, i) => {
      const [x, y] = toXY(p.lat, p.lon)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const [sx, sy] = toXY(points[0].lat, points[0].lon)
  const [ex, ey] = toXY(points[points.length - 1].lat, points[points.length - 1].lon)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="280" style={{ background: 'var(--surface-2)', borderRadius: 10 }}>
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx} cy={sy} r="6" fill="var(--zone-safe-fg)" stroke="var(--surface-2)" strokeWidth="2" />
      <circle cx={ex} cy={ey} r="6" fill="var(--coral)" stroke="var(--surface-2)" strokeWidth="2" />
    </svg>
  )
}
