# Load Craft — Guida (versione V-1.20)

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
- Puoi importare sonno, FC a riposo, HRV e respiro dal tuo Fitbit Air
  esportandoli da Google Takeout (una tantum, da ripetere quando vuoi
  dati aggiornati — vedi sezione dedicata più sotto).
- Chiunque scarichi questo stesso codice e segua questa guida crea un
  ambiente **completamente separato dal tuo**: i dati non si mischiano mai.

**Non ancora incluso in questa versione** (vedi sezione "Prossimi passi"
in fondo): dati da Fitbit, notifiche push vere (per ora il promemoria
si vede solo aprendo l'app).

---

## Novità della V-1.20 — tipo di attività

Prima, ogni file caricato veniva trattato come una corsa: se caricavi un
giro in bici, l'app provava comunque a stimarne il VO2max con la formula
per la corsa, ottenendo numeri senza senso (es. 177). Da questa versione:

- L'app prova a **riconoscere il tipo di attività** dal file (corsa,
  ciclismo, camminata, trekking, nuoto), e te lo fa **confermare o
  correggere** prima di salvare — i file `.gpx` spesso non contengono
  questa informazione, in quel caso te la chiede direttamente.
- Il **VO2max viene calcolato solo per le attività di tipo "Corsa"**: per
  tutti gli altri tipi resta vuoto, con la spiegazione visibile nel
  dettaglio dell'attività.
- **Le attività caricate con le versioni precedenti** vanno riclassificate
  a mano una volta: apri ogni attività dal suo dettaglio, correggi il tipo
  dal menu a tendina in alto (se non era una corsa, il VO2max sbagliato
  viene tolto in automatico appena cambi il tipo).

**Prima di usare questa versione, devi eseguire una nuova migrazione**:
apri l'SQL Editor del tuo progetto Supabase ed esegui il contenuto del
file `supabase/06_activity_type.sql` (una volta sola, dopo gli script che
hai già eseguito in passato). Senza questo passaggio l'app non trova la
colonna nuova e il caricamento di attività non funziona.

## Novità della V-1.20 — import dati dal Fitbit Air

Nella scheda "Check-in" trovi ora anche "Importa da Google Takeout": ti
permette di portare dentro l'app sonno, FC a riposo, HRV e respiro
registrati dal tuo Fitbit Air, senza dover collegare account o gestire
token — solo file scaricati da te.

**Come funziona, passo passo:**
1. Vai su [takeout.google.com](https://takeout.google.com).
2. Clicca "Deseleziona tutto", poi spunta solo **"Fitbit"** (si chiama
   ancora così in Takeout anche se l'app sul telefono oggi è "Google
   Health" — è la stessa cosa, il nome in Takeout non è stato ancora
   aggiornato).
3. Scegli formato **JSON**, crea l'archivio. Arriva un'email quando è
   pronto (di solito pochi minuti).
4. Scarica ed estrai lo zip sul computer o sul telefono.
5. Nell'app, scheda "Check-in" → "Importa da Google Takeout": seleziona
   (anche più di uno insieme) i file JSON dentro le cartelle **Sleep**,
   **Heart Rate** (FC riposo) e, se presenti, **Heart Rate Variability**
   e la cartella del respiro.
6. L'app ti mostra un'**anteprima** giorno per giorno prima di salvare
   nulla — controllala (i numeri devono somigliare a quello che ricordi:
   ore di sonno, FC a riposo) e poi conferma.
7. Il TQR e le note che inserisci a mano ogni giorno **non vengono mai
   toccati** da questo import: solo sonno/FC riposo/HRV/respiro.

**Un avviso di onestà**: il formato esatto dei file Takeout non è
documentato in modo stabile da Google e non ho potuto verificarlo dal
vivo in questo ambiente (nessun accesso di rete verso Google). Il
parser riconosce il formato Fitbit storico (stabile da anni) tramite il
nome dei file — se in futuro Google cambiasse i nomi delle cartelle o la
struttura, alcuni file potrebbero comparire come "non riconosciuti"
nell'anteprima invece di essere importati: in quel caso fammelo sapere
con un paio di quei file come esempio e sistemo il parser.

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
lo schema (i file numerati in `supabase/`, es. `01_schema.sql`) va
rieseguito se una versione nuova ne aggiunge uno nuovo, e te lo segnalerò
sempre esplicitamente (per questa versione: `06_activity_type.sql`, vedi
sopra).

## Prossimi passi possibili (non in questa versione)

- **Sincronizzazione automatica dal Fitbit Air** (senza dover scaricare
  ed importare file a mano ogni volta): richiede la nuova Google Health
  API con un token OAuth che si rinnova periodicamente, cosa che senza
  un piccolo server dedicato è scomoda da gestire in sicurezza (una
  funzione Supabase Edge, gratuita nella fascia base, farebbe al caso).
  Per ora c'è l'import manuale da Google Takeout (vedi sopra), che copre
  la stessa esigenza con un passaggio in più da ripetere ogni volta.
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
