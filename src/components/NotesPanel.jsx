import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const URGENCY_ORDER = { urgente: 3, attenzione: 2, normale: 1, info: 0 }
const URGENCY_LABEL = { urgente: 'Urgente', attenzione: 'Attenzione', normale: 'Normale', info: 'Informativa' }
const URGENCY_OPTIONS = ['info', 'normale', 'attenzione', 'urgente']

function fmtDateTime(d) {
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// editableByCoachId: se passato, il coach con questo id può modificare
// o cancellare le note che ha scritto lui.
export default function NotesPanel({ notes, editableByCoachId, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [draftUrgency, setDraftUrgency] = useState('normale')
  const [busy, setBusy] = useState(false)

  if (!notes?.length) return <p className="muted">Nessuna nota dal coach ancora.</p>

  const sorted = [...notes].sort((a, b) => {
    const au = URGENCY_ORDER[a.urgency ?? (a.priority ? 'urgente' : 'normale')] ?? 1
    const bu = URGENCY_ORDER[b.urgency ?? (b.priority ? 'urgente' : 'normale')] ?? 1
    if (au !== bu) return bu - au
    return new Date(b.created_at) - new Date(a.created_at)
  })

  function startEdit(n) {
    setEditingId(n.id)
    setDraft(n.body)
    setDraftUrgency(n.urgency || (n.priority ? 'urgente' : 'normale'))
  }

  async function saveEdit(n) {
    setBusy(true)
    const { error } = await supabase.from('coach_notes')
      .update({ body: draft.trim(), urgency: draftUrgency, priority: draftUrgency === 'urgente' })
      .eq('id', n.id)
    setBusy(false)
    if (!error) {
      setEditingId(null)
      onChanged?.()
    }
  }

  async function remove(n) {
    if (!confirm('Eliminare questa nota?')) return
    const { error } = await supabase.from('coach_notes').delete().eq('id', n.id)
    if (!error) onChanged?.()
  }

  return (
    <div>
      {sorted.map((n) => {
        const urgency = n.urgency || (n.priority ? 'urgente' : 'normale')
        const canEdit = editableByCoachId && n.coach_id === editableByCoachId
        const isEditing = editingId === n.id
        return (
          <div key={n.id} className={`note note-${urgency}`}>
            {urgency !== 'normale' && (
              <div className={`zone-badge zone-${urgency === 'urgente' ? 'rischio' : urgency === 'attenzione' ? 'attenzione' : 'info'}`} style={{ marginBottom: 6 }}>
                {URGENCY_LABEL[urgency]}
              </div>
            )}
            {isEditing ? (
              <>
                <textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {URGENCY_OPTIONS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      className={draftUrgency === u ? '' : 'secondary'}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => setDraftUrgency(u)}
                    >
                      {URGENCY_LABEL[u]}
                    </button>
                  ))}
                </div>
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
