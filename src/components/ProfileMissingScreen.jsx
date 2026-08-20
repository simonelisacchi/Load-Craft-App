export default function ProfileMissingScreen({ onRetry, onSignOut, error }) {
  return (
    <div className="card" style={{ maxWidth: 560, margin: '60px auto', borderColor: 'var(--amber)' }}>
      <h2 style={{ marginTop: 0 }}>⚠ {error ? 'Il database ha risposto con un errore' : 'Account senza profilo collegato'}</h2>

      {error ? (
        <>
          <p>La lettura del profilo non è riuscita. Questo è il messaggio esatto restituito dal database — utile per capire cosa correggere:</p>
          <div className="error-box" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', wordBreak: 'break-word' }}>
            {error.message}
            {error.hint ? <div style={{ marginTop: 6 }}>Suggerimento: {error.hint}</div> : null}
            {error.code ? <div style={{ marginTop: 6, opacity: 0.7 }}>Codice: {error.code}</div> : null}
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="secondary" onClick={onRetry}>Riprova</button>
        <button onClick={onSignOut}>Esci</button>
      </div>
    </div>
  )
}
