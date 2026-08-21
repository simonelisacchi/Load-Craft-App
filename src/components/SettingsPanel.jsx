import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabaseClient'

const THEME_OPTIONS = [
  { id: 'light', label: 'Chiaro' },
  { id: 'dark', label: 'Scuro' },
  { id: 'system', label: 'Sistema' },
]

const APP_VERSION = 'V-1.17'

export default function SettingsPanel({ onClose }) {
  const { pref, setTheme } = useTheme()
  const { session, profile } = useAuth()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '60px 16px', zIndex: 600,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: 420, width: '100%', margin: 0 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Impostazioni</h3>
          <button className="secondary" onClick={onClose} style={{ padding: '4px 10px' }}>✕</button>
        </div>

        <div style={{ marginTop: 18 }}>
          <label>Tema</label>
          <div className="theme-toggle" style={{ width: '100%', justifyContent: 'space-between' }}>
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.id}
                className={pref === o.id ? 'active' : ''}
                style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }}
                onClick={() => setTheme(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <label>Account collegato</label>
          <div className="card" style={{ background: 'var(--surface-2)', padding: 12, margin: 0 }}>
            <div style={{ fontWeight: 700 }}>{profile?.full_name || '—'}</div>
            <div className="muted mono" style={{ fontSize: '0.82rem', marginTop: 2 }}>{session?.user?.email}</div>
            <div style={{ marginTop: 8 }}>
              <span className="role-pill">{profile?.role}</span>
            </div>
          </div>
        </div>

        <button
          className="danger"
          style={{ width: '100%', marginTop: 20 }}
          onClick={() => supabase.auth.signOut()}
        >
          Esci
        </button>

        <p className="muted center" style={{ fontSize: '0.72rem', marginTop: 18, marginBottom: 0 }}>
          Load Craft — {APP_VERSION}
        </p>
      </div>
    </div>
  )
}
