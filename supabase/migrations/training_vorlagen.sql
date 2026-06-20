-- Training Templates
create table if not exists public.training_vorlagen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  trainingstyp text,
  created_at timestamptz not null default now()
);

create table if not exists public.vorlagen_uebungen (
  id uuid primary key default gen_random_uuid(),
  vorlage_id uuid not null references public.training_vorlagen(id) on delete cascade,
  uebungsname text not null,
  saetze integer,
  wdh integer,
  gewicht_kg numeric(6,2),
  reihenfolge integer default 0
);

alter table public.training_vorlagen enable row level security;
alter table public.vorlagen_uebungen enable row level security;

create policy "Users can manage own vorlagen" on public.training_vorlagen
  for all using (auth.uid() = user_id);

create policy "Users can manage vorlagen uebungen" on public.vorlagen_uebungen
  for all using (
    exists (select 1 from public.training_vorlagen where id = vorlage_id and user_id = auth.uid())
  );

create index on public.training_vorlagen (user_id);
create index on public.vorlagen_uebungen (vorlage_id);
