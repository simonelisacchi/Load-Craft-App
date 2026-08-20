// Converte "Settimana N / Giorno N della scheda" in una data di calendario
// reale, usando la data di inizio della scheda e il giorno della
// settimana che l'atleta ha scelto per ogni "Giorno N".

export function itemDate(plan, mapping, item) {
  const wd = mapping[item.day_number]
  if (wd == null) return null
  const blockStart = new Date(plan.start_date + 'T00:00:00')
  blockStart.setDate(blockStart.getDate() + (item.week_number - 1) * 7)
  const blockWeekday = blockStart.getDay()
  const diff = (wd - blockWeekday + 7) % 7
  const d = new Date(blockStart)
  d.setDate(d.getDate() + diff)
  return d
}

export function isSameDay(a, b) {
  if (!a || !b) return false
  return a.toDateString() === b.toDateString()
}

export const WEEKDAY_LABELS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
