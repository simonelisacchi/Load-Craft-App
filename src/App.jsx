import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { supabase } from './lib/supabaseClient'
import ThemeToggle from './components/ThemeToggle'
import Login from './pages/Login'
import Register from './pages/Register'
import PendingActivation from './pages/PendingActivation'
import AthleteDashboard from './pages/AthleteDashboard'
import CoachDashboard from './pages/CoachDashboard'

export default function App() {
  const { session, profile, loading } = useAuth()
  const { effective } = useTheme()
  const logoSrc = effective === 'dark' ? './icon-192.png' : './icon-light-192.png'

  if (loading) return <div className="app-shell center muted" style={{ paddingTop: 80 }}>Caricamento…</div>

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <img src={logoSrc} alt="" />
          Corse — Analisi Allenamento
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
          {session && profile && (
            <>
              <span className="role-pill">{profile.role}</span>
              <button className="secondary" onClick={() => supabase.auth.signOut()}>Esci</button>
            </>
          )}
        </div>
      </div>

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
    </div>
  )
}
