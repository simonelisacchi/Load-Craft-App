-- ============================================================
-- CORREZIONE — ricorsione infinita nella regola di profiles.
-- Da eseguire una sola volta, se avevi già eseguito 02_policies.sql
-- prima di questa correzione. Sostituisce solo la regola incriminata,
-- non tocca nessun dato.
-- ============================================================

create or replace function my_coach_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coach_id from profiles where id = auth.uid();
$$;

drop policy if exists "profiles_select" on profiles;

create policy "profiles_select" on profiles for select
  using (
    id = auth.uid()
    or coach_id = auth.uid()
    or id = my_coach_id()
  );
