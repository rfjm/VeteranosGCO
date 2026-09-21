-- Preserve historic attendance and start a separate counter for 2026/27.
-- The season boundary can be changed here before running the migration.

alter table public.players
  add column if not exists previous_season_trainings integer not null default 0,
  add column if not exists current_season_trainings integer not null default 0;

with current_counts as (
  select
    attendance.player_id,
    count(*)::integer as total
  from public.training_attendance as attendance
  join public.trainings as training on training.id = attendance.training_id
  where training.date >= date '2026-09-01'
  group by attendance.player_id
)
update public.players as player
set
  current_season_trainings = coalesce(current_counts.total, 0),
  previous_season_trainings = greatest(
    coalesce(player.trainings_played, 0) - coalesce(current_counts.total, 0),
    0
  )
from (select id from public.players) as all_players
left join current_counts on current_counts.player_id = all_players.id
where player.id = all_players.id;

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
