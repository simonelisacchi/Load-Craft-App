import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabaseClient'
import InviteGenerator from '../components/InviteGenerator'
import ActivityList from '../components/ActivityList'
import AcwrChart from '../components/AcwrChart'
import NoteComposer from '../components/NoteComposer'
import NotesPanel from '../components/NotesPanel'
import TrainingPlanBuilder from '../components/TrainingPlanBuilder'
import TrainingPlanView from '../components/TrainingPlanView'
import CoachPlanEditor from '../components/CoachPlanEditor'
import BodyCompForm from '../components/BodyCompForm'

const TABS = ['Dati & grafici', 'Note', 'Scheda', 'Plicometrie']

function SchedaTab({ coachId, athlete, onChanged }) {
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleChanged() {
    setRefreshKey((k) => k + 1)
    onChanged?.()
  }

  return (
    <>
      <TrainingPlanView key={`view-${refreshKey}`} athleteId={athlete.id} />
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

  const loadAthletes = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('coach_id', profile.id).order('full_name')
    setAthletes(data || [])
    if (!selected && data?.length) setSelected(data[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  useEffect(() => { loadAthletes() }, [loadAthletes])

  const loadAthleteData = useCallback(async () => {
    if (!selected) return
    const [{ data: acts }, { data: ns }] = await Promise.all([
      supabase.from('activities').select('*').eq('user_id', selected).order('started_at', { ascending: false }),
      supabase.from('coach_notes').select('*').eq('athlete_id', selected).order('created_at', { ascending: false }),
    ])
    setActivities(acts || [])
    setNotes(ns || [])
  }, [selected])

  useEffect(() => { loadAthleteData() }, [loadAthleteData])

  const athlete = athletes.find((a) => a.id === selected)

  return (
    <div>
      <InviteGenerator coachId={profile.id} />

      <div className="card">
        <h3>Atleti collegati</h3>
        {!athletes.length && <p className="muted">Nessun atleta ancora. Genera un codice invito qui sopra e condividilo.</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {athletes.map((a) => (
            <button key={a.id} className={a.id === selected ? '' : 'secondary'} onClick={() => setSelected(a.id)}>
              {a.full_name || a.id.slice(0, 8)}
            </button>
          ))}
        </div>
      </div>

      {athlete && (
        <>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {tab === 'Dati & grafici' && (
            <>
              <div className="card">
                <h3>ACWR — {athlete.full_name}</h3>
                <AcwrChart activities={activities} />
              </div>
              <div className="card">
                <h3>Storico corse</h3>
                <ActivityList activities={activities} />
              </div>
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
                <NotesPanel notes={notes} />
              </div>
            </>
          )}

          {tab === 'Scheda' && (
            <SchedaTab coachId={profile.id} athlete={athlete} onChanged={loadAthleteData} />
          )}

          {tab === 'Plicometrie' && (
            <BodyCompForm coachId={profile.id} athleteId={athlete.id} />
          )}
        </>
      )}
    </div>
  )
}
