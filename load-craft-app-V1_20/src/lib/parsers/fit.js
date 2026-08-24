// Parser minimale del formato binario Garmin .fit, scritto per leggere
// direttamente nel browser (senza librerie esterne). Legge i messaggi
// "record" (global message #20), che contengono lo stream a 1Hz di
// FC/velocità/distanza/altitudine — sufficiente per gli algoritmi
// VO2max e ACWR. Formato usato anche da Wahoo/Zwift, non solo Garmin.
// Riferimento: FIT SDK pubblico (Garmin), tabelle base type e campi
// standard del messaggio "record".

const FIT_EPOCH_OFFSET = 631065600 // secondi tra 1970-01-01 e 1989-12-31

const BASE_TYPES = {
  0x00: { size: 1, read: 'uint8' },
  0x01: { size: 1, read: 'int8' },
  0x02: { size: 1, read: 'uint8' },
  0x83: { size: 2, read: 'int16' },
  0x84: { size: 2, read: 'uint16' },
  0x85: { size: 4, read: 'int32' },
  0x86: { size: 4, read: 'uint32' },
  0x07: { size: 1, read: 'string' },
  0x88: { size: 4, read: 'float32' },
  0x89: { size: 8, read: 'float64' },
  0x0a: { size: 1, read: 'uint8' },
  0x8b: { size: 2, read: 'uint16' },
  0x8c: { size: 4, read: 'uint32' },
  0x0d: { size: 1, read: 'byte' },
  0x8e: { size: 8, read: 'int32' }, // int64 non gestito a piena precisione, non serve qui
  0x8f: { size: 8, read: 'uint32' },
  0x90: { size: 8, read: 'uint32' },
}

function readField(view, offset, baseTypeByte, size, littleEndian) {
  const bt = BASE_TYPES[baseTypeByte] || { size: 1, read: 'uint8' }
  const n = Math.max(1, Math.floor(size / bt.size))
  if (n > 1 && bt.read !== 'string') {
    // campo array: prendiamo solo il primo valore utile (sufficiente per i campi che ci servono)
  }
  try {
    switch (bt.read) {
      case 'uint8':
        return view.getUint8(offset)
      case 'int8':
        return view.getInt8(offset)
      case 'uint16':
        return view.getUint16(offset, littleEndian)
      case 'int16':
        return view.getInt16(offset, littleEndian)
      case 'uint32':
        return view.getUint32(offset, littleEndian)
      case 'int32':
        return view.getInt32(offset, littleEndian)
      case 'float32':
        return view.getFloat32(offset, littleEndian)
      case 'float64':
        return view.getFloat64(offset, littleEndian)
      case 'string': {
        let s = ''
        for (let i = 0; i < size; i++) {
          const c = view.getUint8(offset + i)
          if (c === 0) break
          s += String.fromCharCode(c)
        }
        return s
      }
      default:
        return view.getUint8(offset)
    }
  } catch {
    return null
  }
}

// Campi del messaggio "record" (global #20) che ci interessano
const RECORD_FIELDS = {
  253: 'timestamp',
  0: 'position_lat',
  1: 'position_long',
  2: 'altitude',
  3: 'heart_rate',
  4: 'cadence',
  5: 'distance',
  6: 'speed',
  78: 'enhanced_altitude',
  73: 'enhanced_speed',
}

// Campo "sport" del messaggio "session" (global #18) — dice che tipo di
// attività è (corsa/ciclismo/nuoto/...), a differenza del messaggio
// "record" che contiene solo lo stream FC/velocità/posizione.
const SESSION_FIELDS = {
  5: 'sport',
}

export function parseFit(arrayBuffer) {
  try {
    return parseFitInner(arrayBuffer)
  } catch (err) {
    if (err.message?.includes('Nessun dato')) throw err // messaggio già chiaro, non serve avvolgerlo
    throw new Error(`Impossibile leggere questo file .fit (formato inatteso o file danneggiato). Dettaglio tecnico: ${err.message}`)
  }
}

