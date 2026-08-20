import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabaseClient'
import ReminderBanner from '../components/ReminderBanner'
import NotesPanel from '../components/NotesPanel'
import ActivityUpload from '../components/ActivityUpload'
import ActivityList from '../components/ActivityList'
import ActivityDetail from '../components/ActivityDetail'
import AcwrChart from '../components/AcwrChart'
import TrainingPlanView from '../components/TrainingPlanView'
import CheckinForm from '../components/CheckinForm'
import ProfileForm from '../components/ProfileForm'
import SheetsSyncCard from '../components/SheetsSyncCard'

const TABS = ['Panoramica', 'Scheda', 'Check-in', 'Profilo & backup']

export default function AthleteDashboard() {
  const { profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState('Panoramica')
  const [activities, setActivities] = useState([])
  const [notes, setNotes] = useState([])
  const [todayCheckin, setTodayCheckin] = useState(null)
  const [selectedActivityId, setSelectedActivityId] = useState(null)

  const load = useCallback(async () => {
    if (!profile) return
    const [{ data: acts }, { data: ns }, { data: chk }] = await Promise.all([
      supabase.from('activities').select('*').eq('user_id', profile.id).order('started_at', { ascending: false }),
      supabase.from('coach_notes').select('*').eq('athlete_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('daily_checkins').select('*').eq('user_id', profile.id).eq('the_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
    ])
    setActivities(acts || [])
    setNotes(ns || [])
    setTodayCheckin(chk || null)
  }, [profile])

  useEffect(() => { load() }, [load])

  if (!profile) return null

  const priorityCount = notes.filter((n) => n.priority).length

  return (
    <div>
      <ReminderBanner athleteId={profile.id} />

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => { setTab(t); setSelectedActivityId(null) }}>
            {t}{t === 'Panoramica' && priorityCount > 0 ? ` (${priorityCount})` : ''}
          </button>
        ))}
      </div>

      {tab === 'Panoramica' && (
        <>
          {selectedActivityId ? (
            <ActivityDetail activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />
          ) : (
            <>
              <div className="card">
                <h3>Note del coach</h3>
                <NotesPanel notes={notes} />
              </div>
              <div className="card">
                <h3>ACWR — carico acuto/cronico</h3>
                <AcwrChart activities={activities} />
              </div>
              <ActivityUpload profile={profile} onDone={load} />
              <div className="card">
                <h3>Storico corse</h3>
                <p className="muted" style={{ fontSize: '0.8rem', marginTop: -6 }}>Tocca una corsa per vedere mappa, FC e passo nel dettaglio.</p>
                <ActivityList activities={activities} onSelect={setSelectedActivityId} />
              </div>
            </>
          )}
        </>
      )}

      {tab === 'Scheda' && <TrainingPlanView athleteId={profile.id} />}

      {tab === 'Check-in' && (
        <CheckinForm athleteId={profile.id} existing={todayCheckin} onSaved={load} />
      )}

      {tab === 'Profilo & backup' && (
        <>
          <ProfileForm profile={profile} onSaved={refreshProfile} />
          <SheetsSyncCard athleteId={profile.id} />
        </>
      )}
    </div>
  )
}
