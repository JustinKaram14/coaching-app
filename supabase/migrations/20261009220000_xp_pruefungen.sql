-- Dokumentiert die Prüfungen, die in der Datenbank schon aktiv sind (zusätzlich zu 20261009212442_figur_spiel.sql):
-- Sie prüfen jeden XP-Eintrag gegen die echten Daten (Mahlzeit, Schlaf, Gewicht, Training, Wasser, Serie, Challenge)
-- und schützen Challenges vor Änderungen am Titel oder an den Punkten.
-- Die Datei darf mehrfach laufen. Gegenüber dem Stand in der Datenbank ist nur search_path ergänzt (Supabase-Hinweis).

CREATE OR REPLACE FUNCTION public.xp_ref_date(p text)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
declare
  d date;
begin
  d := p::date;
  -- Spielraum für Zeitzonen: die App rechnet mit dem Datum des Geräts, der Server mit UTC
  if d < current_date - 2 or d > current_date + 1 then
    raise exception 'Datum nicht zulässig' using errcode = 'P0001';
  end if;
  return d;
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
  raise exception 'Ungültiges Datum' using errcode = 'P0001';
end;
$function$;

CREATE OR REPLACE FUNCTION public.xp_meals(uid uuid, d date)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  select count(distinct f.mahlzeit)::integer from public.food_log f
  where f.user_id = uid and f.datum = d and f.mahlzeit in ('Frühstück', 'Mittagessen', 'Abendessen')
$function$;

CREATE OR REPLACE FUNCTION public.xp_supplements_done(uid uuid, d date)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  select
    (select count(*) from public.supplements s where s.user_id = uid and s.aktiv) > 0
    and (select count(distinct l.supplement_id) from public.supplement_log l
         join public.supplements s on s.id = l.supplement_id and s.aktiv
         where l.user_id = uid and l.datum = d and l.eingenommen)
        >= (select count(*) from public.supplements s where s.user_id = uid and s.aktiv)
$function$;

CREATE OR REPLACE FUNCTION public.check_points_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
declare
  balance integer;
begin
  if new.punkte < 0 then
    -- Zwei Geräte gleichzeitig: hintereinander prüfen, sonst könnte das Guthaben unter null fallen
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    select coalesce(sum(punkte), 0) into balance from public.xp_events where user_id = new.user_id;
    if balance + new.punkte < 0 then
      raise exception 'Nicht genug Punkte' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_xp_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
declare
  d date; n integer; meal text; cnt integer; goal integer; sd date; ed date;
  rx integer; rp integer; supp_total integer;
