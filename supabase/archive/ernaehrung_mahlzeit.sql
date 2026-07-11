-- Add meal type to nutrition entries
alter table public.ernaehrung add column if not exists mahlzeit text not null default 'Tagesgesamt';

-- Drop old unique constraint (user_id, datum) and replace with (user_id, datum, mahlzeit)
alter table public.ernaehrung drop constraint if exists ernaehrung_user_id_datum_key;
alter table public.ernaehrung add constraint ernaehrung_user_id_datum_mahlzeit_key unique (user_id, datum, mahlzeit);
