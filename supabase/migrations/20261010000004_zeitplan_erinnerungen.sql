-- Zeitplan für die Push-Erinnerungen direkt in Supabase (statt GitHub Actions): alle 15 Minuten.
-- Der Aufruf nutzt das Zugangswort CRON_SECRET. Es steht als Edge-Function-Secret "CRON_SECRET" im Dashboard
-- und als Vault-Eintrag "cron_secret" in der Datenbank (einmalig anlegen, steht nicht in dieser Datei):
--   select vault.create_secret('<Zugangswort>', 'cron_secret');
-- Als Authorization genügt der öffentliche anon-Schlüssel, weil die Funktion JWTs prüft. Die Datei darf mehrfach laufen.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'send-reminders';

select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://nujnyfmdmiqwfkxknenu.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51am55Zm1kbWlxd2ZreGtuZW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDcyNTIsImV4cCI6MjA5NzUyMzI1Mn0.Om_8iEquOubCBj7BHY8XwwNFqVMxQ4HJko_pq2haVrA',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{"type":"all"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
