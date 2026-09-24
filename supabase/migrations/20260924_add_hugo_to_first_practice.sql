-- Correct the completed practice on 22 September 2026: Hugo Delgado attended
-- with the White team and earned one point. This migration is idempotent.

do $$
declare
  practice_id public.trainings.id%type;
  hugo_id public.players.id%type;
  white_team_member_id text := '0312743e-1dd1-487d-a122-7f893a1f7729';
begin
  select id into practice_id
  from public.trainings
  where date = date '2026-09-22'
  order by completed_at desc nulls last
  limit 1;

  select id into hugo_id
  from public.players
  where lower(trim(name)) = lower('Hugo Delgado')
  limit 1;

  if practice_id is null or hugo_id is null then
    raise exception 'Practice or Hugo Delgado was not found';
  end if;

  if not exists (
    select 1
    from public.training_attendance
    where training_id::text = practice_id::text
      and player_id::text = hugo_id::text
  ) then
    insert into public.training_attendance (training_id, player_id)
    values (practice_id::text, hugo_id::text);
  end if;

  update public.games
  set team1 = array_append(team1, hugo_id::text)
  where training_id::text = practice_id::text
    and team1 @> array[white_team_member_id]
    and not team1 @> array[hugo_id::text];

  update public.games
  set team2 = array_append(team2, hugo_id::text)
  where training_id::text = practice_id::text
    and team2 @> array[white_team_member_id]
    and not team2 @> array[hugo_id::text];

  update public.players
  set
    total_points = 1,
    current_season_trainings = 1,
    trainings_played = previous_season_trainings + 1
  where id = hugo_id;
end
$$;
