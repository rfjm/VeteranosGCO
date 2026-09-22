-- Preserve the final competitive points from the 2025/26 season separately
-- from total_points, which remains the live 2026/27 score.

alter table public.players
  add column if not exists previous_season_points integer not null default 0;

update public.players
set previous_season_points = 0;

with historic_points(name, points) as (
  values
    ('Marco Barroso', 109),
    ('Filipe Soares', 100),
    ('Rui Marçal', 96),
    ('David Guerreiro', 95),
    ('Ricardo Pina', 94),
    ('Luís Pires', 93),
    ('Ricardo Jubilot', 90),
    ('Jorge Brandão', 79),
    ('Bruno Marçal', 67),
    ('Luís Costa', 65),
    ('José Palma', 63),
    ('Rúben Poeira', 61),
    ('Bruno Henrique', 57),
    ('Daniel Stavila', 54),
    ('Guilherme Correia', 44),
    ('Carlos Valério', 41),
    ('Simão Ascensão', 36),
    ('Hugo Delgado', 34),
    ('Tó Guedes', 32),
    ('José Alvito', 31),
    ('Carlos Dias', 31),
    ('Luis Máximo', 31),
    ('Alexandre José', 25),
    ('João Gonçalves', 25),
    ('João Rodrigues', 24),
    ('Pedro João', 23),
    ('Carlos Sousa', 23),
    ('João Marçal', 20),
    ('Bernardo Batatinha', 16),
    ('Duarte Cataludo', 16),
    ('Afonso Teixeira', 16),
    ('David Carvalho', 15),
    ('Vasco Retré', 15),
    ('Nuno Leal', 14),
    ('Daniel Soares', 12),
    ('Guilherme Caleça', 8),
    ('Cláudio Barbosa', 8),
    ('Filipe Pinto', 7),
    ('Rui Carvalho', 6),
    ('Tomás Retré', 5),
    ('Alejandro Deodato', 5),
    ('Rui Ferreira', 3),
    ('Ricardo Palma', 3),
    ('Guilherme Santos', 3),
    ('João Viegas', 3),
    ('Henrique Mota', 3),
    ('Ricardo Calé', 2),
    ('Tomás Cataludo', 2),
    ('Márcio Bento', 2),
    ('Nélson Azevedo', 2)
)
update public.players as player
set previous_season_points = historic_points.points
from historic_points
where lower(trim(player.name)) = lower(trim(historic_points.name));
