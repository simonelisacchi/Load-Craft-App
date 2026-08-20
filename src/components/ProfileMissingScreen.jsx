export default function ProfileMissingScreen({ onRetry, onSignOut }) {
  return (
    <div className="card" style={{ maxWidth: 520, margin: '60px auto', borderColor: 'var(--amber)' }}>
      <h2 style={{ marginTop: 0 }}>⚠ Account senza profilo collegato</h2>
      <p>
        L'accesso funziona, ma questo account non risulta collegato a nessun
        profilo (coach o atleta) nel database. Capita se l'account è stato
        creato prima che le tabelle del database fossero pronte.
      </p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        La soluzione più semplice: esci, chiedi di eliminare questo account
        dal progetto Supabase (Authentication → Users), e registrati di
        nuovo con la stessa email — questa volta il profilo verrà creato
        automaticamente.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="secondary" onClick={onRetry}>Riprova</button>
        <button onClick={onSignOut}>Esci</button>
      </div>
    </div>
  )
}
