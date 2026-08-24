// Il passo calcolato punto-per-punto da coordinate GPS (o da distanza
// cumulativa TCX) è molto rumoroso: il GPS "salta" di qualche metro anche
// stando fermi, e su intervalli brevi questo si traduce in un passo che
// sembra a scatti anche durante un tratto di corsa regolare. Una media
// mobile centrata leviga il segnale senza alterarne l'andamento generale.
export function smoothPace(record, windowSize = 5) {
  const half = Math.floor(windowSize / 2)
  return record.map((point, i) => {
    if (point.paceSecPerKm == null) return point
    const start = Math.max(0, i - half)
    const end = Math.min(record.length, i + half + 1)
    const window = record.slice(start, end).map((p) => p.paceSecPerKm).filter((v) => v != null && v > 0 && v < 1800)
    if (!window.length) return point
    const avg = window.reduce((a, b) => a + b, 0) / window.length
    return { ...point, paceSecPerKm: avg }
  })
}
