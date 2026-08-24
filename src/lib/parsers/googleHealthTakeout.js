// Parser per i file JSON dell'export di Google Takeout, sezione
// "Fitbit" (l'etichetta in Takeout non è ancora stata aggiornata al
// nuovo nome "Google Health", ma il contenuto è lo stesso).
//
// AVVISO IMPORTANTE: a differenza dei parser .fit/.gpx/.tcx (formati
// stabili e documentati), il formato esatto dei file Takeout non è
// verificabile da questo ambiente (nessun accesso di rete verso
// Google) ed è cambiato più volte nel tempo. Questo parser usa il
// NOME del file come indizio principale per capire che metrica
// contenga (FC riposo, HRV, sonno, respiro): nel formato Fitbit
// classico il contenuto JSON di questi file usa spesso la stessa
// "busta" generica { dateTime, value: { value: N } } per metriche
// diverse (FC riposo, passi, peso...), quindi il contenuto da solo
// non basta a distinguerle — il nome del file (es.
// "resting_heart_rate-2026-08-01.json") è il segnale affidabile.
// Per questo l'interfaccia mostra sempre un'anteprima prima di
// salvare: se il tuo export avesse nomi file diversi da quelli
// storici e qualcosa finisse tra i "non riconosciuti", si vede
// subito lì invece di sparire in silenzio.

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Le date nei file Fitbit classici sono "MM/DD/YY", quelle più recenti
// "YYYY-MM-DD" — normalizziamo entrambe a YYYY-MM-DD.
function normalizeDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (us) {
    let [, m, d, y] = us
    if (y.length === 2) y = (Number(y) > 70 ? '19' : '20') + y
    return `${y}-${pad2(m)}-${pad2(d)}`
  }
  return null
}

function findDate(obj) {
  for (const key of ['dateOfSleep', 'date', 'dateTime']) {
    if (obj[key] != null) {
      const d = normalizeDate(obj[key])
      if (d) return d
    }
  }
  if (obj.startTime) {
    const d = normalizeDate(obj.startTime)
    if (d) return d
  }
  // Alcuni file annidano la data dentro "value".
  if (obj.value && typeof obj.value === 'object' && obj.value.date) {
    const d = normalizeDate(obj.value.date)
    if (d) return d
  }
  return null
}

// Estrae un numero da un campo che a volte è diretto (value: 58) e a
// volte annidato (value: { value: 58 }) — entrambe le forme sono state
// usate in export Fitbit reali nel tempo.
function numFrom(v) {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'object') {
    if (typeof v.value === 'number') return v.value
    if (typeof v.value === 'string') return numFrom(v.value)
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Determina la metrica dal NOME del file (segnale primario, vedi nota
// in cima al file). Ritorna null se il nome non è tra quelli attesi:
// in quel caso il file finisce tra i "non riconosciuti" invece di
// essere interpretato a caso.
function metricFromFilename(filename) {
  const n = filename.toLowerCase()
  if (n.includes('sleep')) return 'sleep_h'
  if (n.includes('resting_heart_rate') || n.includes('resting heart rate')) return 'resting_hr'
  if (n.includes('heart_rate_variability') || n.includes('heart rate variability') || n.includes('hrv')) return 'hrv'
  if (n.includes('respiratory') || n.includes('breathing') || n.includes('respiration')) return 'respiration'
  return null
}

// Dato un singolo record e la metrica attesa per il file, prova a
// estrarre { date, value }. Ritorna null se il record non ha la forma
// giusta (es. manca la data, o non c'è nessun numero utilizzabile).
function extractForMetric(item, metric) {
  if (!item || typeof item !== 'object') return null
  const date = findDate(item)
  if (!date) return null

  if (metric === 'sleep_h') {
    if (item.minutesAsleep == null && !item.levels?.summary) return null
    const minutes = item.minutesAsleep ?? Object.values(item.levels?.summary || {}).reduce((a, s) => a + (s?.minutes || 0), 0)
    if (!minutes) return null
    return { date, value: Math.round((minutes / 60) * 10) / 10, isMainSleep: item.isMainSleep !== false }
  }

  if (metric === 'resting_hr') {
    const raw = item.restingHeartRate ?? item.value?.restingHeartRate ?? numFrom(item.value) ?? numFrom(item)
    const n = typeof raw === 'number' ? raw : numFrom(raw)
    if (n == null) return null
    return { date, value: Math.round(n) }
  }

  if (metric === 'hrv') {
    const raw = item.rmssd ?? item.dailyRmssd ?? item.value?.rmssd ?? item.value?.dailyRmssd ?? numFrom(item.value)
    const n = typeof raw === 'number' ? raw : numFrom(raw)
    if (n == null) return null
    return { date, value: Math.round(n * 10) / 10 }
  }

  if (metric === 'respiration') {
    const raw = item.breathingRate ?? item.value?.breathingRate ?? item.fullSleepSummary?.breathingRate ?? numFrom(item.value)
    const n = typeof raw === 'number' ? raw : numFrom(raw)
    if (n == null) return null
    return { date, value: Math.round(n * 10) / 10 }
  }

  return null
}

// Un file Takeout può essere un array diretto di record, oppure un
// oggetto che ne contiene uno da qualche parte (es. { "sleep": [...] }).
function findRecordArray(json) {
  if (Array.isArray(json)) return json
  if (json && typeof json === 'object') {
    for (const v of Object.values(json)) {
      if (Array.isArray(v) && v.length) return v
    }
  }
  return []
}

// files: FileList/array di File — ritorna { byDate: Map, diagnostics }
export async function parseTakeoutFiles(files) {
  const byDate = new Map() // date -> { sleep_h, resting_hr, hrv, respiration }
  const mainSleepSeen = new Set() // date già coperte da un isMainSleep -> ignora sonnellini extra
  let recognized = 0
  const unrecognizedFiles = []

  for (const file of files) {
    const metric = metricFromFilename(file.name)
    if (!metric) {
      unrecognizedFiles.push(file.name)
      continue
    }

    let json
    try {
      json = JSON.parse(await file.text())
    } catch {
      unrecognizedFiles.push(`${file.name} (non è un JSON valido)`)
      continue
    }
    const records = findRecordArray(json)
    if (!records.length) {
      unrecognizedFiles.push(file.name)
      continue
    }

    let recognizedInFile = 0
    for (const item of records) {
      const extracted = extractForMetric(item, metric)
      if (!extracted) continue
      recognizedInFile++

      if (metric === 'sleep_h') {
        if (mainSleepSeen.has(extracted.date) && !extracted.isMainSleep) continue // ignora sonnellini se abbiamo già il sonno principale
        if (extracted.isMainSleep) mainSleepSeen.add(extracted.date)
      }

      const day = byDate.get(extracted.date) || {}
      day[metric] = extracted.value
      byDate.set(extracted.date, day)
    }
    if (recognizedInFile) recognized += recognizedInFile
    else unrecognizedFiles.push(file.name)
  }

  return {
    byDate,
    diagnostics: {
      filesRead: files.length,
      recordsRecognized: recognized,
      daysFound: byDate.size,
      unrecognizedFiles,
    },
  }
}
