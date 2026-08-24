# Pubblicare e usare l'app da solo tablet Android (nessun PC)

Tutta la procedura si fa dal browser **Chrome** del tablet. L'unico punto
delicato è caricare su GitHub i file del progetto: da tablet non
conviene selezionarli uno a uno, quindi qui sotto trovi due modi per
evitarlo. Scegli quello che preferisci.

---

## Parte 0 — Supabase (uguale su qualunque dispositivo)

Questa parte è già interamente dal browser, nessuna differenza rispetto
a un PC: segui la "Parte 1" del file `README.md` (creare il progetto
Supabase ed eseguire i due file `.sql`). Fallo pure ora dal tablet.

---

## Parte 1 — Portare il codice su GitHub

### Opzione A — più veloce: lo carico io al posto tuo

Mi basta un accesso temporaneo e limitato al tuo account GitHub, che poi
revochi subito dopo.

1. Su github.com crea un account (se non l'hai) e poi un **nuovo
   repository vuoto** (pulsante verde "New"): dagli un nome, es.
   `app-corse`, lascialo "Public", **non** spuntare "Add a README".
2. Vai su **github.com/settings/tokens?type=beta** (Developer settings →
   Personal access tokens → Fine-grained tokens) → **Generate new token**.
3. Impostalo così:
   - Expiration: **7 days** (scade da solo, meglio per sicurezza)
   - Repository access: **Only select repositories** → scegli il
     repository appena creato (es. `app-corse`)
   - Permissions → **Contents**: imposta su **Read and write**
4. Genera il token e copia la stringa lunga che inizia con `github_pat_…`
   (si vede una sola volta).
5. Incollamela qui in chat, insieme al nome del repository (es.
   `tuonomeutente/app-corse`). Carico io tutti i file.
6. Appena confermo che ho finito, torna su
   github.com/settings/tokens?type=beta ed **elimina** quel token: non
   serve più.

### Opzione B — senza condividere token: GitHub Codespaces

Se preferisci non condividere un token, GitHub ti dà gratis un computer
nel cloud con un terminale, usabile dal browser del tablet.

1. Crea comunque un repository vuoto come al punto 1 sopra.
2. Nella pagina del repository tocca il pulsante verde **Code** →
   scheda **Codespaces** → **Create codespace on main**. Dopo un minuto
   si apre un editor con un terminale in basso (se non si vede: menu ☰ →
   Terminal → New Terminal).
3. Scarica lo zip dell'app sul tablet (dal link che ti ho dato in
   chat), poi nell'editor: pannello file a sinistra → tasto destro (o
   tieni premuto) → **Upload...** → scegli lo zip `run-analytics-app-V1.1.zip`
   dal tablet.
4. Nel terminale, incolla ed esegui questi comandi uno alla volta:
   ```
   unzip run-analytics-app-V1.1.zip
   cp -r app/. .
   rm -rf app run-analytics-app-V1.1.zip
   git add -A
   git commit -m "v1.1"
   git push
   ```
5. Puoi chiudere il Codespace: il codice è ormai su GitHub.

---

## Parte 2 — Attivare la pubblicazione (uguale su qualunque dispositivo)

Come da `README.md`, Parte 4, punti 4-6, dal browser:

1. Repository → **Settings → Secrets and variables → Actions** → crea i
   3 secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, e
   `VITE_GOOGLE_CLIENT_ID` se usi il backup Sheets).
2. Repository → **Settings → Pages** → Source: **GitHub Actions**.
3. Repository → scheda **Actions**: dopo pochi minuti dal push vedrai
   un'esecuzione con segno di spunta verde. Quando è verde, in
   **Settings → Pages** compare l'indirizzo pubblico del sito.

---

## Parte 3 — Installare l'app sul tablet (e su qualsiasi altro dispositivo)

Da questa versione l'app è impostata per potersi installare come una
vera app, senza passare da nessun app store:

1. Apri l'indirizzo pubblico (quello di Settings → Pages) in **Chrome**
   sul tablet.
2. Tocca i tre puntini in alto a destra (⋮) → **"Installa app"** (su
   alcuni Android si chiama **"Aggiungi a schermata Home"**).
3. Conferma: comparirà un'icona sulla home del tablet, e aprendola
   l'app occupa tutto lo schermo, senza barra del browser — si comporta
   come un'app normale.

Lo stesso indirizzo funziona su **qualsiasi dispositivo**: telefono
Android, iPhone/iPad (Safari → icona Condividi → "Aggiungi a Home"),
PC. Non serve "scaricarla" da un app store da nessuna parte: chiunque
abbia l'indirizzo e un codice invito valido può installarla così, e
vedrà solo i propri dati (isolati per il meccanismo spiegato nel
`README.md`).

**Promemoria**: aggiornare l'app in futuro (nuove versioni) userà
sempre la stessa Parte 1 qui sopra — sostituendo i file nel
repository, non serve reinstallarla sul tablet: si aggiorna da sola
al prossimo avvio, come un sito web normale.
