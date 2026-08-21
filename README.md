# Load Craft — Guida (versione V-1.17)

Questa guida presume che tu non abbia mai usato strumenti di sviluppo.
Segui i passaggi in ordine, uno alla volta. Ogni passaggio va fatto **una
sola volta** (a parte pubblicare aggiornamenti, spiegato in fondo).

## Cosa fa questa versione

- Tu (atleta) carichi le tue corse Garmin (`.fit`) o file `.gpx`/`.tcx`.
- L'app calcola in automatico VO2max stimato e carico di allenamento (ACWR).
- Il tuo coach vede i tuoi dati, ti scrive note (che puoi marcare come
  priorità, così le vedi in cima), e ti crea schede di allenamento su più
  settimane.
- Tu scegli a quali giorni della settimana corrispondono i giorni della
  scheda, e vedi un promemoria nell'app per l'allenamento di oggi.
- Tema chiaro, scuro, o automatico in base al sistema — si sceglie dal
  selettore in alto nella pagina, resta ricordato la volta successiva.
- Puoi fare un backup dei tuoi dati su un foglio Google Sheets tuo.
- Chiunque scarichi questo stesso codice e segua questa guida crea un
  ambiente **completamente separato dal tuo**: i dati non si mischiano mai.

**Non ancora incluso in questa versione** (vedi sezione "Prossimi passi"
in fondo): dati da Fitbit, notifiche push vere (per ora il promemoria
si vede solo aprendo l'app).

---

## Parte 1 — Crea il tuo database gratuito (Supabase)

Supabase è il servizio gratuito che conserva tutti i dati (utenti, corse,
note, schede). Ogni persona che pubblica questa app deve creare **il
proprio** progetto Supabase: è quello che garantisce che i tuoi dati non
si mischino con quelli di altri.

1. Vai su **supabase.com** e crea un account gratuito.
2. Crea un **nuovo progetto** (New Project). Scegli un nome a piacere e
   una password per il database (salvala da qualche parte, ma non ti
   servirà quasi mai direttamente).
3. Aspetta 1-2 minuti che il progetto sia pronto.
4. Nel menu a sinistra vai su **SQL Editor** → **New query**.
5. Apri il file `supabase/01_schema.sql` incluso in questo pacchetto,
   copiane tutto il contenuto, incollalo nell'editor e premi **Run**.
6. Ripeti lo stesso con `supabase/02_policies.sql` (nuova query, incolla,
   Run). Questo secondo file è quello che isola i dati tra utenti diversi
   — è la parte più importante per la sicurezza, non saltarla.
7. Vai su **Authentication → Providers** e assicurati che "Email" sia
   attivo (di default lo è).
8. Consiglio per la fase di test: in **Authentication → Settings**
   disattiva "Confirm email" (così puoi registrarti subito senza dover
   controllare la posta ogni volta). Quando l'app sarà definitiva potrai
   riattivarla.
9. Vai su **Project Settings → API**. Ti serviranno due valori tra poco:
   - **Project URL**
   - **anon public key**

---

## Parte 2 — Configura il codice sul tuo computer

1. Installa **Node.js** (una volta sola): vai su nodejs.org, scarica la
   versione "LTS" e installala come un programma qualsiasi (Avanti,
   Avanti, Fine).
2. Estrai lo zip di questo progetto in una cartella, es. sul Desktop.
3. Dentro la cartella trovi un file `.env.example`. Fanne una copia e
   rinominala in `.env` (esattamente così, con il punto davanti).
4. Apri `.env` con un editor di testo semplice (Blocco Note va bene) e
   incolla i due valori del punto 9 della Parte 1:
   ```
   VITE_SUPABASE_URL=https://il-tuo-progetto.supabase.co
   VITE_SUPABASE_ANON_KEY=la-tua-chiave-anon-public
   ```
   Salva il file.
5. Apri il **terminale** nella cartella del progetto:
   - Windows: apri la cartella, scrivi `cmd` nella barra dell'indirizzo e premi Invio.
   - Mac: apri l'app "Terminale", scrivi `cd ` (con lo spazio), trascina la cartella del progetto dentro la finestra, premi Invio.
6. Digita e premi Invio:
   ```
   npm install
   ```
   (la prima volta scarica alcuni componenti, richiede un minuto).
7. Poi digita:
   ```
   npm run dev
   ```
   Il terminale mostrerà un indirizzo tipo `http://localhost:5173` —
   aprilo nel browser. L'app è ora attiva sul tuo computer.

## Parte 3 — Primo utilizzo

1. Apri l'app, clicca **Registrati**. La **primissima persona** che si
   registra su questo progetto Supabase diventa automaticamente **coach**
   (tu, probabilmente, se vuoi testare tutto per primo — oppure fai
   registrare prima il tuo coach, come preferite).
2. Da coach, nella dashboard trovi **"Genera nuovo codice invito"**:
   generane uno e mandalo (WhatsApp, email, come preferisci) alla persona
   che deve registrarsi come atleta.
3. L'atleta va su **Registrati**, compila i dati e incolla il codice
   invito nell'apposito campo (oppure, se lo riceve dopo essersi già
   registrato, lo inserisce nella schermata "Attiva account").
