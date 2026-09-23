-- Keep completed practice rosters available for the history shown on the
-- training calendar. Older completed practices can be identified because the
-- previous app removed their teams after awarding the player points.

alter table public.trainings
  add column if not exists completed_at timestamptz;

update public.trainings as training
set completed_at = coalesce(
  (
    select max(game.created_at)
    from public.games as game
    where game.training_id = training.id
  ),
  now()
)
where training.completed_at is null
  and exists (
    select 1
    from public.games as game
    where game.training_id = training.id
  )
  and not exists (
    select 1
    from public.training_teams as team
    where team.training_id = training.id
  );
