-- ============================================================
-- Aggiunge le categorie di urgenza alle note del coach.
-- Da eseguire una sola volta in SQL Editor. Non cancella nulla: le note
-- già scritte vengono convertite automaticamente (priorità -> urgente,
-- normale -> normale), poi restano leggibili come sempre.
-- ============================================================

alter table coach_notes
  add column if not exists urgency text not null default 'normale'
  check (urgency in ('info', 'normale', 'attenzione', 'urgente'));

update coach_notes
  set urgency = case when priority then 'urgente' else 'normale' end;
