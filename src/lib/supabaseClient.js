import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Invece di lasciare che un URL/chiave sbagliati facciano fallire
// silenziosamente l'avvio dell'app (schermata bianca, senza indizi),
// prepariamo qui un messaggio d'errore chiaro che App.jsx può mostrare
// direttamente sullo schermo — utile soprattutto da tablet, dove aprire
// la console del browser per vedere l'errore è scomodo o impossibile.
export let supabase = null
export let configError = null

if (!url || !anonKey) {
  configError = 'Mancano le variabili VITE_SUPABASE_URL e/o VITE_SUPABASE_ANON_KEY. Controlla i Secrets del repository GitHub (Settings → Secrets and variables → Actions) o il file .env in locale.'
} else {
  try {
    // new URL(...) fa fallire subito con un messaggio chiaro se l'indirizzo
    // non è scritto in modo valido (es. manca "https://", spazi, ecc.)
    // eslint-disable-next-line no-new
    new URL(url)
    supabase = createClient(url, anonKey)
  } catch (e) {
    configError = `VITE_SUPABASE_URL non sembra un indirizzo valido: "${url}". Controlla di aver copiato l'intero Project URL (deve iniziare con https:// e finire in .supabase.co), senza spazi o virgolette in più. Dettaglio tecnico: ${e.message}`
  }
}
