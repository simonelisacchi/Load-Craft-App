// Parser GPX: legge i punti traccia (lat/lon/ele/tempo), FC/cadenza dalle
// estensioni Garmin (namespace gpxtpx, ns3, o altri prefissi — cercata
// per nome locale così funziona con qualunque prefisso) e ricostruisce
// distanza (formula di Haversine) e ritmo.

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Cerca un elemento per nome locale, ignorando il prefisso del
// namespace (gpxtpx:hr, ns3:hr, ecc. sono tutti "hr" per noi).
function findByLocalName(root, name) {
  const all = root.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName && all[i].localName.toLowerCase() === name) return all[i]
  }
  return null
}

export function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const points = Array.from(doc.getElementsByTagName('trkpt'))
  if (!points.length) throw new Error('Nessun punto traccia trovato nel file GPX.')

  const record = []
  let totalDist = 0
  let prev = null
  let startTime = null

  for (const pt of points) {
    const lat = parseFloat(pt.getAttribute('lat'))
    const lon = parseFloat(pt.getAttribute('lon'))
    const eleEl = pt.getElementsByTagName('ele')[0]
    const timeEl = pt.getElementsByTagName('time')[0]
    const ele = eleEl ? parseFloat(eleEl.textContent) : null
    const time = timeEl ? new Date(timeEl.textContent) : null
    if (!startTime && time) startTime = time

    const hrEl = findByLocalName(pt, 'hr')
    const hr = hrEl ? parseFloat(hrEl.textContent) : null

    if (prev) {
      totalDist += haversineMeters(prev.lat, prev.lon, lat, lon)
    }

    const t = time && startTime ? (time - startTime) / 1000 : record.length
    const dt = prev && prev.time && time ? (time - prev.time) / 1000 : null
    const segDist = prev ? haversineMeters(prev.lat, prev.lon, lat, lon) : 0
    const paceSecPerKm = dt && segDist > 0.5 ? dt / (segDist / 1000) : null

    record.push({ t, lat, lon, ele, hr: Number.isFinite(hr) ? hr : null, paceSecPerKm, grade: null })
    prev = { lat, lon, time }
  }

  const durationS = record.length ? record[record.length - 1].t : 0

  return {
    source: 'gpx_upload',
    startedAt: startTime ? startTime.toISOString() : null,
    durationS,
    distanceM: totalDist,
    record,
  }
}
