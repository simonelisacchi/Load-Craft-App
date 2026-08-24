-- ============================================================
-- MIGRAZIONE: tipo di attività (corsa/ciclismo/camminata/...)
-- Da eseguire nell'SQL Editor del progetto Supabase, DOPO aver già
-- applicato 01_schema.sql...05_notes_urgency.sql.
--
-- Perché serve: finora ogni file caricato veniva trattato come una
-- corsa, e la stima VO2max (valida solo per la corsa) veniva calcolata
-- anche su altri sport, con risultati senza senso. Da qui in avanti il
-- tipo va scelto/confermato al caricamento (vedi ActivityUpload.jsx).
--
-- Le attività già presenti non possono essere riclassificate in modo
-- automatico e affidabile da qui (non sappiamo con certezza cosa
-- fossero): vengono impostate su 'altro' come segnaposto neutro, NON
-- 'corsa' — le loro stime VO2max esistenti restano intatte per ora.
-- Apri ogni attività passata nel dettaglio e correggi il tipo dal menu
-- a tendina in alto: se la imposti su un tipo diverso da "corsa" il
-- VO2max eventualmente calcolato viene azzerato in automatico (era
-- comunque calcolato con la formula sbagliata, per quel tipo di sport);
-- se la imposti su "corsa" premi poi "Ricalcola" per essere sicuro che
-- il valore rispecchi l'algoritmo attuale.
-- ============================================================

alter table activities
  add column if not exists activity_type text;

update activities
  set activity_type = 'altro'
  where activity_type is null;

alter table activities
  alter column activity_type set default 'altro',
  alter column activity_type set not null;

alter table activities
  add constraint activities_activity_type_check
  check (activity_type in ('corsa','ciclismo','camminata','trekking','nuoto','altro'));

-- Aggiorna anche il vincolo su "source": i tipi di file restano quelli
-- di sempre (fit/gpx/tcx), non è cambiato nulla qui, la riga esiste
-- solo a scopo di controllo/documentazione — nessuna azione necessaria.
