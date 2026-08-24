import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeRecoveryStatus } from '../lib/recovery'

const LEVEL_DOT = { ok: 'var(--zone-safe-fg)', watch: 'var(--zone-warn-fg)', rest: 'var(--zone-risk-fg)' }
const LEVEL_TITLE = { ok: 'Pronto per allenarsi', watch: 'Valuta un carico più leggero', rest: 'Consigliato un giorno di recupero' }

function hasNewActivities(coachId, athleteId, activities) {
  const lastSeen = localStorage.getItem(`lastSeenActivities_${coachId}_${athleteId}`)
  if (!lastSeen) return false // mai visitato: non lo segnaliamo come "nuovo", coerente con la vista di dettaglio
  return activities.some((a) => a.created_at && a.created_at > lastSeen)
}

export default function AthleteList({ coachId, athletes, selected, onSelect }) {
  const [query, setQuery] = useState('')
  const [summaries, setSummaries] = useState({})
  const [loadingSummaries, setLoadingSummaries] = useState(false)

  const loadSummaries = useCallback(async () => {
    if (!athletes.length) return
    setLoadingSummaries(true)
    const results = await Promise.all(
      athletes.map(async (a) => {
        const [actsRes, tqrRes] = await Promise.all([
          supabase.from('activities').select('id, started_at, training_load, created_at').eq('user_id', a.id).order('started_at', { ascending: false }),
          supabase.from('daily_checkins').select('tqr').eq('user_id', a.id).not('tqr', 'is', null).order('the_date', { ascending: false }).limit(1).maybeSingle(),
        ])
        const activities = actsRes.data || []
        const { level } = computeRecoveryStatus({ activities, latestTqr: tqrRes.data?.tqr ?? null })
        return [a.id, { level, hasNew: hasNewActivities(coachId, a.id, activities) }]
      })
    )
    setSummaries(Object.fromEntries(results))
    setLoadingSummaries(false)
  }, [athletes, coachId])

  useEffect(() => { loadSummaries() }, [loadSummaries])

  const filtered = athletes.filter((a) => (a.full_name || '').toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      {athletes.length > 4 && (
        <input
          placeholder="Cerca un atleta…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 10 }}
        />
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {filtered.map((a) => {
          const s = summaries[a.id]
          return (
            <button
              key={a.id}
              className={a.id === selected ? '' : 'secondary'}
              onClick={() => onSelect(a.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {s && (
                <span
                  title={LEVEL_TITLE[s.level]}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_DOT[s.level], flexShrink: 0, display: 'inline-block' }}
                />
              )}
              {a.full_name || a.id.slice(0, 8)}
              {s?.hasNew && <span className="zone-badge zone-sicura" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>nuova</span>}
            </button>
          )
        })}
        {!filtered.length && <p className="muted" style={{ fontSize: '0.85rem' }}>Nessun atleta trovato.</p>}
      </div>
      {loadingSummaries && <p className="muted" style={{ fontSize: '0.72rem', marginTop: 8 }}>Aggiornamento stato atleti…</p>}
    </div>
  )
}
