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
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ActivityList({ activities, onSelect }) {
  if (!activities?.length) {
    return <p className="muted">Nessuna corsa caricata ancora.</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Fonte</th>
            <th className="mono">Distanza</th>
            <th className="mono">Durata</th>
            <th className="mono">FC media</th>
            <th className="mono">Passo</th>
            <th className="mono">VO2max</th>
            <th className="mono">Carico</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr
              key={a.id}
              onClick={() => onSelect?.(a.id)}
              style={onSelect ? { cursor: 'pointer' } : undefined}
              title={onSelect ? 'Apri il dettaglio della corsa' : undefined}
            >
              <td>{fmtDate(a.started_at)}</td>
              <td className="muted">{a.source?.replace('_upload', '')}</td>
              <td className="mono">{a.distance_m ? `${(a.distance_m / 1000).toFixed(2)} km` : '—'}</td>
              <td className="mono">{fmtDuration(a.duration_s)}</td>
              <td className="mono">{a.avg_hr ? `${a.avg_hr} bpm` : '—'}</td>
              <td className="mono">{fmtPace(a.avg_pace_s_per_km)}</td>
              <td className="mono">{a.vo2max_estimate ? `${a.vo2max_estimate} (${a.vo2max_confidence})` : '—'}</td>
              <td className="mono">{a.training_load ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
