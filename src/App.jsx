import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { supabase } from './lib/supabaseClient'
import SettingsPanel from './components/SettingsPanel'
import ConfigErrorScreen from './components/ConfigErrorScreen'
import ProfileMissingScreen from './components/ProfileMissingScreen'
import Login from './pages/Login'
import Register from './pages/Register'
import PendingActivation from './pages/PendingActivation'
import AthleteDashboard from './pages/AthleteDashboard'
import CoachDashboard from './pages/CoachDashboard'

export default function App() {
  const { session, profile, loading, configError, refreshProfile, profileError } = useAuth()
  const { effective } = useTheme()
  const logoSrc = effective === 'dark' ? './icon-192.png' : './icon-light-192.png'
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (configError) return <ConfigErrorScreen message={configError} />
  if (loading) return <div className="app-shell center muted" style={{ paddingTop: 80 }}>Caricamento…</div>

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <img src={logoSrc} alt="" />
          Load Craft
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {session && profile && <span className="role-pill">{profile.role}</span>}
          {session && (
            <button className="secondary icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Impostazioni" title="Impostazioni">
              ⚙
            </button>
          )}
        </div>
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {session && !profile ? (
        <ProfileMissingScreen onRetry={refreshProfile} onSignOut={() => supabase.auth.signOut()} error={profileError} />
      ) : (
        <Routes>
          {!session && (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/registrati" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
          {session && profile?.role === 'pending' && (
            <>
              <Route path="/attiva" element={<PendingActivation />} />
              <Route path="*" element={<Navigate to="/attiva" replace />} />
            </>
          )}
          {session && profile?.role === 'athlete' && (
            <>
              <Route path="/" element={<AthleteDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
          {session && profile?.role === 'coach' && (
            <>
              <Route path="/" element={<CoachDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      )}
    </div>
  )
}
