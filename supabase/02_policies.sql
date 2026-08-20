-- ============================================================
-- RLS (Row Level Security) — isola i dati per ogni utente/coach.
-- Da eseguire DOPO 01_schema.sql
-- ============================================================

alter table profiles enable row level security;
alter table invites enable row level security;
alter table activities enable row level security;
alter table daily_checkins enable row level security;
alter table body_composition enable row level security;
alter table coach_notes enable row level security;
alter table training_plans enable row level security;
alter table training_plan_items enable row level security;
alter table athlete_day_mapping enable row level security;
alter table workout_completions enable row level security;

-- Funzione di supporto: l'utente corrente è il coach dell'atleta indicato?
create or replace function is_coach_of(athlete uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from profiles where id = athlete and coach_id = auth.uid()
  );
$$;

-- PROFILES: vedo il mio profilo, il profilo del mio coach, e (se sono
-- coach) i profili dei miei atleti.
create policy "profiles_select" on profiles for select
  using (
    id = auth.uid()
    or coach_id = auth.uid()
    or id = (select coach_id from profiles where id = auth.uid())
  );

create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());

-- INVITES: solo il coach vede/crea i propri inviti.
create policy "invites_select" on invites for select
  using (created_by = auth.uid());
create policy "invites_insert" on invites for insert
  with check (created_by = auth.uid() and exists(select 1 from profiles where id = auth.uid() and role = 'coach'));

-- ATTIVITÀ: l'atleta vede/scrive le proprie; il coach vede quelle dei suoi atleti.
create policy "activities_select" on activities for select
  using (user_id = auth.uid() or is_coach_of(user_id));
create policy "activities_insert" on activities for insert
  with check (user_id = auth.uid());
create policy "activities_update" on activities for update
  using (user_id = auth.uid());
create policy "activities_delete" on activities for delete
  using (user_id = auth.uid());

-- CHECK-IN: stessa logica.
create policy "checkins_select" on daily_checkins for select
  using (user_id = auth.uid() or is_coach_of(user_id));
create policy "checkins_upsert" on daily_checkins for insert
  with check (user_id = auth.uid());
create policy "checkins_update" on daily_checkins for update
  using (user_id = auth.uid());

-- COMPOSIZIONE CORPOREA: la inserisce il coach, la vede l'atleta + il coach.
create policy "bodycomp_select" on body_composition for select
  using (user_id = auth.uid() or is_coach_of(user_id));
create policy "bodycomp_insert" on body_composition for insert
  with check (is_coach_of(user_id) and created_by = auth.uid());

-- NOTE DEL COACH: le scrive solo il coach del destinatario; le legge
-- l'atleta destinatario e il coach che le ha scritte.
create policy "notes_select" on coach_notes for select
  using (athlete_id = auth.uid() or coach_id = auth.uid());
create policy "notes_insert" on coach_notes for insert
  with check (coach_id = auth.uid() and is_coach_of(athlete_id));
create policy "notes_update" on coach_notes for update
  using (athlete_id = auth.uid() or coach_id = auth.uid());

-- SCHEDE DI ALLENAMENTO: le crea/modifica solo il coach; le legge anche l'atleta.
create policy "plans_select" on training_plans for select
  using (athlete_id = auth.uid() or coach_id = auth.uid());
create policy "plans_insert" on training_plans for insert
  with check (coach_id = auth.uid() and is_coach_of(athlete_id));
create policy "plans_update" on training_plans for update
  using (coach_id = auth.uid());

create policy "plan_items_select" on training_plan_items for select
  using (exists(select 1 from training_plans p where p.id = plan_id and (p.athlete_id = auth.uid() or p.coach_id = auth.uid())));
create policy "plan_items_insert" on training_plan_items for insert
  with check (exists(select 1 from training_plans p where p.id = plan_id and p.coach_id = auth.uid()));
create policy "plan_items_update" on training_plan_items for update
  using (exists(select 1 from training_plans p where p.id = plan_id and p.coach_id = auth.uid()));
create policy "plan_items_delete" on training_plan_items for delete
  using (exists(select 1 from training_plans p where p.id = plan_id and p.coach_id = auth.uid()));

-- MAPPATURA GIORNI: la sceglie l'atleta, ma sia coach che atleta la leggono.
create policy "daymap_select" on athlete_day_mapping for select
  using (exists(select 1 from training_plans p where p.id = plan_id and (p.athlete_id = auth.uid() or p.coach_id = auth.uid())));
create policy "daymap_upsert" on athlete_day_mapping for insert
  with check (exists(select 1 from training_plans p where p.id = plan_id and p.athlete_id = auth.uid()));
create policy "daymap_update" on athlete_day_mapping for update
  using (exists(select 1 from training_plans p where p.id = plan_id and p.athlete_id = auth.uid()));

-- COMPLETAMENTO ALLENAMENTI: lo segna l'atleta; lo vede anche il coach.
create policy "completions_select" on workout_completions for select
  using (athlete_id = auth.uid() or is_coach_of(athlete_id));
create policy "completions_insert" on workout_completions for insert
  with check (athlete_id = auth.uid());
create policy "completions_update" on workout_completions for update
  using (athlete_id = auth.uid());
