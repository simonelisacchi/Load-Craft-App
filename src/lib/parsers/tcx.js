// Parser TCX: usa la distanza cumulativa già presente nel file (a
// differenza del GPX non serve ricalcolarla con Haversine).
import { smoothPace } from '../smoothing'

export function parseTcx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const points = Array.from(doc.getElementsByTagName('Trackpoint'))
  if (!points.length) throw new Error('Nessun Trackpoint trovato nel file TCX.')

  // Alcuni export Garmin Connect mettono il titolo dell'attività qui.
  const notesEl = doc.getElementsByTagName('Notes')[0]
  const activityName = notesEl?.textContent?.trim() || null

  // Il TCX porta il tipo di sport nell'attributo Sport del tag
  // <Activity>, es. Sport="Running" — a differenza del .fit non serve
  // decodificare un enum numerico, è già testo.
  const activityEl = doc.getElementsByTagName('Activity')[0]
  const sportAttr = activityEl?.getAttribute('Sport') || null

  const record = []
  let startTime = null
  let prevTime = null
  let prevDist = null
  let maxDist = 0

  for (const pt of points) {
    const timeEl = pt.getElementsByTagName('Time')[0]
    const distEl = pt.getElementsByTagName('DistanceMeters')[0]
    const hrEl = pt.getElementsByTagName('HeartRateBpm')[0]
    const altEl = pt.getElementsByTagName('AltitudeMeters')[0]
    const posEl = pt.getElementsByTagName('Position')[0]
    const lat = posEl ? parseFloat(posEl.getElementsByTagName('LatitudeDegrees')[0]?.textContent) : null
    const lon = posEl ? parseFloat(posEl.getElementsByTagName('LongitudeDegrees')[0]?.textContent) : null

    const time = timeEl ? new Date(timeEl.textContent) : null
    if (!startTime && time) startTime = time
    const dist = distEl ? parseFloat(distEl.textContent) : null
    if (dist !== null) maxDist = Math.max(maxDist, dist)
    const hr = hrEl ? parseFloat(hrEl.getElementsByTagName('Value')[0]?.textContent) : null
    const ele = altEl ? parseFloat(altEl.textContent) : null

    const t = time && startTime ? (time - startTime) / 1000 : record.length
    let paceSecPerKm = null
    if (prevTime && time && prevDist !== null && dist !== null) {
      const dt = (time - prevTime) / 1000
      const dd = dist - prevDist
      if (dd > 0.5) paceSecPerKm = dt / (dd / 1000)
    }

    record.push({
      t,
      hr: Number.isFinite(hr) ? hr : null,
      paceSecPerKm,
      grade: null,
      ele,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    })
    if (time) prevTime = time
    if (dist !== null) prevDist = dist
  }

  const durationS = record.length ? record[record.length - 1].t : 0
  const smoothed = smoothPace(record)

  return {
    source: 'tcx_upload',
    name: activityName,
    startedAt: startTime ? startTime.toISOString() : null,
    durationS,
    distanceM: maxDist,
    record: smoothed,
    sportHint: sportAttr ? { kind: 'tcx', raw: sportAttr } : null,
  }
}
