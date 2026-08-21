-- ============================================================
-- SCHEMA DATABASE — App Analisi Corse (v1.0)
-- Da eseguire nell'SQL Editor del tuo progetto Supabase, IN ORDINE:
-- 1) questo file (01_schema.sql)
-- 2) 02_policies.sql
-- ============================================================

-- PROFILI (un profilo per ogni utente autenticato)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'pending' check (role in ('coach','athlete','pending')),
  coach_id uuid references profiles(id),
  full_name text,
  sex text check (sex in ('m','f',null)),
  weight_kg numeric,
  height_cm numeric,
  hr_rest int,
  hr_max int,
  created_at timestamptz not null default now()
);

-- Il primissimo utente che si registra su un progetto Supabase diventa
-- automaticamente coach (bootstrap one-shot). Tutti i successivi partono
-- come 'pending' finché non riscattano un codice invito valido.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists(select 1 from profiles) into is_first;
  insert into profiles (id, role, full_name)
  values (new.id, case when is_first then 'coach' else 'pending' end, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- INVITI monouso generati dal coach per far registrare un atleta
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references profiles(id),
  used_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Funzione che un nuovo utente 'pending' chiama subito dopo la
-- registrazione per attivarsi come atleta collegato al coach.
create or replace function redeem_invite(invite_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invites%rowtype;
begin
  select * into inv from invites where code = invite_code and used_by is null;
  if not found then
    raise exception 'Codice invito non valido o già usato';
  end if;

  update invites set used_by = auth.uid(), used_at = now() where id = inv.id;
  update profiles set role = 'athlete', coach_id = inv.created_by where id = auth.uid();
end;
$$;

-- ATTIVITÀ (corse importate da file)
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source text not null check (source in ('fit_upload','gpx_upload','tcx_upload')),
  name text,
  started_at timestamptz,
  duration_s numeric,
  distance_m numeric,
  avg_hr numeric,
  max_hr numeric,
  avg_pace_s_per_km numeric,
  training_load numeric,
  vo2max_estimate numeric,
  vo2max_confidence text,
  record_stream jsonb, -- stream a bassa risoluzione [{t,hr,pace,alt}] usato per il calcolo VO2max
  created_at timestamptz not null default now()
);

-- CHECK-IN GIORNALIERI (TQR obbligatorio manuale; sonno/FC riposo/HRV/respiro
-- opzionali, inseribili a mano finché non c'è un dispositivo collegato)
create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  the_date date not null,
  tqr int check (tqr between 6 and 20),
  sleep_h numeric,
  resting_hr int,
  hrv numeric,
  respiration numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, the_date)
);

-- COMPOSIZIONE CORPOREA (plicometrie, inserite dal coach)
create table if not exists body_composition (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  the_date date not null default current_date,
  weight_kg numeric,
  skinfolds_mm jsonb, -- es. {"tricipite": 12, "sottoscapolare": 15}
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- NOTE DEL COACH (con livello di urgenza)
create table if not exists coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id),
  athlete_id uuid not null references profiles(id),
  body text not null,
  urgency text not null default 'normale' check (urgency in ('info','normale','attenzione','urgente')),
  priority boolean not null default false, -- mantenuta per compatibilità, non più usata dall'interfaccia
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- SCHEDE DI ALLENAMENTO
create table if not exists training_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id),
  athlete_id uuid not null references profiles(id),
  title text not null,
  weeks int not null,
  start_date date not null default current_date, -- da quando parte la "Settimana 1"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ogni riga = un allenamento assegnato a "Settimana N / Giorno N" (il
-- numero giorno è sequenziale nella settimana di allenamento del coach,
-- NON un giorno della settimana solare — quello lo sceglie l'atleta)
create table if not exists training_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references training_plans(id) on delete cascade,
  week_number int not null,
  day_number int not null,
  title text not null,
  description text,
  workout_type text,
  unique (plan_id, week_number, day_number)
);

-- Mappatura scelta dall'atleta: "Giorno N della scheda" -> giorno della
-- settimana solare (0=domenica..6=sabato)
create table if not exists athlete_day_mapping (
  plan_id uuid not null references training_plans(id) on delete cascade,
  day_number int not null,
  weekday int not null check (weekday between 0 and 6),
  primary key (plan_id, day_number)
);

-- Marcatura completamento allenamento + RPE post-corsa
create table if not exists workout_completions (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null references training_plan_items(id) on delete cascade,
  athlete_id uuid not null references profiles(id),
  completed_date date not null,
  rpe int check (rpe between 1 and 10),
  activity_id uuid references activities(id),
  created_at timestamptz not null default now(),
  unique (plan_item_id, completed_date)
);

create index if not exists idx_activities_user on activities(user_id);
create index if not exists idx_checkins_user_date on daily_checkins(user_id, the_date);
create index if not exists idx_notes_athlete on coach_notes(athlete_id);
create index if not exists idx_plans_athlete on training_plans(athlete_id);
create index if not exists idx_plan_items_plan on training_plan_items(plan_id);
