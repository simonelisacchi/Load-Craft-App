import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabaseClient'
import { BarChart3, MessageSquare, Calendar, HeartPulse } from 'lucide-react'
import InviteGenerator from '../components/InviteGenerator'
import BottomTabBar from '../components/BottomTabBar'
import ActivityList from '../components/ActivityList'
import ActivityDetail from '../components/ActivityDetail'
import AcwrChart from '../components/AcwrChart'
import Vo2maxCard from '../components/Vo2maxCard'
import NoteComposer from '../components/NoteComposer'
import NotesPanel from '../components/NotesPanel'
import TrainingPlanBuilder from '../components/TrainingPlanBuilder'
import TrainingPlanView from '../components/TrainingPlanView'
import CoachPlanEditor from '../components/CoachPlanEditor'
import BodyCompForm from '../components/BodyCompForm'
import BodyCompHistory from '../components/BodyCompHistory'
import CheckinHistory from '../components/CheckinHistory'

const TABS = [
  { id: 'Dati & grafici', label: 'Dati', icon: BarChart3 },
  { id: 'Note', label: 'Note', icon: MessageSquare },
  { id: 'Scheda', label: 'Scheda', icon: Calendar },
  { id: 'Salute', label: 'Salute', icon: HeartPulse },
]

function SchedaTab({ coachId, athlete, onChanged }) {
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleChanged() {
    setRefreshKey((k) => k + 1)
    onChanged?.()
  }

  return (
    <>
      <TrainingPlanView key={`view-${refreshKey}`} athleteId={athlete.id} readOnly />
      <CoachPlanEditor key={`edit-${refreshKey}`} athleteId={athlete.id} onChanged={handleChanged} />

      {!showNewPlan && (
        <button className="secondary" onClick={() => setShowNewPlan(true)}>+ crea una scheda completamente nuova</button>
      )}
      {showNewPlan && (
        <TrainingPlanBuilder
          coachId={coachId}
          athleteId={athlete.id}
          onCreated={() => { setShowNewPlan(false); handleChanged() }}
        />
      )}
    </>
  )
}

export default function CoachDashboard() {
  const { profile } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('Dati & grafici')
  const [activities, setActivities] = useState([])
  const [notes, setNotes] = useState([])
  const [selectedActivityId, setSelectedActivityId] = useState(null)
  const [newActivityIds, setNewActivityIds] = useState(new Set())
  const [athletesError, setAthletesError] = useState(null)
  const [dataError, setDataError] = useState(null)
  const [bodyCompKey, setBodyCompKey] = useState(0)

  const loadAthletes = useCallback(async () => {
    setAthletesError(null)
    const { data, error } = await supabase.from('profiles').select('*').eq('coach_id', profile.id).order('full_name')
    if (error) {
      setAthletesError(error.message)
      return
    }
    setAthletes(data || [])
    setSelected((prev) => prev || data?.[0]?.id || null)
  }, [profile])

  useEffect(() => { loadAthletes() }, [loadAthletes])

  const loadAthleteData = useCallback(async () => {
    if (!selected) return
    setDataError(null)
    const [actsRes, notesRes] = await Promise.all([
      supabase.from('activities').select('*').eq('user_id', selected).order('started_at', { ascending: false }),
      supabase.from('coach_notes').select('*').eq('athlete_id', selected).order('created_at', { ascending: false }),
    ])
    if (actsRes.error || notesRes.error) {
      setDataError((actsRes.error || notesRes.error).message)
    }
    const acts = actsRes.data || []
    setActivities(acts)
    setNotes(notesRes.data || [])

    // Evidenzia le attività caricate dopo l'ultima volta che questo
    // coach ha guardato questo atleta (segnalibro salvato sul
    // dispositivo, per non dover aggiungere colonne al database).
    const lsKey = `lastSeenActivities_${profile.id}_${selected}`
    const lastSeen = localStorage.getItem(lsKey)
    const created = acts.map((a) => a.created_at).filter(Boolean)
    setNewActivityIds(lastSeen ? new Set(acts.filter((a) => a.created_at && a.created_at > lastSeen).map((a) => a.id)) : new Set())
    if (created.length) {
      localStorage.setItem(lsKey, created.reduce((max, c) => (c > max ? c : max), created[0]))
    }
  }, [selected, profile])

  useEffect(() => { loadAthleteData() }, [loadAthleteData])

  const athlete = athletes.find((a) => a.id === selected)

  return (
    <div>
      <InviteGenerator coachId={profile.id} />

      <div className="card">
        <h3>Atleti collegati</h3>
        {athletesError && <div className="error-box">{athletesError}</div>}
        {!athletes.length && !athletesError && <p className="muted">Nessun atleta ancora. Genera un codice invito qui sopra e condividilo.</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {athletes.map((a) => (
            <button key={a.id} className={a.id === selected ? '' : 'secondary'} onClick={() => { setSelected(a.id); setSelectedActivityId(null) }}>
              {a.full_name || a.id.slice(0, 8)}
            </button>
          ))}
        </div>
      </div>

      {athlete && (
        <>
          {dataError && <div className="error-box">Non sono riuscito a caricare tutti i dati: {dataError}</div>}

          {tab === 'Dati & grafici' && (
            <>
              {selectedActivityId ? (
                <ActivityDetail activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />
              ) : (
                <>
                  <div className="card">
                    <h3>VO2max — {athlete.full_name}</h3>
                    <Vo2maxCard activities={activities} />
                  </div>
                  <div className="card">
                    <h3>ACWR — {athlete.full_name}</h3>
                    <AcwrChart activities={activities} />
                  </div>
                  <div className="card">
                    <h3>Storico corse</h3>
                    <p className="muted" style={{ fontSize: '0.8rem', marginTop: -6 }}>Tocca una corsa per vedere mappa, FC e passo nel dettaglio.</p>
                    <ActivityList activities={activities} onSelect={setSelectedActivityId} highlightIds={newActivityIds} />
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'Note' && (
            <>
              <div className="card">
                <h3>Scrivi una nota per {athlete.full_name}</h3>
                <NoteComposer coachId={profile.id} athleteId={athlete.id} onSent={loadAthleteData} />
              </div>
              <div className="card">
                <h3>Note inviate</h3>
                <NotesPanel notes={notes} editableByCoachId={profile.id} onChanged={loadAthleteData} />
              </div>
            </>
          )}

          {tab === 'Scheda' && (
            <SchedaTab coachId={profile.id} athlete={athlete} onChanged={loadAthleteData} />
          )}

          {tab === 'Salute' && (
            <>
              <div className="card">
                <h3>Check-in di {athlete.full_name}</h3>
                <p className="muted" style={{ fontSize: '0.8rem', marginTop: -6 }}>TQR, sonno, FC a riposo — inseriti dall'atleta, di sola lettura per te.</p>
                <CheckinHistory userId={athlete.id} />
              </div>
              <BodyCompForm coachId={profile.id} athleteId={athlete.id} onSaved={() => setBodyCompKey((k) => k + 1)} />
              <div className="card">
                <h3>Storico misurazioni</h3>
                <BodyCompHistory key={bodyCompKey} userId={athlete.id} />
              </div>
            </>
          )}

          <BottomTabBar tabs={TABS} active={tab} onChange={setTab} />
        </>
      )}
    </div>
  )
}
