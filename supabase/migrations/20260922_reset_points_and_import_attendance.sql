-- Start the competitive points for 2026/27 at zero and import the final
-- attendance figures from 2025/26 (61 practices in total).

alter table public.players
  add column if not exists previous_season_trainings integer not null default 0,
  add column if not exists current_season_trainings integer not null default 0;

-- Reset every player, including players not present in the historic list.
update public.players
set
  total_points = 0,
  previous_season_trainings = 0;

-- average_points is a normal column in the current schema. Keep the migration
-- safe if a later schema changes it into a generated column or a view field.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'players'
      and column_name = 'average_points'
      and is_generated = 'NEVER'
  ) then
    execute 'update public.players set average_points = 0';
  end if;
end
$$;

with historic_attendance(name, practices) as (
  values
    ('Ricardo Pina', 53),
    ('Filipe Soares', 52),
    ('Marco Barroso', 51),
    ('Ricardo Jubilot', 49),
    ('Rui Marçal', 48),
    ('Luís Pires', 47),
    ('David Guerreiro', 42),
    ('Jorge Brandão', 41),
    ('José Palma', 38),
    ('Luís Costa', 35),
    ('Bruno Marçal', 34),
    ('Rúben Poeira', 33),
    ('Bruno Henrique', 31),
    ('Daniel Stavila', 29),
    ('Guilherme Correia', 25),
    ('Carlos Valério', 25),
    ('Simão Ascensão', 19),
    ('José Alvito', 18),
    ('Hugo Delgado', 17),
    ('Luis Máximo', 17),
    ('Tó Guedes', 17),
    ('Carlos Dias', 15),
    ('Alexandre José', 14),
    ('Afonso Teixeira', 13),
    ('Pedro João', 12),
    ('João Gonçalves', 12),
    ('João Rodrigues', 12),
    ('Carlos Sousa', 10),
    ('Duarte Cataludo', 10),
    ('Daniel Soares', 9),
    ('João Marçal', 9),
    ('Nuno Leal', 8),
    ('Bernardo Batatinha', 7),
    ('David Carvalho', 7),
    ('Guilherme Caleça', 5),
    ('Vasco Retré', 5),
    ('Filipe Pinto', 4),
    ('Cláudio Barbosa', 4),
    ('Rui Carvalho', 3),
    ('Rui Ferreira', 2),
    ('Tomás Cataludo', 2),
    ('Tomás Retré', 2),
    ('Alejandro Deodato', 2),
    ('Henrique Mota', 2),
    ('Márcio Bento', 2),
    ('Nélson Azevedo', 2),
    ('Ricardo Palma', 1),
    ('Ricardo Calé', 1),
    ('Guilherme Santos', 1),
    ('João Viegas', 1)
)
update public.players as player
set previous_season_trainings = historic_attendance.practices
from historic_attendance
where lower(trim(player.name)) = lower(trim(historic_attendance.name));

-- Recalculate this season from actual attendance records. A newly created
-- practice increases the UI denominator immediately; these counters increase
-- only when the player is saved as attending that practice.
update public.players as player
set current_season_trainings = (
  select count(*)::integer
  from public.training_attendance as attendance
  join public.trainings as training on training.id = attendance.training_id
  where attendance.player_id = player.id
    and training.date >= date '2026-09-01'
);

update public.players
set trainings_played = previous_season_trainings + current_season_trainings;

-- Keep the player-side counters synchronized for both manual attendance and
-- the future WhatsApp bot. This is repeated here so this migration can be run
-- safely even if the earlier seasonal migration was not installed manually.
create or replace function public.refresh_season_attendance_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players as player
  set
    current_season_trainings = coalesce(attendance.total, 0),
    trainings_played = player.previous_season_trainings + coalesce(attendance.total, 0)
  from (
    select
      all_players.id as player_id,
      count(trainings.id)::integer as total
    from public.players as all_players
    left join public.training_attendance
      on training_attendance.player_id = all_players.id
    left join public.trainings
      on trainings.id = training_attendance.training_id
      and trainings.date >= date '2026-09-01'
    group by all_players.id
  ) as attendance
  where player.id = attendance.player_id;

  return null;
end;
$$;

drop trigger if exists refresh_season_attendance_after_change
  on public.training_attendance;

create trigger refresh_season_attendance_after_change
after insert or update or delete on public.training_attendance
for each statement execute function public.refresh_season_attendance_counts();

revoke execute on function public.refresh_season_attendance_counts() from public, anon;
grant execute on function public.refresh_season_attendance_counts() to authenticated;
