import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ProfileForm({ profile, onSaved }) {
  const [weight, setWeight] = useState(profile.weight_kg || '')
  const [height, setHeight] = useState(profile.height_cm || '')
  const [hrRest, setHrRest] = useState(profile.hr_rest || '')
  const [hrMax, setHrMax] = useState(profile.hr_max || '')
  const [sex, setSex] = useState(profile.sex || '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true)
    await supabase.from('profiles').update({
      weight_kg: weight ? Number(weight) : null,
      height_cm: height ? Number(height) : null,
      hr_rest: hrRest ? Number(hrRest) : null,
      hr_max: hrMax ? Number(hrMax) : null,
      sex: sex || null,
    }).eq('id', profile.id)
    setBusy(false)
    setSaved(true)
    onSaved?.()
  }

  return (
    <div className="card">
      <h3>Profilo fisiologico</h3>
      <p className="muted" style={{ fontSize: '0.82rem' }}>Servono FC riposo e FC massima per calcolare VO2max e carico di allenamento.</p>
      {saved && <div className="success-box">Profilo aggiornato.</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>Sesso</label>
          <select value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">—</option>
            <option value="m">M</option>
            <option value="f">F</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>Peso (kg)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>Altezza (cm)</label>
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>FC riposo</label>
          <input type="number" value={hrRest} onChange={(e) => setHrRest(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>FC massima</label>
          <input type="number" value={hrMax} onChange={(e) => setHrMax(e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={busy}>Salva profilo</button>
    </div>
  )
}
