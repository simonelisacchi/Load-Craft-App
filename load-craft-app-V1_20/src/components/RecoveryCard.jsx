import { computeRecoveryStatus } from '../lib/recovery'

const LEVEL_INFO = {
  ok: { label: 'Pronto per allenarti', badge: 'zone-sicura' },
  watch: { label: 'Valuta un carico più leggero', badge: 'zone-attenzione' },
  rest: { label: 'Consigliato un giorno di recupero', badge: 'zone-rischio' },
}

export default function RecoveryCard({ activities, latestTqr }) {
  const { level, reasons } = computeRecoveryStatus({ activities, latestTqr })
  const info = LEVEL_INFO[level]

  return (
    <div>
      <span className={`zone-badge ${info.badge}`} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{info.label}</span>
      <ul className="muted" style={{ fontSize: '0.82rem', marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
        {reasons.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
      </ul>
      <p className="muted" style={{ fontSize: '0.72rem', marginTop: 10, marginBottom: 0 }}>
        Basata su ACWR, ultimo TQR registrato e giorni consecutivi di allenamento — un supporto alla decisione, non una regola rigida da seguire alla lettera.
      </p>
    </div>
  )
}
