-- ============================================================
-- Permesso mancante: il coach può cancellare le proprie note.
-- Da eseguire una sola volta in SQL Editor.
-- ============================================================

create policy "notes_delete" on coach_notes for delete
  using (coach_id = auth.uid());
