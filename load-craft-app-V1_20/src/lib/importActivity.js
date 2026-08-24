import { parseGpx } from './parsers/gpx'
import { parseTcx } from './parsers/tcx'
import { parseFit } from './parsers/fit'
import { estimateVo2max } from './vo2max'
import { computeTrimp } from './acwr'
import { guessActivityType } from './activityTypes'

// Riduce lo stream a un numero di punti gestibile da salvare come jsonb
// (bastano per gli algoritmi, non serve la risoluzione al secondo per
// migliaia di punti se la corsa è molto lunga).
function downsample(record, maxPoints = 3600) {
  if (record.length <= maxPoints) return record
  const step = Math.ceil(record.length / maxPoints)
  return record.filter((_, i) => i % step === 0)
}

function friendlyFallbackName(startedAt, source) {
  const sourceLabel = { fit_upload: 'Garmin', gpx_upload: 'GPX', tcx_upload: 'TCX' }[source] || 'Corsa'
  if (!startedAt) return `Corsa (${sourceLabel})`
  const d = new Date(startedAt)
  const formatted = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  return `Corsa del ${formatted}`
}

// Stima il VO2max SOLO per le corse: l'algoritmo (src/lib/vo2max.js) è
// costruito sull'economia di corsa (ACSM) e non ha significato fisico
// per altri sport (es. in bici, a parità di FC, la velocità è molto
// più alta e la formula restituisce numeri assurdi). Per qualunque
// altro activity_type torniamo null esplicitamente, con un motivo
// chiaro invece di lasciar passare un calcolo sbagliato.
export function estimateVo2maxForActivity(record, profile, activityType) {
  if (activityType !== 'corsa') {
    return { vo2max: null, confidence: null, note: 'La stima VO2max al momento è supportata solo per la corsa.' }
  }
  if (!profile?.hr_rest || !profile?.hr_max) {
    return { vo2max: null, confidence: null, note: 'Servono FC riposo e FC massima nel profilo per stimare il VO2max.' }
  }
  return estimateVo2max(record, { hrRest: profile.hr_rest, hrMax: profile.hr_max, sex: profile.sex })
}

// Fase 1: legge e interpreta il file. NON calcola ancora il VO2max,
// perché per farlo serve sapere il tipo di attività — e per i file
// senza un indizio affidabile (es. molti .gpx) quel tipo lo conferma
// l'utente nell'interfaccia PRIMA che l'attività venga salvata.
export async function importActivityFile(file, profile) {
  const ext = file.name.split('.').pop().toLowerCase()
  let parsed
  if (ext === 'fit') {
    const buf = await file.arrayBuffer()
    parsed = parseFit(buf)
  } else if (ext === 'gpx') {
    parsed = parseGpx(await file.text())
  } else if (ext === 'tcx') {
    parsed = parseTcx(await file.text())
  } else {
    throw new Error('Formato non supportato. Carica un file .fit, .gpx o .tcx.')
  }

  const record = parsed.record
  const hrs = record.map((p) => p.hr).filter(Boolean)
  const paces = record.map((p) => p.paceSecPerKm).filter(Boolean)
  const avgHr = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null
  const maxHr = hrs.length ? Math.max(...hrs) : null
  const avgPace = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : null

  // Il carico allenante (TRIMP) è basato solo su FC/durata, non su
  // ritmo: a differenza del VO2max resta valido per qualunque sport,
  // quindi lo calcoliamo già qui indipendentemente dal tipo attività.
  const trimp = profile?.hr_rest && profile?.hr_max ? computeTrimp(record, { hrRest: profile.hr_rest, hrMax: profile.hr_max, sex: profile.sex }, parsed.durationS / 60) : null

  return {
    source: parsed.source,
    name: parsed.name || friendlyFallbackName(parsed.startedAt, parsed.source),
    started_at: parsed.startedAt,
    duration_s: Math.round(parsed.durationS || 0),
    distance_m: parsed.distanceM ? Math.round(parsed.distanceM) : null,
    avg_hr: avgHr ? Math.round(avgHr) : null,
    max_hr: maxHr,
    avg_pace_s_per_km: avgPace ? Math.round(avgPace) : null,
    training_load: trimp ? Math.round(trimp * 10) / 10 : null,
    detected_activity_type: guessActivityType(parsed.sportHint),
    record_stream: downsample(record),
    _record_full: record, // usato solo per calcolare il VO2max dopo la conferma del tipo, non viene salvato
  }
}
