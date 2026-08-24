// Riepilogo VO2max in evidenza — l'algoritmo di stima esiste già
// (src/lib/vo2max.js, calcolato a ogni corsa caricata se il profilo ha
// FC riposo/massima), qui lo mostriamo in un punto solo, ben visibile,
// invece di doverlo cercare corsa per corsa.

export default function Vo2maxCard({ activities }) {
  const withVo2 = (activities || [])
    .filter((a) => a.vo2max_estimate != null && a.started_at)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))

  if (!withVo2.length) {
    return (
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Nessuna stima VO2max ancora. È calcolata solo per le attività di tipo
        "corsa", e serve avere FC riposo e FC massima nel profilo <em>prima</em>
        {' '}di caricarla, oltre a un tratto a ritmo/FC sufficientemente
        stabile o sostenuto.
      </p>
    )
  }

  const latest = withVo2[0]
  const best = withVo2.reduce((m, a) => (a.vo2max_estimate > m.vo2max_estimate ? a : m), withVo2[0])

  return (
    <div>
      <div className="stat-grid">
        <div>
          <div className="stat">{latest.vo2max_estimate}</div>
          <div className="stat-label">ultima stima {latest.vo2max_confidence ? `(${latest.vo2max_confidence})` : ''}</div>
        </div>
        <div>
          <div className="stat">{best.vo2max_estimate}</div>
          <div className="stat-label">migliore stima</div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.75rem', marginTop: 10, marginBottom: 0 }}>
        Stima basata su letteratura pubblica (economia di corsa ACSM + relazione %HRR/%VO2R di Swain 1994), non sull'algoritmo proprietario Garmin/Firstbeat. La confidenza migliora con più corse a intensità diverse.
      </p>
    </div>
  )
}
