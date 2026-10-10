-- Längenbegrenzungen nachrüsten und eine alte Regel entfernen.
-- Stand der Prüfung am 10.10.2026: keine bestehende Zeile verletzt eine der neuen Regeln,
-- und die Eingabefelder der App liegen innerhalb der Grenzen (Figurenname 16, Belohnung 60, Challenge-Nachweis 200).
-- Die Datei darf mehrfach laufen.

-- Alte Regel aus der Zeit vor belohnung_einloesen (erlaubte Anlegen und Löschen direkt; die Rechte dafür sind entzogen)
DROP POLICY IF EXISTS "Users manage own vouchers" ON public.einloesungen;

-- Figur: Größe der JSON-Felder
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_json_size;
ALTER TABLE public.characters ADD CONSTRAINT characters_json_size CHECK (
  pg_column_size(config) <= 2000 AND pg_column_size(equipped) <= 2000
  AND (kennenlernen IS NULL OR pg_column_size(kennenlernen) <= 6000)
);

-- XP-Ereignisse: Textlängen
ALTER TABLE public.xp_events DROP CONSTRAINT IF EXISTS xp_events_laengen;
ALTER TABLE public.xp_events ADD CONSTRAINT xp_events_laengen CHECK (
  char_length(quelle) <= 40 AND char_length(ref) <= 120 AND (titel IS NULL OR char_length(titel) <= 160)
);

-- Belohnungen und Einlösungen: Emoji und Einlösungen wie die Belohnung selbst
ALTER TABLE public.belohnungen DROP CONSTRAINT IF EXISTS belohnungen_emoji_laenge;
ALTER TABLE public.belohnungen ADD CONSTRAINT belohnungen_emoji_laenge CHECK (emoji IS NULL OR char_length(emoji) <= 16);

ALTER TABLE public.einloesungen DROP CONSTRAINT IF EXISTS einloesungen_preis_check;
ALTER TABLE public.einloesungen ADD CONSTRAINT einloesungen_preis_check CHECK (preis BETWEEN 10 AND 5000);
ALTER TABLE public.einloesungen DROP CONSTRAINT IF EXISTS einloesungen_laengen;
ALTER TABLE public.einloesungen ADD CONSTRAINT einloesungen_laengen CHECK (
  char_length(titel) BETWEEN 1 AND 60 AND (emoji IS NULL OR char_length(emoji) <= 16)
);

-- Challenges: Textlängen
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_laengen;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_laengen CHECK (
  (beschreibung IS NULL OR char_length(beschreibung) <= 500)
  AND (nachweis_text IS NULL OR char_length(nachweis_text) <= 1000)
  AND (kategorie IS NULL OR char_length(kategorie) <= 40)
  AND (vorlage_id IS NULL OR char_length(vorlage_id) <= 60)
);
