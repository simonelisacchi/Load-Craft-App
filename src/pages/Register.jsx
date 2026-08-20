import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (signUpError) {
      setError(signUpError.message)
      setBusy(false)
      return
    }

    if (!data.session) {
      // La conferma email è attiva sul progetto Supabase: l'utente deve
      // prima confermare, poi accedere e inserire il codice invito dalla
      // schermata "Attiva account".
      setInfo('Registrazione creata. Controlla l\'email per confermare l\'account, poi accedi.')
      setBusy(false)
      return
    }

    if (inviteCode.trim()) {
      const { error: rpcError } = await supabase.rpc('redeem_invite', { invite_code: inviteCode.trim() })
      if (rpcError) {
        setError(`Account creato, ma il codice invito non è valido: ${rpcError.message}. Puoi riprovare dalla schermata "Attiva account" dopo aver effettuato l'accesso.`)
        setBusy(false)
        return
      }
    }
    navigate('/')
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
      <h2>Registrati</h2>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Se sei la primissima persona a registrarsi su questo progetto, diventi
        automaticamente coach. Altrimenti inserisci qui il codice invito
        ricevuto dal tuo coach (oppure inseriscilo dopo, dalla schermata
        "Attiva account").
      </p>
      {error && <div className="error-box">{error}</div>}
      {info && <div className="success-box">{info}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Nome e cognome</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label>Codice invito (se ce l'hai già)</label>
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="opzionale" />
        </div>
        <button type="submit" disabled={busy} style={{ width: '100%' }}>Crea account</button>
      </form>
      <p className="muted" style={{ marginTop: 16, fontSize: '0.85rem' }}>
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </div>
  )
}
