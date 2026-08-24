import { toDailyLoads, computeAcwrSeries } from './acwr'

// Indicazione di recupero pensata per rispondere a una domanda concreta
// del coach: "come faccio a capire (e a far capire all'atleta) se oggi
// serve un giorno di scarico?". Combina tre segnali che già abbiamo,
// nessun dato nuovo da raccogliere:
//  - zona ACWR più recente (carico che sale troppo in fretta)
//  - ultimo TQR registrato dall'atleta (fatica percepita)
//  - giorni consecutivi con almeno un allenamento, senza pause
//
// Volutamente NON è un punteggio unico stile "readiness score": ogni
// livello elenca ESATTAMENTE quali segnali l'hanno determinato, in
// coerenza con la filosofia di trasparenza di tutta l'app.
export function computeRecoveryStatus({ activities, latestTqr }) {
  const daily = toDailyLoads(activities || [])
  const series = daily.length >= 3 ? computeAcwrSeries(daily) : []
  const latestZone = series.length ? series[series.length - 1].zone : null

  // giorni consecutivi di allenamento, contando all'indietro dall'ultimo
  // giorno in cui risulta una corsa caricata
  const trainingDates = [...new Set((activities || []).map((a) => a.started_at?.slice(0, 10)).filter(Boolean))]
  const dateSet = new Set(trainingDates)
  let streak = 0
  if (trainingDates.length) {
    const sorted = [...trainingDates].sort()
    let cursor = new Date(sorted[sorted.length - 1] + 'T00:00:00')
    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  const reasons = []
  let level = 'ok' // 'ok' | 'watch' | 'rest'

  function escalate(to) {
    const order = { ok: 0, watch: 1, rest: 2 }
    if (order[to] > order[level]) level = to
  }

  if (latestZone === 'rischio') {
    escalate('rest')
    reasons.push('ACWR in zona di rischio: il carico è salito troppo in fretta rispetto alle ultime settimane.')
  } else if (latestZone === 'attenzione') {
    escalate('watch')
    reasons.push('ACWR in zona di attenzione.')
  }

  if (latestTqr != null) {
    if (latestTqr <= 9) {
      escalate('rest')
      reasons.push(`Ultimo TQR molto basso (${latestTqr}/20): recupero percepito scarso.`)
    } else if (latestTqr <= 12) {
      escalate('watch')
      reasons.push(`Ultimo TQR nella fascia bassa (${latestTqr}/20).`)
    }
  }

  if (streak >= 6) {
    escalate('rest')
    reasons.push(`${streak} giorni di fila con almeno un allenamento, senza pause.`)
  } else if (streak >= 4) {
    escalate('watch')
    reasons.push(`${streak} giorni di fila senza un giorno di riposo.`)
  }

  if (!reasons.length) {
    reasons.push('Nessun segnale di affaticamento nei dati disponibili al momento.')
  }

  return { level, reasons, latestZone, latestTqr, streak }
}