4. Sia coach che atleta: andate su **Profilo** e inserite FC riposo e FC
   massima — senza questi due dati l'app non può calcolare VO2max e
   carico di allenamento.
5. L'atleta può ora caricare una corsa (`.fit`/`.gpx`/`.tcx`) dalla
   scheda "Panoramica".

---

## Parte 4 — Pubblicare su GitHub Pages (gratis, accessibile da telefono)

Finché usi `npm run dev` l'app gira solo sul tuo computer. Per usarla dal
telefono/fuori casa, pubblicala gratis su GitHub Pages.

1. Crea un account gratuito su **github.com**, se non ce l'hai già.
2. Crea un nuovo **repository** (pulsante verde "New"). Puoi tenerlo
   privato o pubblico — pubblico va benissimo: il codice è generico,
   nessun dato tuo è scritto dentro (i dati stanno solo su Supabase).
3. Carica tutti i file di questo progetto nel repository (dalla pagina
   del repository, "uploading an existing file" se preferisci farlo dal
   browser senza terminale, trascinando l'intera cartella).
4. Nel repository vai su **Settings → Secrets and variables → Actions**
   e crea 3 "New repository secret":
   - `VITE_SUPABASE_URL` → lo stesso valore del tuo `.env`
   - `VITE_SUPABASE_ANON_KEY` → lo stesso valore del tuo `.env`
   - `VITE_GOOGLE_CLIENT_ID` → solo se hai fatto la Parte 5 (Google Sheets); altrimenti lascialo vuoto o non crearlo
5. Vai su **Settings → Pages** e imposta "Source" su **GitHub Actions**.
6. Il file `.github/workflows/deploy.yml` incluso pubblica l'app
   automaticamente a ogni caricamento sul ramo `main`. Dopo pochi minuti,
   in Settings → Pages vedrai l'indirizzo pubblico del tuo sito
   (tipo `https://tuonome.github.io/nome-repo/`).

---

## Parte 5 — Backup su Google Sheets (opzionale, gratis)

1. Vai su **console.cloud.google.com**, crea un progetto gratuito.
2. Cerca "Google Sheets API" e cliccala **Enable**.
3. Vai su **Credentials → Create Credentials → OAuth client ID**.
   - Tipo applicazione: **Web application**.
   - In "Authorized JavaScript origins" aggiungi sia
     `http://localhost:5173` (per i test in locale) sia l'indirizzo
     GitHub Pages del punto 6 della Parte 4 (senza percorso finale, solo
     `https://tuonome.github.io`).
4. Copia il **Client ID** generato (finisce con `.apps.googleusercontent.com`).
5. Mettilo nel tuo `.env` locale come `VITE_GOOGLE_CLIENT_ID` e, se hai
   pubblicato su GitHub Pages, anche come Secret nel repository (Parte 4,
   punto 4) — poi ricarica la pagina delle Actions per ripubblicare.
6. In Google Drive, crea un foglio Google Sheets vuoto. Dall'URL del
   foglio copia l'ID (la parte tra `/d/` e `/edit`).
7. Nell'app, scheda "Profilo & backup" → incolla l'ID e premi
   "Sincronizza ora". La prima volta Google ti chiederà il permesso di
   scrivere su quel foglio.

---

## Aggiornare l'app in futuro

Quando ti consegnerò una versione nuova (es. V-1.1), sostituisci i file
nel repository GitHub (o nella cartella locale) con quelli nuovi — il
database Supabase resta lo stesso, quindi **non perdi nessun dato**: solo
lo schema (`01_schema.sql`) va rieseguito se una versione nuova aggiunge
tabelle, e te lo segnalerò sempre esplicitamente.

## Prossimi passi possibili (non in questa versione)

- **Dati Fitbit**: Fitbit dismette la sua Web API classica a settembre
  2026; il sostituto (Google Health API) richiede un token che si
  rinnova periodicamente, cosa che senza un piccolo server dedicato è
  scomoda da gestire in sicurezza. Se vuoi questi dati, la strada più
  semplice resta un inserimento manuale nel check-in giornaliero (già
  possibile oggi), oppure in futuro si può aggiungere un piccolo servizio
  gratuito (es. una funzione Supabase Edge) dedicato solo a questo.
- **Notifiche push vere** (che arrivano anche ad app chiusa): richiedono
  un servizio di invio push; ce ne sono di gratuiti (es. OneSignal) da
  collegare quando vorrai.
- Zone di ritmo personalizzate, debrief automatico in linguaggio
  naturale per ogni corsa, correlazione col meteo — idee già discusse,
  da prioritizzare dopo aver testato questa versione con il tuo coach.

## Nota sui dati caricati durante lo sviluppo

Nessun tuo dato reale (file .fit, credenziali) è stato conservato in
questo ambiente oltre alla sessione di lavoro: qui dentro non c'è alcun
database collegato, è solo codice pronto da collegare al tuo Supabase.
