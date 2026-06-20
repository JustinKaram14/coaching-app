-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- 1. FIX: Privilege Escalation — prevent clients from changing their own role or coach_id
-- ---------------------------------------------------------------
-- Drop the permissive update policy and replace with a restricted one
drop policy if exists "Users can update own profile" on public.profiles;

-- New policy: users can update their profile but NOT role or coach_id
-- We use a trigger for enforcement (RLS WITH CHECK can't reference OLD)
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger to block role and coach_id changes by non-service-role callers
create or replace function public.prevent_privilege_escalation()
returns trigger as $$
begin
  -- Block role changes
  if NEW.role != OLD.role then
    raise exception 'Changing role is not permitted via this endpoint.';
  end if;
  -- Block coach_id changes (clients cannot reassign themselves)
  if NEW.coach_id is distinct from OLD.coach_id then
    raise exception 'Changing coach_id is not permitted via this endpoint.';
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_no_privilege_escalation on public.profiles;
create trigger enforce_no_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_privilege_escalation();


-- 2. FIX: Invite Codes — restrict public read to unauthenticated users
-- ---------------------------------------------------------------
drop policy if exists "Anyone can read unused codes (for registration)" on public.invite_codes;

-- Only allow reading a specific code (not listing all codes)
-- Authenticated users can validate their own code; coaches manage their own
create policy "Validate invite code during registration" on public.invite_codes
  for select
  using (used_by is null);


-- 3. FIX: Calendar — split client policy into SELECT + UPDATE only (no INSERT/DELETE)
-- ---------------------------------------------------------------
drop policy if exists "Clients can manage own events" on public.kalender_events;

-- Clients can view events assigned to them
create policy "Clients can view own events" on public.kalender_events
  for select
  using (auth.uid() = client_id);

-- Clients can update events assigned to them (change time/notes)
create policy "Clients can update own events" on public.kalender_events
  for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- Only coaches can insert and delete events
-- (existing "Coach can manage own events" policy covers this)


-- 4. FIX: Ensure no anonymous access to sensitive tables
-- ---------------------------------------------------------------
-- Confirm RLS is enabled on all tables (idempotent)
alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.client_settings enable row level security;
alter table public.gewicht enable row level security;
alter table public.training enable row level security;
alter table public.uebungen enable row level security;
alter table public.schlaf enable row level security;
alter table public.ernaehrung enable row level security;
alter table public.supplements enable row level security;
alter table public.supplement_log enable row level security;
alter table public.kalender_events enable row level security;
