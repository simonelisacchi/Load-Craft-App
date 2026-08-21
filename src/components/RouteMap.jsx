import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, LayersControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { colorForIntensity } from '../lib/colorScale'

// Mappa vera (OpenStreetMap gratuito, nessuna chiave richiesta; livello
// satellite via Esri World Imagery, gratuito per uso non massivo) con il
// percorso colorabile in base a FC / passo / velocità — un "layer" alla
// volta, come richiesto. Nessun servizio a pagamento coinvolto.

const METRIC_OPTIONS = [
  { id: 'none', label: 'Nessuno' },
  { id: 'hr', label: 'FC' },
  { id: 'pace', label: 'Passo' },
  { id: 'speed', label: 'Velocità' },
]

function metricValue(p, metric) {
  if (metric === 'hr') return Number.isFinite(p.hr) ? p.hr : null
  if (metric === 'pace') return Number.isFinite(p.paceSecPerKm) && p.paceSecPerKm > 0 ? p.paceSecPerKm : null
  if (metric === 'speed') return Number.isFinite(p.paceSecPerKm) && p.paceSecPerKm > 0 ? 3600 / p.paceSecPerKm : null
  return null
}

// scala di colore: dal blu (basso sforzo) al rosso (alto sforzo).
// Per il passo, un valore basso (min/km) = più veloce = "caldo", quindi
// la normalizzazione va invertita rispetto a FC/velocità.

function buildSegments(points, metric, maxSegments = 250) {
  const step = Math.max(1, Math.ceil(points.length / maxSegments))
  const sampled = points.filter((_, i) => i % step === 0)
  if (metric === 'none') {
    return [{ positions: sampled.map((p) => [p.lat, p.lon]), color: 'var(--accent)' }]
  }
  const values = sampled.map((p) => metricValue(p, metric)).filter((v) => v != null)
  if (!values.length) return [{ positions: sampled.map((p) => [p.lat, p.lon]), color: 'var(--accent)' }]
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const invert = metric === 'pace'

  const segments = []
  for (let i = 0; i < sampled.length - 1; i++) {
    const v = metricValue(sampled[i], metric)
    if (v == null) continue
    let norm = (v - min) / span
    if (invert) norm = 1 - norm
    segments.push({
      positions: [[sampled[i].lat, sampled[i].lon], [sampled[i + 1].lat, sampled[i + 1].lon]],
      color: colorForIntensity(norm),
    })
  }
  return segments
}

export default function RouteMap({ record, hoverT }) {
  const [metric, setMetric] = useState('none')
  const points = useMemo(() => (record || []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)), [record])

  const segments = useMemo(() => buildSegments(points, metric), [points, metric])

  const hoverPoint = useMemo(() => {
    if (hoverT == null || !points.length) return null
    let closest = points[0]
    let bestDiff = Infinity
    for (const p of points) {
      const d = Math.abs(p.t - hoverT)
      if (d < bestDiff) { bestDiff = d; closest = p }
    }
    return closest
  }, [points, hoverT])

  if (points.length < 3) {
    return <p className="muted" style={{ fontSize: '0.85rem' }}>Mappa non disponibile per questa corsa (il file caricato non conteneva coordinate GPS).</p>
  }

  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  const bounds = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ]

  const hasMetricData = (m) => points.some((p) => metricValue(p, m) != null)

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 8 }}>
        {METRIC_OPTIONS.map((m) => (
          <button
            key={m.id}
            className={metric === m.id ? 'active' : ''}
            disabled={m.id !== 'none' && !hasMetricData(m.id)}
            onClick={() => setMetric(m.id)}
            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', isolation: 'isolate', position: 'relative' }}>
        <MapContainer bounds={bounds} boundsOptions={{ padding: [20, 20] }} style={{ height: 320, width: '100%' }} scrollWheelZoom={false}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Strade">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {segments.map((seg, i) => (
            <Polyline key={i} positions={seg.positions} pathOptions={{ color: seg.color, weight: 4, opacity: 0.9 }} />
          ))}

          <CircleMarker center={[points[0].lat, points[0].lon]} radius={6} pathOptions={{ color: '#0f7a68', fillColor: '#3fe0c0', fillOpacity: 1 }} />
          <CircleMarker center={[points[points.length - 1].lat, points[points.length - 1].lon]} radius={6} pathOptions={{ color: '#8a1522', fillColor: '#ff5d6c', fillOpacity: 1 }} />
          {hoverPoint && (
            <CircleMarker center={[hoverPoint.lat, hoverPoint.lon]} radius={7} pathOptions={{ color: '#151a22', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }} />
          )}
        </MapContainer>
      </div>
      {metric !== 'none' && (
        <p className="muted" style={{ fontSize: '0.72rem', marginTop: 6 }}>
          Colore del percorso: blu = sforzo più basso, rosso = sforzo più alto ({METRIC_OPTIONS.find((m) => m.id === metric)?.label.toLowerCase()}).
        </p>
      )}
    </div>
  )
}
