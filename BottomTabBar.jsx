// Barra di navigazione in basso, fissa, come nelle app mobile native
// (Instagram, Strava, ecc.). Su schermi larghi resta comunque comoda —
// non è esclusiva del mobile, semplicemente lì è dove ci si aspetta la
// navigazione principale con il pollice.

export default function BottomTabBar({ tabs, active, onChange }) {
  return (
    <nav className="bottom-tabbar" role="tablist" aria-label="Sezioni">
      {tabs.map((t) => {
        const Icon = t.icon
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            className={`bottom-tab ${isActive ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="bottom-tab-icon">
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
              {t.badge > 0 && <span className="bottom-tab-badge">{t.badge > 9 ? '9+' : t.badge}</span>}
            </span>
            <span className="bottom-tab-label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
