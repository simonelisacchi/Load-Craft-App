import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeCtx = createContext(null)
const STORAGE_KEY = 'theme_pref' // 'light' | 'dark' | 'system'

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveEffective(pref) {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

export function ThemeProvider({ children }) {
  const [pref, setPref] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')
  const [effective, setEffective] = useState(() => resolveEffective(pref))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effective)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', effective === 'dark' ? '#10141a' : '#f3f5f8')
  }, [effective])

  useEffect(() => {
    setEffective(resolveEffective(pref))
    localStorage.setItem(STORAGE_KEY, pref)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setEffective(resolveEffective('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const setTheme = useCallback((next) => setPref(next), [])

  return (
    <ThemeCtx.Provider value={{ pref, effective, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
