// Backup su Google Sheets, eseguito interamente dal browser (nessun
// server nel mezzo). Usa Google Identity Services per ottenere un token
// di accesso temporaneo quando l'utente clicca "Sincronizza ora": niente
// refresh token da custodire da qualche parte, quindi niente backend
// necessario — al prezzo di dover ripetere il consenso ogni sessione.
//
// Richiede VITE_GOOGLE_CLIENT_ID nel file .env (vedi README per come
// crearlo gratuitamente su Google Cloud Console).

let tokenClient = null
let gsiLoaded = false

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (gsiLoaded) return resolve()
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => {
      gsiLoaded = true
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function getAccessToken() {
  await loadGsiScript()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('Manca VITE_GOOGLE_CLIENT_ID nel file .env — vedi README per crearlo.')

  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error))
        else resolve(resp.access_token)
      },
    })
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

async function ensureSheetHeader(spreadsheetId, token, range, header) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}!A1:Z1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  if (!data.values || !data.values.length) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}!A1:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [header] }),
      }
    )
  }
}

// Scrive (append) le attività non ancora sincronizzate. spreadsheetId
// va incollato dall'utente (URL del foglio Google) nella pagina Profilo.
export async function syncActivitiesToSheet(spreadsheetId, activities) {
  const token = await getAccessToken()
  await ensureSheetHeader(spreadsheetId, token, 'Attivita', [
    'Data', 'Nome', 'Tipo', 'Fonte', 'Durata (s)', 'Distanza (m)', 'FC media', 'FC max', 'Passo medio (s/km)', 'Carico (TRIMP)', 'VO2max stimato', 'Affidabilita',
  ])
  const rows = activities.map((a) => [
    a.started_at, a.name, a.activity_type, a.source, a.duration_s, a.distance_m, a.avg_hr, a.max_hr, a.avg_pace_s_per_km, a.training_load, a.vo2max_estimate, a.vo2max_confidence,
  ])
  if (!rows.length) return { synced: 0 }
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Attivita!A1:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    }
  )
  return { synced: rows.length }
}

export async function syncCheckinsToSheet(spreadsheetId, checkins) {
  const token = await getAccessToken()
  await ensureSheetHeader(spreadsheetId, token, 'CheckIn', ['Data', 'TQR', 'Sonno (h)', 'FC riposo', 'HRV', 'Respiro', 'Note'])
  const rows = checkins.map((c) => [c.the_date, c.tqr, c.sleep_h, c.resting_hr, c.hrv, c.respiration, c.note])
  if (!rows.length) return { synced: 0 }
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CheckIn!A1:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    }
  )
  return { synced: rows.length }
}
