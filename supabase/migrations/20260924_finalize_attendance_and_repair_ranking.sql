-- Availability can be saved before a practice, but it only becomes an
-- attendance statistic once that practice has been finalized.

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
      and trainings.completed_at is not null
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

drop trigger if exists refresh_season_attendance_after_training_change
  on public.trainings;

create trigger refresh_season_attendance_after_training_change
after insert or update of completed_at or delete on public.trainings
for each statement execute function public.refresh_season_attendance_counts();

revoke execute on function public.refresh_season_attendance_counts() from public, anon;
grant execute on function public.refresh_season_attendance_counts() to authenticated;

-- Repair the 2026/27 points only when the database is in the exact corrupted
-- state caused by the old recalculate_all_player_stats call: one completed
-- practice this season and totals larger than a single practice can award.
do $$
begin
  if (
    select count(*) = 1
    from public.trainings
    where date >= date '2026-09-01'
      and completed_at is not null
  ) and (
    select coalesce(max(total_points), 0) > 3
    from public.players
  ) then
    update public.players set total_points = 0;

    update public.players
    set total_points = 3
    where lower(trim(name)) in (
      lower('Carlos Dias'),
      lower('Daniel Soares'),
      lower('Jorge Brandão'),
      lower('José Alvito'),
      lower('Rúben Poeira')
    );

    update public.players
    set total_points = 2
    where lower(trim(name)) in (
      lower('Rui Marçal'),
      lower('Raul Carrada'),
      lower('Daniel Stavila'),
      lower('Guilherme Correia'),
      lower('Simão Ascensão'),
      lower('Luís Costa')
    );

    update public.players
    set total_points = 1
    where lower(trim(name)) in (
      lower('Marco Barroso'),
      lower('Duarte Cataludo'),
      lower('Carlos Valério'),
      lower('Alexandre José'),
      lower('Ricardo Pina')
    );
  end if;
end
$$;

-- Apply the completed-practice attendance rule immediately. Trigger functions
-- cannot be called directly, so repeat the same set-based refresh once here.
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
    and trainings.completed_at is not null
  group by all_players.id
) as attendance
where player.id = attendance.player_id;
