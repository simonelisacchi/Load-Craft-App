// TRIMP di Banister + ACWR (Acute:Chronic Workload Ratio) via EWMA.
// Stessa formula già validata nel backend Python precedente.

export function computeTrimp(record, profile, durationMin) {
  if (!profile.hrRest || !profile.hrMax || !record?.length) return null
  const pctHRRs = record
    .map((p) => (p.hr - profile.hrRest) / (profile.hrMax - profile.hrRest))
    .filter((v) => Number.isFinite(v))
  if (!pctHRRs.length) return null
  const avgPctHRR = clamp(pctHRRs.reduce((a, b) => a + b, 0) / pctHRRs.length, 0, 1)
  const k = profile.sex === 'f' ? 1.67 : 1.92
  return durationMin * avgPctHRR * 0.64 * Math.exp(k * avgPctHRR)
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// dailyLoads: [{ date: 'YYYY-MM-DD', load: number }] ordinato per data,
// un valore per giorno (0 se non ha corso). Ritorna la serie con acuto,
// cronico e ACWR per ogni giorno.
export function computeAcwrSeries(dailyLoads, acuteDays = 7, chronicDays = 28) {
  const alphaAcute = 2 / (acuteDays + 1)
  const alphaChronic = 2 / (chronicDays + 1)
  let acute = null
  let chronic = null
  const out = []
  for (const d of dailyLoads) {
    acute = acute === null ? d.load : alphaAcute * d.load + (1 - alphaAcute) * acute
    chronic = chronic === null ? d.load : alphaChronic * d.load + (1 - alphaChronic) * chronic
    const acwr = chronic > 0 ? acute / chronic : null
    out.push({ date: d.date, load: d.load, acute, chronic, acwr, zone: classifyZone(acwr) })
  }
  return out
}

function classifyZone(acwr) {
  if (acwr === null) return null
  if (acwr < 0.8) return 'sotto-carico'
  if (acwr <= 1.3) return 'sicura'
  if (acwr <= 1.5) return 'attenzione'
  return 'rischio'
}

// Trasforma le attività in un carico giornaliero (0 nei giorni senza
// corse), riempiendo i buchi tra la prima e l'ultima data — necessario
// perché l'EWMA ha bisogno di una serie continua, non solo dei giorni
// in cui si è corso.
export function toDailyLoads(activities) {
  const byDate = {}
  for (const a of activities) {
    if (!a.started_at || a.training_load == null) continue
    const d = a.started_at.slice(0, 10)
    byDate[d] = (byDate[d] || 0) + a.training_load
  }
  const dates = Object.keys(byDate).sort()
  if (!dates.length) return []
  const start = new Date(dates[0])
  const end = new Date(dates[dates.length - 1])
  const out = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, load: byDate[key] || 0 })
  }
  return out
}
