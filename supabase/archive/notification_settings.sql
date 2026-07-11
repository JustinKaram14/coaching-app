alter table public.client_settings
  add column if not exists notif_daily_reminder boolean default true,
  add column if not exists notif_reminder_time text default '20:00',
  add column if not exists notif_appointments boolean default true,
  add column if not exists notif_appointment_minutes integer default 60;
