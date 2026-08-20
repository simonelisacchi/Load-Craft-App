function fmtDateTime(d) {
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function NotesPanel({ notes }) {
  if (!notes?.length) return <p className="muted">Nessuna nota dal coach ancora.</p>
  const sorted = [...notes].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1
    return new Date(b.created_at) - new Date(a.created_at)
  })
  return (
    <div>
      {sorted.map((n) => (
        <div key={n.id} className={`note ${n.priority ? 'priority' : ''}`}>
          {n.priority && <div className="zone-badge zone-rischio" style={{ marginBottom: 6 }}>Priorità</div>}
          <div>{n.body}</div>
          <div className="meta">{fmtDateTime(n.created_at)}</div>
        </div>
      ))}
    </div>
  )
}
