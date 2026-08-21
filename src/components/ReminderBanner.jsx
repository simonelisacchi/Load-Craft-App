import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Mostra il prossimo allenamento non ancora completato, in ordine di
// sequenza della scheda — non è vincolato a un giorno della settimana
// fisso, così l'atleta resta libero di allenarsi quando può.
export default function ReminderBanner({ athleteId, onOpenSchedule }) {
  const [nextItem, setNextItem] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: plans, error: plansError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (plansError) {
        console.error('ReminderBanner:', plansError.message)
        return
      }
      const plan = plans?.[0]
      if (!plan) return

      const [itemsRes, compsRes] = await Promise.all([
        supabase.from('training_plan_items').select('*').eq('plan_id', plan.id).order('week_number').order('day_number'),
        supabase.from('workout_completions').select('plan_item_id').eq('athlete_id', athleteId),
      ])
      if (itemsRes.error || compsRes.error) {
        console.error('ReminderBanner:', (itemsRes.error || compsRes.error).message)
        return
      }
      const doneIds = new Set((compsRes.data || []).map((c) => c.plan_item_id))
      const next = (itemsRes.data || []).find((it) => !doneIds.has(it.id))
      if (next) setNextItem(next)
    }
    load()
  }, [athleteId])

  if (!nextItem) return null

  return (
    <button
      className="reminder-banner"
      onClick={onOpenSchedule}
      style={{
        width: '100%', border: '1px solid var(--accent)', cursor: onOpenSchedule ? 'pointer' : 'default',
        textAlign: 'left', color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 400,
      }}
    >
      <div>
        <div className="stat-label">Prossimo allenamento</div>
        <div><strong>{nextItem.title}</strong> <span className="muted">· {nextItem.workout_type} · Sett. {nextItem.week_number}, Giorno {nextItem.day_number}</span></div>
      </div>
      <span className="zone-badge zone-attenzione">apri scheda →</span>
    </button>
  )
}
