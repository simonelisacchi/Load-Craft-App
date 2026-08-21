import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { itemDate, isSameDay } from '../lib/planDates'

export default function ReminderBanner({ athleteId }) {
  const [todayItem, setTodayItem] = useState(null)
  const [done, setDone] = useState(false)

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
        // Promemoria secondario: se fallisce non blocchiamo la pagina con
        // un errore, semplicemente non mostriamo il banner. Lo logghiamo
        // comunque per poterlo diagnosticare.
        console.error('ReminderBanner:', plansError.message)
        return
      }
      const plan = plans?.[0]
      if (!plan) return
      const [itemsRes, mapsRes, compsRes] = await Promise.all([
        supabase.from('training_plan_items').select('*').eq('plan_id', plan.id),
        supabase.from('athlete_day_mapping').select('*').eq('plan_id', plan.id),
        supabase.from('workout_completions').select('plan_item_id').eq('athlete_id', athleteId),
      ])
      if (itemsRes.error || mapsRes.error || compsRes.error) {
        console.error('ReminderBanner:', (itemsRes.error || mapsRes.error || compsRes.error).message)
        return
      }
      const mapping = {}
      for (const m of mapsRes.data || []) mapping[m.day_number] = m.weekday
      const today = new Date()
      const match = (itemsRes.data || []).find((it) => isSameDay(itemDate(plan, mapping, it), today))
      if (match) {
        setTodayItem(match)
        setDone((compsRes.data || []).some((c) => c.plan_item_id === match.id))
      }
    }
    load()
  }, [athleteId])

  if (!todayItem) return null

  return (
    <div className="reminder-banner">
      <div>
        <div className="stat-label">Allenamento di oggi</div>
        <div><strong>{todayItem.title}</strong> <span className="muted">· {todayItem.workout_type}</span></div>
      </div>
      {done ? <span className="zone-badge zone-sicura">fatto ✓</span> : <span className="zone-badge zone-attenzione">da fare</span>}
    </div>
  )
}
