import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BodyCompForm({ coachId, athleteId, onSaved }) {
  const [weight, setWeight] = useState('')
  const [tricipite, setTricipite] = useState('')
  const [sottoscapolare, setSottoscapolare] = useState('')
  const [soprailiaca, setSoprailiaca] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const skinfolds = {}
    if (tricipite) skinfolds.tricipite = Number(tricipite)
    if (sottoscapolare) skinfolds.sottoscapolare = Number(sottoscapolare)
    if (soprailiaca) skinfolds.soprailiaca = Number(soprailiaca)
    await supabase.from('body_composition').insert({
      user_id: athleteId,
      created_by: coachId,
      weight_kg: weight ? Number(weight) : null,
      skinfolds_mm: Object.keys(skinfolds).length ? skinfolds : null,
    })
    setBusy(false)
    setWeight(''); setTricipite(''); setSottoscapolare(''); setSoprailiaca('')
    onSaved?.()
  }

  return (
    <div className="card">
      <h3>Plicometrie</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>Peso (kg)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>Tricipite (mm)</label>
          <input type="number" value={tricipite} onChange={(e) => setTricipite(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>Sottoscapolare (mm)</label>
          <input type="number" value={sottoscapolare} onChange={(e) => setSottoscapolare(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 100 }}>
          <label>Sopra-iliaca (mm)</label>
          <input type="number" value={soprailiaca} onChange={(e) => setSoprailiaca(e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={busy}>Salva misurazione</button>
    </div>
  )
}