begin
  if new.xp < 0 then
    raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
  end if;

  -- Ausgeben: nur Shop und Belohnungen, ohne XP
  if new.punkte < 0 then
    if new.xp <> 0 or new.quelle not in ('shop', 'belohnung') then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.quelle = 'start' then
    if new.ref <> 'willkommen' or new.xp <> 0 or new.punkte <> 50
       or not exists (select 1 from public.characters c where c.user_id = new.user_id) then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'mahlzeit' then
    d := public.xp_ref_date(split_part(new.ref, ':', 1));
    meal := split_part(new.ref, ':', 2);
    if new.xp <> 6 or new.punkte <> 0 or meal not in ('Frühstück', 'Mittagessen', 'Abendessen')
       or not exists (select 1 from public.food_log f where f.user_id = new.user_id and f.datum = d and f.mahlzeit = meal) then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'schlaf' then
    d := public.xp_ref_date(new.ref);
    if new.xp <> 8 or new.punkte <> 0 or not exists (select 1 from public.schlaf x where x.user_id = new.user_id and x.datum = d) then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'gewicht' then
    d := public.xp_ref_date(new.ref);
    if new.xp <> 5 or new.punkte <> 0 or not exists (select 1 from public.gewicht x where x.user_id = new.user_id and x.datum = d) then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'training' then
    d := public.xp_ref_date(split_part(new.ref, ':', 1));
    n := split_part(new.ref, ':', 2)::integer;
    select count(*) into cnt from public.training t where t.user_id = new.user_id and t.datum = d;
    if new.xp <> 30 or new.punkte <> 10 or n not in (1, 2) or cnt < n then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'supplements' then
    d := public.xp_ref_date(new.ref);
    if new.xp <> 8 or new.punkte <> 0 or not public.xp_supplements_done(new.user_id, d) then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'wasser' then
    d := public.xp_ref_date(new.ref);
    select coalesce(c.wasser_ziel_ml, 0) into goal from public.client_settings c where c.user_id = new.user_id;
    select coalesce(sum(w.menge_ml), 0) into cnt from public.wasser_log w where w.user_id = new.user_id and w.datum = d;
    if new.xp <> 20 or new.punkte <> 10 or coalesce(goal, 0) <= 0 or cnt < goal then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'gruener-tag' then
    d := public.xp_ref_date(new.ref);
    select count(*) into supp_total from public.supplements s where s.user_id = new.user_id and s.aktiv;
    if new.xp <> 30 or new.punkte <> 20
       or public.xp_meals(new.user_id, d) < 3
       or not exists (select 1 from public.schlaf x where x.user_id = new.user_id and x.datum = d)
       or (supp_total > 0 and not public.xp_supplements_done(new.user_id, d)) then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'streak' then
    -- Referenz "Tage@Starttag": alle Tage von Starttag bis heute (oder gestern) haben mindestens einen Eintrag
    n := split_part(new.ref, '@', 1)::integer;
    sd := split_part(new.ref, '@', 2)::date;
    select v.xp, v.punkte into rx, rp from (values
      (3, 15, 10), (7, 40, 25), (14, 80, 40), (21, 100, 50), (30, 150, 75), (50, 200, 100),
      (75, 250, 125), (100, 300, 200), (150, 350, 250), (200, 400, 300), (365, 500, 500)
    ) as v(days, xp, punkte) where v.days = n;
    if rx is null or new.xp <> rx or new.punkte <> rp then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;
    ed := sd + (n - 1);
    if ed < current_date - 2 or ed > current_date + 1 then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;
    select count(*) into cnt from (
      select datum from public.gewicht where user_id = new.user_id and datum between sd and ed
      union select datum from public.schlaf where user_id = new.user_id and datum between sd and ed
      union select datum from public.training where user_id = new.user_id and datum between sd and ed
      union select datum from public.food_log where user_id = new.user_id and datum between sd and ed
    ) days;
    if cnt < n then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  elsif new.quelle = 'challenge' then
    -- Punkte wie bei der Challenge hinterlegt, XP 1,5-fach (höchstens 500); höchstens 6 pro 24 Stunden
    select c.punkte into cnt from public.challenges c
      where c.id::text = new.ref and c.user_id = new.user_id and c.status in ('aktiv', 'erledigt');
    if cnt is null or new.punkte <> cnt or new.xp <> least(500, round(cnt * 1.5))::integer
       or (select count(*) from public.xp_events e where e.user_id = new.user_id and e.quelle = 'challenge'
           and e.created_at > now() - interval '24 hours') >= 6 then
      raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
    end if;

  else
    raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
  end if;

  return new;
exception when invalid_text_representation then
  raise exception 'Ungültiger Eintrag' using errcode = 'P0001';
end;
$function$;

CREATE OR REPLACE FUNCTION public.challenges_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  if auth.uid() = old.user_id and old.coach_id is distinct from auth.uid() then
    new.user_id := old.user_id; new.coach_id := old.coach_id; new.vorlage_id := old.vorlage_id;
    new.titel := old.titel; new.beschreibung := old.beschreibung; new.kategorie := old.kategorie;
    new.punkte := old.punkte; new.frist := old.frist; new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS xp_events_check_balance ON public.xp_events;
CREATE TRIGGER xp_events_check_balance BEFORE INSERT ON public.xp_events
  FOR EACH ROW EXECUTE FUNCTION public.check_points_balance();

DROP TRIGGER IF EXISTS xp_events_validate ON public.xp_events;
CREATE TRIGGER xp_events_validate BEFORE INSERT ON public.xp_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_xp_event();

DROP TRIGGER IF EXISTS challenges_guard_trg ON public.challenges;
CREATE TRIGGER challenges_guard_trg BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.challenges_guard();
