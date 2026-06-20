create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own subscription" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
