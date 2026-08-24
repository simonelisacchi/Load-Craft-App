// Tipi di attività supportati e mappature per riconoscerli dai file
// importati. Il VO2max (src/lib/vo2max.js) è basato su equazioni di
// "economia di corsa": ha senso SOLO per activity_type === 'corsa'.
// Per tutti gli altri tipi va lasciato null, altrimenti restituisce
// numeri senza senso (es. una pedalata letta come corsa).

export const ACTIVITY_TYPES = [
  { value: 'corsa', label: 'Corsa', icon: '🏃' },
  { value: 'ciclismo', label: 'Ciclismo', icon: '🚴' },
  { value: 'camminata', label: 'Camminata', icon: '🚶' },
  { value: 'trekking', label: 'Trekking', icon: '🥾' },
  { value: 'nuoto', label: 'Nuoto', icon: '🏊' },
  { value: 'altro', label: 'Altro', icon: '⚡' },
]

export function activityTypeLabel(value) {
  return ACTIVITY_TYPES.find((t) => t.value === value)?.label || 'Altro'
}

export function activityTypeIcon(value) {
  return ACTIVITY_TYPES.find((t) => t.value === value)?.icon || '⚡'
}

// Mappa dell'enum "sport" del formato .fit — dal FIT SDK pubblico
// (Garmin, usato anche da Wahoo/Zwift). Copre i valori più comuni;
// qualunque codice non mappato qui ricade su 'altro' invece di essere
// indovinato a caso, per non introdurre nuove classificazioni sbagliate.
const FIT_SPORT_MAP = {
  1: 'corsa',
  2: 'ciclismo',
  5: 'nuoto',
  11: 'camminata',
  17: 'trekking',
  21: 'ciclismo', // e-biking
}

// Mappa dell'attributo Sport="..." del formato .tcx (Garmin Connect
// esporta tipicamente "Running", "Biking", "Other").
const TCX_SPORT_MAP = {
  running: 'corsa',
  biking: 'ciclismo',
  cycling: 'ciclismo',
  swimming: 'nuoto',
  walking: 'camminata',
  hiking: 'trekking',
}

// Mappa del testo libero dentro <trk><type> nei file .gpx — campo
// opzionale e non standardizzato, quindi trattato come indizio debole:
// se non è presente o non è riconosciuto, non tentiamo di indovinare.
const GPX_TYPE_MAP = {
  running: 'corsa',
  run: 'corsa',
  corsa: 'corsa',
  cycling: 'ciclismo',
  biking: 'ciclismo',
  bike: 'ciclismo',
  ciclismo: 'ciclismo',
  walking: 'camminata',
  walk: 'camminata',
  camminata: 'camminata',
  hiking: 'trekking',
  hike: 'trekking',
  trekking: 'trekking',
  swimming: 'nuoto',
  swim: 'nuoto',
  nuoto: 'nuoto',
}

// sportHint: { kind: 'fit'|'tcx'|'gpx', raw: number|string|null }
// Ritorna un tipo attività valido, o null se non siamo riusciti a
// dedurlo dal file (in quel caso l'utente lo conferma a mano
// nell'interfaccia di caricamento).
export function guessActivityType(sportHint) {
  if (!sportHint || sportHint.raw == null) return null
  if (sportHint.kind === 'fit') return FIT_SPORT_MAP[sportHint.raw] || null
  if (sportHint.kind === 'tcx') return TCX_SPORT_MAP[String(sportHint.raw).toLowerCase()] || null
  if (sportHint.kind === 'gpx') return GPX_TYPE_MAP[String(sportHint.raw).toLowerCase().trim()] || null
  return null
}
