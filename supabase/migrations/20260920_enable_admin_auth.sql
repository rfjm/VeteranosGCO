-- Public visitors may read the app data. Only authenticated Supabase users
-- may create, update, or delete it. Disable public sign-ups in the Supabase
-- dashboard and create admin users manually.

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'players',
        'trainings',
        'training_attendance',
        'training_teams',
        'games'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end
$$;

alter table public.players enable row level security;
alter table public.trainings enable row level security;
alter table public.training_attendance enable row level security;
alter table public.training_teams enable row level security;
alter table public.games enable row level security;

create policy "Public can read players"
  on public.players for select
  to anon, authenticated
  using (true);

create policy "Public can read trainings"
  on public.trainings for select
  to anon, authenticated
  using (true);

create policy "Public can read attendance"
  on public.training_attendance for select
  to anon, authenticated
  using (true);

create policy "Public can read teams"
  on public.training_teams for select
  to anon, authenticated
  using (true);

create policy "Public can read games"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "Admins can manage players"
  on public.players for all
  to authenticated
  using (true)
  with check (true);

create policy "Admins can manage trainings"
  on public.trainings for all
  to authenticated
  using (true)
  with check (true);

create policy "Admins can manage attendance"
  on public.training_attendance for all
  to authenticated
  using (true)
  with check (true);

create policy "Admins can manage teams"
  on public.training_teams for all
  to authenticated
  using (true)
  with check (true);

create policy "Admins can manage games"
  on public.games for all
  to authenticated
  using (true)
  with check (true);

revoke execute on function public.recalculate_all_player_stats() from public, anon;
grant execute on function public.recalculate_all_player_stats() to authenticated;
