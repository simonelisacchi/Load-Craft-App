import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import LineChart from './LineChart'

export default function CheckinHistory({ userId, limit = 30 }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('daily_checkins')
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

  if (loading) return <p className="muted">Caricamento check-in…</p>
  if (error) return <div className="error-box">{error}</div>
  if (!rows.length) return <p className="muted" style={{ fontSize: '0.85rem' }}>Nessun check-in registrato ancora.</p>

  const tqrPoints = [...rows]
    .filter((r) => r.tqr != null)
    .sort((a, b) => new Date(a.the_date) - new Date(b.the_date))
    .map((r) => ({ x: new Date(r.the_date).getTime(), y: r.tqr }))

  return (
    <div>
      {tqrPoints.length > 1 && (
        <LineChart points={tqrPoints} label="TQR (qualità del recupero)" unit="" color="var(--accent)" formatY={(v) => Math.round(v)} />
      )}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th className="mono">TQR</th>
              <th className="mono">Sonno</th>
              <th className="mono">FC riposo</th>
              <th className="mono">HRV</th>
              <th className="mono">Respiro</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.the_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</td>
                <td className="mono">{r.tqr ?? '—'}</td>
                <td className="mono">{r.sleep_h ? `${r.sleep_h}h` : '—'}</td>
                <td className="mono">{r.resting_hr ?? '—'}</td>
                <td className="mono">{r.hrv ?? '—'}</td>
                <td className="mono">{r.respiration ?? '—'}</td>
                <td className="muted" style={{ fontSize: '0.8rem' }}>{r.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
