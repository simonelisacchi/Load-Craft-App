import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function fmtDateTime(d) {
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// editableByCoachId: se passato, il coach con questo id può modificare
// o cancellare le note che ha scritto lui (le altre restano di sola
// lettura anche per lui, ma nel nostro modello ogni atleta ha un solo
// coach quindi in pratica sono sempre le sue).
export default function NotesPanel({ notes, editableByCoachId, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  if (!notes?.length) return <p className="muted">Nessuna nota dal coach ancora.</p>

  const sorted = [...notes].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  function startEdit(n) {
    setEditingId(n.id)
    setDraft(n.body)
  }

  async function saveEdit(n) {
    setBusy(true)
    const { error } = await supabase.from('coach_notes').update({ body: draft.trim() }).eq('id', n.id)
    setBusy(false)
    if (!error) {
      setEditingId(null)
      onChanged?.()
    }
  }

  async function togglePriority(n) {
    await supabase.from('coach_notes').update({ priority: !n.priority }).eq('id', n.id)
    onChanged?.()
  }

  async function remove(n) {
    if (!confirm('Eliminare questa nota?')) return
    const { error } = await supabase.from('coach_notes').delete().eq('id', n.id)
    if (!error) onChanged?.()
  }

  return (
    <div>
      {sorted.map((n) => {
        const canEdit = editableByCoachId && n.coach_id === editableByCoachId
        const isEditing = editingId === n.id
        return (
          <div key={n.id} className={`note ${n.priority ? 'priority' : ''}`}>
            {n.priority && <div className="zone-badge zone-rischio" style={{ marginBottom: 6 }}>Priorità</div>}
            {isEditing ? (
              <>
                <textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveEdit(n)} disabled={busy || !draft.trim()}>Salva</button>
                  <button className="secondary" onClick={() => setEditingId(null)}>Annulla</button>
                </div>
              </>
            ) : (
              <div>{n.body}</div>
            )}
            <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span>{fmtDateTime(n.created_at)}</span>
              {canEdit && !isEditing && (
                <span style={{ display: 'flex', gap: 10 }}>
                  <button className="secondary" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => togglePriority(n)}>
                    {n.priority ? 'Togli priorità' : 'Segna priorità'}
                  </button>
                  <button className="secondary" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => startEdit(n)}>Modifica</button>
                  <button className="danger" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => remove(n)}>Elimina</button>
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
