import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BodyCompHistory({ userId, limit = 20 }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('body_composition')
      .select('*')
      .eq('user_id', userId)
      .order('the_date', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setRows(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, limit])

  if (loading) return <p className="muted">Caricamento misurazioni…</p>
  if (error) return <div className="error-box">{error}</div>
  if (!rows.length) return <p className="muted" style={{ fontSize: '0.85rem' }}>Nessuna misurazione registrata ancora.</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th className="mono">Peso</th>
            <th>Plicometrie (mm)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.the_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td className="mono">{r.weight_kg ? `${r.weight_kg} kg` : '—'}</td>
              <td className="muted" style={{ fontSize: '0.82rem' }}>
                {r.skinfolds_mm
                  ? Object.entries(r.skinfolds_mm).map(([site, mm]) => `${site}: ${mm}mm`).join(' · ')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
