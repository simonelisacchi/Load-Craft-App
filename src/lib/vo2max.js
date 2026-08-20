// Stima VO2max — porting in JS della stessa logica usata nelle versioni
// precedenti dell'app (basata su letteratura pubblica: equazioni di
// economia di corsa ACSM + relazione %HRR ≈ %VO2R di Swain 1994, più
// stima VDOT di Daniels & Gilbert su sforzi sostenuti). Non è
// l'algoritmo proprietario Firstbeat/Garmin.
//
// record: array ordinato per tempo di { t: secondi dall'inizio,
//          hr: bpm, paceSecPerKm: secondi/km, grade: pendenza (0..1) }
// profile: { sex: 'm'|'f', hrRest: number, hrMax: number }

const VO2_REST = 3.5 // ml/kg/min, 1 MET

function speedMetersPerMin(paceSecPerKm) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return 0
  return 1000 / (paceSecPerKm / 60)
}

function acsmRunningVO2(speedMPerMin, grade = 0) {
  // ACSM: VO2 (ml/kg/min) = 0.2*speed + 0.9*speed*grade + 3.5
  return 0.2 * speedMPerMin + 0.9 * speedMPerMin * grade + VO2_REST
}

function percentHRR(hr, hrRest, hrMax) {
  if (!hrMax || hrMax <= hrRest) return null
  return clamp((hr - hrRest) / (hrMax - hrRest), 0.05, 0.98)
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
}

function stdev(arr) {
  const m = mean(arr)
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)))
}

// Trova finestre "stazionarie": ritmo e FC stabili, pendenza piatta.
function findStationarySegments(record, windowSec = 60) {
  const segments = []
  let i = 0
  while (i < record.length) {
    const start = record[i].t
    const window = []
    let j = i
    while (j < record.length && record[j].t - start < windowSec) {
      window.push(record[j])
      j++
    }
    if (window.length >= 10) {
      const hrs = window.map((p) => p.hr).filter(Boolean)
      const paces = window.map((p) => p.paceSecPerKm).filter(Boolean)
      const grades = window.map((p) => p.grade || 0)
      if (hrs.length > 5 && paces.length > 5) {
        const hrStable = stdev(hrs) < 4 // bpm
        const paceStable = stdev(paces) < 8 // sec/km
        const flat = Math.abs(mean(grades)) < 0.02
        if (hrStable && paceStable && flat) {
          segments.push({
            avgHr: mean(hrs),
            avgPace: mean(paces),
            durationS: window.length,
          })
        }
      }
    }
    i = j
  }
  return segments
}

// Metodo 1: HRR / VO2 Reserve (Swain 1994)
function estimateFromHRR(record, profile) {
  const usable = record.filter((p) => p.t >= 180)
  const segments = findStationarySegments(usable)
  if (segments.length === 0) return null

  const estimates = []
  for (const seg of segments) {
    const pctHRR = percentHRR(seg.avgHr, profile.hrRest, profile.hrMax)
    if (pctHRR === null) continue
    const speed = speedMetersPerMin(seg.avgPace)
    const vo2Submax = acsmRunningVO2(speed, 0)
    const vo2max = VO2_REST + (vo2Submax - VO2_REST) / pctHRR
    estimates.push({ vo2max, pctHRR, durationS: seg.durationS })
  }
  if (estimates.length === 0) return null

  const totalDur = estimates.reduce((a, e) => a + e.durationS, 0)
  const weighted = estimates.reduce((a, e) => a + e.vo2max * e.durationS, 0) / totalDur
  const hrrRange = Math.max(...estimates.map((e) => e.pctHRR)) - Math.min(...estimates.map((e) => e.pctHRR))

  // confidenza: più segmenti, più range di %HRR coperto => più affidabile
  let confidence = 'bassa'
  if (estimates.length >= 4 && hrrRange > 0.15) confidence = 'media'
  if (estimates.length >= 8 && hrrRange > 0.3) confidence = 'alta'

  return { vo2max: weighted, confidence, method: 'hrr_reserve', segments: estimates.length }
}

// Metodo 2: VDOT (Daniels & Gilbert) su sforzo sostenuto medio-alto
function estimateFromVDOT(record, profile) {
  const usable = record.filter((p) => p.t >= 180)
  // cerca il tratto continuo più lungo con %HRR >= 0.75
  let bestRun = []
  let current = []
  for (const p of usable) {
    const pct = percentHRR(p.hr, profile.hrRest, profile.hrMax)
    if (pct !== null && pct >= 0.75) {
      current.push(p)
    } else {
      if (current.length > bestRun.length) bestRun = current
      current = []
    }
  }
  if (current.length > bestRun.length) bestRun = current
  if (bestRun.length < 5 * 60) return null // serve almeno ~5 minuti

  const paces = bestRun.map((p) => p.paceSecPerKm).filter(Boolean)
  const avgPace = mean(paces)
  const speed = speedMetersPerMin(avgPace)
  const tMin = bestRun.length / 60

  const vo2 = -4.6 + 0.182258 * speed + 0.000104 * speed * speed
  const pctMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin)
  const vdot = vo2 / pctMax

  return { vo2max: vdot, confidence: tMin >= 15 ? 'media' : 'bassa', method: 'vdot', durationMin: tMin }
}

export function estimateVo2max(record, profile) {
  if (!profile.hrMax || !profile.hrRest) {
    return { vo2max: null, confidence: null, note: 'Servono FC riposo e FC massima nel profilo per stimare il VO2max.' }
  }
  const a = estimateFromHRR(record, profile)
  const b = estimateFromVDOT(record, profile)

  if (!a && !b) {
    return { vo2max: null, confidence: null, note: 'Nessun tratto stazionario o sostenuto sufficiente in questa corsa.' }
  }
  if (a && !b) return { vo2max: round1(a.vo2max), confidence: a.confidence, note: `Metodo HRR/VO2R (${a.segments} tratti stazionari).` }
  if (b && !a) return { vo2max: round1(b.vo2max), confidence: b.confidence, note: `Metodo VDOT (sforzo sostenuto ${b.durationMin.toFixed(1)} min).` }

  // combinazione pesata: VDOT pesa di più se la sua confidenza è "media" o oltre
  const wA = a.confidence === 'alta' ? 3 : a.confidence === 'media' ? 2 : 1
  const wB = b.confidence === 'media' ? 2 : 1
  const combined = (a.vo2max * wA + b.vo2max * wB) / (wA + wB)
  const confidence = a.confidence === 'alta' || b.confidence === 'media' ? 'media' : 'bassa'
  return { vo2max: round1(combined), confidence, note: 'Combinazione dei due metodi (HRR/VO2R + VDOT).' }
}

function round1(n) {
  return Math.round(n * 10) / 10
}
