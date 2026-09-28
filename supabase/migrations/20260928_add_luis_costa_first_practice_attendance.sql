-- Luís Costa attended the completed practice on 22 September 2026, but his
-- attendance row was missing. His saved games and points are already correct.
-- This migration is idempotent.

do $$
declare
  practice_id public.trainings.id%type;
  luis_id public.players.id%type;
begin
  select id into practice_id
  from public.trainings
  where date = date '2026-09-22'
    and completed_at is not null
  order by completed_at desc
  limit 1;

  select id into luis_id
  from public.players
  where lower(trim(name)) = lower('Luís Costa')
  limit 1;

  if practice_id is null or luis_id is null then
    raise exception 'Completed practice or Luís Costa was not found';
  end if;

  if not exists (
    select 1
    from public.training_attendance
    where training_id::text = practice_id::text
      and player_id::text = luis_id::text
  ) then
    insert into public.training_attendance (training_id, player_id)
    values (practice_id::text, luis_id::text);
  end if;

  update public.players
  set
    current_season_trainings = (
      select count(*)::integer
      from public.training_attendance as attendance
      join public.trainings as training
        on training.id::text = attendance.training_id::text
      where attendance.player_id::text = luis_id::text
        and training.date >= date '2026-09-01'
        and training.completed_at is not null
    ),
    trainings_played = previous_season_trainings + (
      select count(*)::integer
      from public.training_attendance as attendance
      join public.trainings as training
        on training.id::text = attendance.training_id::text
      where attendance.player_id::text = luis_id::text
        and training.date >= date '2026-09-01'
        and training.completed_at is not null
    )
  where id::text = luis_id::text;
end
$$;
