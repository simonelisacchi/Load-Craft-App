export default function ConfigErrorScreen({ message }) {
  return (
    <div className="app-shell" style={{ paddingTop: 60 }}>
      <div className="card" style={{ maxWidth: 560, margin: '0 auto', borderColor: 'var(--coral)' }}>
        <h2 style={{ marginTop: 0 }}>⚠ L'app non riesce a collegarsi</h2>
        <p>Invece di restare su una schermata bianca, ecco esattamente cosa non va:</p>
        <div className="error-box" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', wordBreak: 'break-word' }}>
          {message}
        </div>
        <p className="muted" style={{ fontSize: '0.85rem' }}>Cose da controllare, nell'ordine:</p>
        <ol className="muted" style={{ fontSize: '0.85rem', paddingLeft: 20 }}>
          <li>Repository GitHub → Settings → Secrets and variables → Actions: i due nomi devono essere esattamente <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.</li>
          <li>Il valore di VITE_SUPABASE_URL deve iniziare con <code>https://</code> e finire con <code>.supabase.co</code>, senza spazi, virgolette o righe a capo incollate per errore.</li>
          <li>Dopo aver corretto un secret, vai nella scheda Actions del repository e usa "Re-run all jobs" sull'ultima esecuzione.</li>
        </ol>
        <p className="muted" style={{ fontSize: '0.8rem' }}>Se lavori in locale invece che su GitHub Pages: controlla il file <code>.env</code> nella cartella del progetto.</p>
      </div>
    </div>
  )
}
