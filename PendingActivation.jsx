import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../AuthContext'

export default function PendingActivation() {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const { refreshProfile } = useAuth()

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('redeem_invite', { invite_code: code.trim() })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await refreshProfile()
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
      <h2>Attiva il tuo account</h2>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Il tuo account esiste ma non è ancora collegato a nessun coach.
        Inserisci il codice invito che ti ha dato il tuo coach.
      </p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Codice invito</label>
          <input required value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} style={{ width: '100%' }}>Attiva</button>
      </form>
      <button className="secondary" style={{ width: '100%', marginTop: 10 }} onClick={() => supabase.auth.signOut()}>Esci</button>
    </div>
  )
}