function parseFitInner(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  const headerSize = view.getUint8(0)
  const dataSize = view.getUint32(4, true)
  const dataStart = headerSize
  const dataEnd = dataStart + dataSize

  const localDefs = {} // localMessageType -> { globalNum, littleEndian, fields:[{num,size,base}] }
  const records = []
  let offset = dataStart
  let lastTimestamp = null
  let sportRaw = null

  while (offset < dataEnd && offset < view.byteLength) {
    let headerByte
    try {
      headerByte = view.getUint8(offset)
    } catch {
      break // file troncato: ci fermiamo qui, teniamo quello che abbiamo già letto
    }
    offset += 1

    const isCompressedTimestamp = (headerByte & 0x80) !== 0

    try {
      if (isCompressedTimestamp) {
        const localType = (headerByte >> 5) & 0x03
        const timeOffset = headerByte & 0x1f
        const def = localDefs[localType]
        if (!def) break
        const msg = readDataMessage(view, offset, def)
        offset += def.messageSize
        if (lastTimestamp !== null) {
          let ts = (lastTimestamp & ~0x1f) | timeOffset
          if (ts < lastTimestamp) ts += 32
          lastTimestamp = ts
          msg.fields.timestamp = ts
        }
        if (def.globalNum === 20) records.push(toRecordPoint(msg.fields))
        if (def.globalNum === 18 && msg.fields.sport != null) sportRaw = msg.fields.sport
        continue
      }

      const isDefinition = (headerByte & 0x40) !== 0
      const localType = headerByte & 0x1f // 5 bit (bit 4-0), non 4: errore corretto

      if (isDefinition) {
        const devFlag = (headerByte & 0x20) !== 0
        offset += 1 // reserved
        const arch = view.getUint8(offset)
        offset += 1
        const littleEndian = arch === 0
        const globalNum = view.getUint16(offset, littleEndian)
        offset += 2
        const numFields = view.getUint8(offset)
        offset += 1
        const fields = []
        for (let i = 0; i < numFields; i++) {
          const num = view.getUint8(offset)
          const size = view.getUint8(offset + 1)
          const base = view.getUint8(offset + 2)
          fields.push({ num, size, base })
          offset += 3
        }
        if (devFlag) {
          const numDev = view.getUint8(offset)
          offset += 1
          offset += numDev * 3 // field num, size, dev index — ignorati
        }
        const messageSize = fields.reduce((a, f) => a + f.size, 0)
        if (messageSize <= 0) break // definizione senza campi utili: meglio fermarsi che entrare in un ciclo bloccato
        localDefs[localType] = { globalNum, littleEndian, fields, messageSize }
        continue
      }

      // data message
      const def = localDefs[localType]
      if (!def) break
      const msg = readDataMessage(view, offset, def)
      offset += def.messageSize
      if (msg.fields.timestamp) lastTimestamp = msg.fields.timestamp
      if (def.globalNum === 20) records.push(toRecordPoint(msg.fields))
      if (def.globalNum === 18 && msg.fields.sport != null) sportRaw = msg.fields.sport
    } catch {
      // Byte fuori dai limiti del file: interrompiamo la lettura qui,
      // ma teniamo tutti i punti "record" letti fino a questo momento
      // invece di far fallire l'intero caricamento.
      break
    }
  }

  if (!records.length) throw new Error('Nessun dato "record" trovato nel file .fit (file non valido o non un allenamento).')

  const t0 = records[0].timestampRaw
  const stream = records.map((r) => ({
    t: r.timestampRaw - t0,
    hr: r.hr,
    paceSecPerKm: r.speed && r.speed > 0.3 ? 1000 / r.speed : null,
    grade: null,
    distance: r.distance,
    lat: r.lat,
    lon: r.lon,
    ele: r.altitude,
  }))

  const last = records[records.length - 1]
  const startedAt = new Date((t0 + FIT_EPOCH_OFFSET) * 1000).toISOString()

  return {
    source: 'fit_upload',
    startedAt,
    durationS: last.timestampRaw - t0,
    distanceM: last.distance || null,
    record: stream,
    sportHint: sportRaw != null ? { kind: 'fit', raw: sportRaw } : null,
  }
}

function readDataMessage(view, offset, def) {
  // I numeri di campo sono significativi solo all'interno dello stesso
  // tipo di messaggio: il campo 5 è "distance" nel messaggio "record"
  // (#20) ma "sport" nel messaggio "session" (#18). Prima non veniva
  // fatta questa distinzione, quindi la lettura del tipo di sport non
  // era proprio possibile.
  const fieldMap = def.globalNum === 18 ? SESSION_FIELDS : def.globalNum === 20 ? RECORD_FIELDS : null
  const fields = {}
  let o = offset
  for (const f of def.fields) {
    const name = fieldMap ? fieldMap[f.num] : null
    const raw = readField(view, o, f.base, f.size, def.littleEndian)
    if (name) fields[name] = raw
    o += f.size
  }
  return { fields }
}

function toRecordPoint(f) {
  const altRaw = f.enhanced_altitude ?? f.altitude
  const SEMI_TO_DEG = 180 / 2 ** 31
  const lat = f.position_lat != null ? f.position_lat * SEMI_TO_DEG : null
  const lon = f.position_long != null ? f.position_long * SEMI_TO_DEG : null
  return {
    timestampRaw: f.timestamp,
    hr: f.heart_rate && f.heart_rate !== 0xff ? f.heart_rate : null,
    speed: (f.enhanced_speed ?? f.speed) != null ? (f.enhanced_speed ?? f.speed) / 1000 : null,
    distance: f.distance != null ? f.distance / 100 : null,
    altitude: altRaw != null ? altRaw / 5 - 500 : null,
    lat, lon,
  }
}
