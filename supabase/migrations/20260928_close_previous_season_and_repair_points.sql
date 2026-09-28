-- Close every practice from the 2025/26 season without awarding any points.
-- Then undo only the accidental points awarded when the 8 June practice was
-- finalized through the application. All unaffected player data is preserved.

update public.trainings
set completed_at = (date::text || ' 23:00:00+00')::timestamptz
where date <= date '2026-06-08'
  and completed_at is null;

with corrected_points(name, points) as (
  values
    ('Afonso Teixeira', 0),
    ('Duarte Cataludo', 4),
    ('Filipe Pinto', 0),
    ('Filipe Soares', 2),
    ('Jorge Brandão', 5),
    ('Luís Pires', 0),
    ('marco', 0),
    ('Ricardo Jubilot', 0),
    ('Ricardo Pina', 4),
    ('Rui Marçal', 3),
    ('Tomás Cataludo', 2)
)
update public.players as player
set total_points = corrected_points.points
from corrected_points
where lower(trim(player.name)) = lower(trim(corrected_points.name));
