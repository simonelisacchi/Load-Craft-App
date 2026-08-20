import { useTheme } from '../ThemeContext'

const OPTIONS = [
  { id: 'light', label: 'Chiaro', icon: '☀' },
  { id: 'dark', label: 'Scuro', icon: '●' },
  { id: 'system', label: 'Sistema', icon: '◐' },
]

export default function ThemeToggle() {
  const { pref, setTheme } = useTheme()
  return (
    <div className="theme-toggle" role="group" aria-label="Tema dell'app">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          className={pref === o.id ? 'active' : ''}
          onClick={() => setTheme(o.id)}
          title={o.label}
          aria-label={o.label}
          type="button"
        >
          <span aria-hidden="true">{o.icon}</span>
        </button>
      ))}
    </div>
  )
}
