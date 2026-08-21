import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Home, Calendar, ClipboardCheck, UserCircle } from 'lucide-react'
import ReminderBanner from '../components/ReminderBanner'
import BottomTabBar from '../components/BottomTabBar'
import NotesPanel from '../components/NotesPanel'
import ActivityUpload from '../components/ActivityUpload'
import ActivityList from '../components/ActivityList'
import ActivityDetail from '../components/ActivityDetail'
import AcwrChart from '../components/AcwrChart'
import RecoveryCard from '../components/RecoveryCard'
import Vo2maxCard from '../components/Vo2maxCard'
import TrainingPlanView from '../components/TrainingPlanView'
import CheckinForm from '../components/CheckinForm'
import CheckinHistory from '../components/CheckinHistory'
import ProfileForm from '../components/ProfileForm'
import SheetsSyncCard from '../components/SheetsSyncCard'

const TABS = [
  { id: 'Panoramica', label: 'Panoramica', icon: Home },
  { id: 'Scheda', label: 'Scheda', icon: Calendar },
  { id: 'Check-in', label: 'Check-in', icon: ClipboardCheck },
  { id: 'Profilo & backup', label: 'Profilo', icon: UserCircle },
]

export default function AthleteDashboard() {
  const { profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState('Panoramica')
  const [activities, setActivities] = useState([])
  const [notes, setNotes] = useState([])
  const [todayCheckin, setTodayCheckin] = useState(null)
  const [latestTqr, setLatestTqr] = useState(null)
  const [selectedActivityId, setSelectedActivityId] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    if (!profile) return
    setLoadError(null)
    const [actsRes, notesRes, chkRes, latestTqrRes] = await Promise.all([
      supabase.from('activities').select('*').eq('user_id', profile.id).order('started_at', { ascending: false }),
      supabase.from('coach_notes').select('*').eq('athlete_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('daily_checkins').select('*').eq('user_id', profile.id).eq('the_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
      supabase.from('daily_checkins').select('tqr').eq('user_id', profile.id).not('tqr', 'is', null).order('the_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    const firstError = actsRes.error || notesRes.error || (chkRes.error && chkRes.error.code !== 'PGRST116' ? chkRes.error : null)
    if (firstError) setLoadError(firstError.message)
    setActivities(actsRes.data || [])
    setNotes(notesRes.data || [])
    setTodayCheckin(chkRes.data || null)
    setLatestTqr(latestTqrRes.data?.tqr ?? null)
  }, [profile])

  useEffect(() => { load() }, [load])

  if (!profile) return null

  const priorityCount = notes.filter((n) => n.urgency === 'urgente' || n.urgency === 'attenzione' || (n.urgency == null && n.priority)).length

  return (
    <div>
      <ReminderBanner athleteId={profile.id} />

      {loadError && <div className="error-box">Non sono riuscito a caricare tutti i dati: {loadError}</div>}

      {tab === 'Panoramica' && (
        <>
          {selectedActivityId ? (
            <ActivityDetail
              activityId={selectedActivityId}
              onClose={() => setSelectedActivityId(null)}
              canManage
              onDeleted={() => { setSelectedActivityId(null); load() }}
            />
          ) : (
            <>
              <div className="card">
                <h3>Recupero</h3>
                <RecoveryCard activities={activities} latestTqr={latestTqr} />
              </div>
              <div className="card">
                <h3>Note del coach</h3>
                <NotesPanel notes={notes} />
              </div>
              <div className="card">
                <h3>VO2max</h3>
                <Vo2maxCard activities={activities} />
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
        <>
          <CheckinForm athleteId={profile.id} existing={todayCheckin} onSaved={load} />
          <div className="card">
            <h3>Storico check-in</h3>
            <CheckinHistory userId={profile.id} />
          </div>
        </>
      )}

      {tab === 'Profilo & backup' && (
        <>
          <ProfileForm profile={profile} onSaved={refreshProfile} />
          <SheetsSyncCard athleteId={profile.id} />
        </>
      )}

      <BottomTabBar
        tabs={TABS.map((t) => ({ ...t, badge: t.id === 'Panoramica' ? priorityCount : 0 }))}
        active={tab}
        onChange={(id) => { setTab(id); setSelectedActivityId(null) }}
      />
    </div>
  )
}
