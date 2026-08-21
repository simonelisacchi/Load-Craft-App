// Scala colore condivisa: dal blu (sforzo/valore basso) al rosso
// (sforzo/valore alto). Usata sia dalla mappa del percorso sia dai
// grafici, per coerenza visiva in tutta l'app.
export function colorForIntensity(norm) {
  const hue = 210 - 210 * Math.min(1, Math.max(0, norm))
  return `hsl(${hue}, 75%, 50%)`
}
