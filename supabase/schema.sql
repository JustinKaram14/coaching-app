-- ============================================================
-- COACHING APP — SUPABASE DATABASE SCHEMA
-- Führe dieses Script im Supabase SQL Editor aus
-- ============================================================

-- PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  role text not null default 'client' check (role in ('coach', 'client')),
  coach_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  last_active timestamptz
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Coach can view client profiles" on public.profiles
  for select using (auth.uid() = coach_id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on sign-up trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update last_active on profile access
create or replace function public.update_last_active()
returns trigger as $$
begin
  update public.profiles set last_active = now() where id = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

-- INVITE CODES
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  used_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.invite_codes enable row level security;

create policy "Coaches can manage own invite codes" on public.invite_codes
  for all using (auth.uid() = coach_id);
create policy "Anyone can read unused codes (for registration)" on public.invite_codes
  for select using (true);

-- CLIENT SETTINGS
create table if not exists public.client_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  kalorie_tagesziel integer default 2000,
  trainings_pro_woche integer default 4,
  startdatum date,
  startgewicht numeric(5,2),
  zielgewicht numeric(5,2),
  schlaf_ziel numeric(3,1) default 8,
  koerpergroesse numeric(5,1),
  alter_jahre integer,
  updated_at timestamptz not null default now()
);

alter table public.client_settings enable row level security;

create policy "Users can manage own settings" on public.client_settings
  for all using (auth.uid() = user_id);
create policy "Coach can view client settings" on public.client_settings
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

-- GEWICHT (WEIGHT)
create table if not exists public.gewicht (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  datum date not null,
  gewicht numeric(5,2) not null,
  notizen text,
  created_at timestamptz not null default now(),
  unique (user_id, datum)
);

alter table public.gewicht enable row level security;

create policy "Users can manage own weight" on public.gewicht
  for all using (auth.uid() = user_id);
create policy "Coach can view client weight" on public.gewicht
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

create index on public.gewicht (user_id, datum);

-- TRAINING
create table if not exists public.training (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  datum date not null,
  trainingstyp text,
  dauer_min integer,
  avg_puls integer,
  kalorien_verbrannt integer,
  notizen text,
  einheit_id text not null,
  created_at timestamptz not null default now()
);

alter table public.training enable row level security;

create policy "Users can manage own training" on public.training
  for all using (auth.uid() = user_id);
create policy "Coach can view client training" on public.training
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

create index on public.training (user_id, datum);

-- UEBUNGEN (EXERCISES)
create table if not exists public.uebungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  training_id uuid not null references public.training(id) on delete cascade,
  uebungsname text not null,
  saetze integer,
  wdh integer,
  gewicht_kg numeric(6,2),
  notizen text,
  created_at timestamptz not null default now()
);

alter table public.uebungen enable row level security;

create policy "Users can manage own exercises" on public.uebungen
  for all using (auth.uid() = user_id);
create policy "Coach can view client exercises" on public.uebungen
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

create index on public.uebungen (user_id, training_id);

-- SCHLAF (SLEEP)
create table if not exists public.schlaf (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  datum date not null,
  einschlafzeit time,
  aufwachzeit time,
  schlafqualitaet integer check (schlafqualitaet >= 1 and schlafqualitaet <= 10),
  notizen text,
  created_at timestamptz not null default now(),
  unique (user_id, datum)
);

alter table public.schlaf enable row level security;

create policy "Users can manage own sleep" on public.schlaf
  for all using (auth.uid() = user_id);
create policy "Coach can view client sleep" on public.schlaf
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

create index on public.schlaf (user_id, datum);

-- ERNAEHRUNG (NUTRITION)
create table if not exists public.ernaehrung (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  datum date not null,
  kalorien integer,
  protein_g numeric(6,1),
  kohlenhydrate_g numeric(6,1),
  fett_g numeric(6,1),
  wasser_ml integer,
  notizen text,
  created_at timestamptz not null default now(),
  unique (user_id, datum)
);

alter table public.ernaehrung enable row level security;

create policy "Users can manage own nutrition" on public.ernaehrung
  for all using (auth.uid() = user_id);
create policy "Coach can view client nutrition" on public.ernaehrung
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

create index on public.ernaehrung (user_id, datum);

-- SUPPLEMENTS
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  beschreibung text,
  dosierung text,
  zeitpunkt text,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.supplements enable row level security;

create policy "Users can manage own supplements" on public.supplements
  for all using (auth.uid() = user_id);
create policy "Coach can view client supplements" on public.supplements
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

-- SUPPLEMENT LOG
create table if not exists public.supplement_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  datum date not null,
  eingenommen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (supplement_id, datum)
);

alter table public.supplement_log enable row level security;

create policy "Users can manage own supplement log" on public.supplement_log
  for all using (auth.uid() = user_id);
create policy "Coach can view client supplement log" on public.supplement_log
  for select using (
    exists (select 1 from public.profiles where id = user_id and coach_id = auth.uid())
  );

-- KALENDER EVENTS
create table if not exists public.kalender_events (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id),
  titel text not null,
  datum date not null,
  uhrzeit time,
  dauer_min integer,
  typ text not null default 'training' check (typ in ('coaching', 'training', 'sonstiges')),
  notizen text,
  created_at timestamptz not null default now()
);

alter table public.kalender_events enable row level security;

create policy "Coach can manage own events" on public.kalender_events
  for all using (auth.uid() = coach_id);
create policy "Clients can manage own events" on public.kalender_events
  for all using (auth.uid() = client_id);
create policy "Clients can view coach events" on public.kalender_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and coach_id = kalender_events.coach_id)
  );

create index on public.kalender_events (coach_id, datum);
create index on public.kalender_events (client_id, datum);

-- ============================================================
-- RATE LIMITING: Supabase has built-in rate limiting.
-- Additional: Add this extension for extra protection.
-- ============================================================

-- Enable pg_cron and pg_net if needed for scheduled tasks
-- These are available in Supabase Pro tier

-- ============================================================
-- INITIAL COACH ACCOUNT
-- After running this schema, manually create a coach account:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Create user with email/password
-- 3. Run: UPDATE public.profiles SET role = 'coach' WHERE email = 'your@email.com';
-- ============================================================
