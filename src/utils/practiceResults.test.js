import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPracticeRounds,
  buildPracticeSummary,
  inferPracticeTeams,
} from "./practiceResults.js";

const teams = [
  { team_number: 1, players: [1, 2] },
  { team_number: 2, players: [3, 4] },
  { team_number: 3, players: [5, 6] },
];

const game = (team1, team2, score1, score2) => ({
  id: `${team1}-${team2}-${score1}-${score2}`,
  team1: teams[team1 - 1].players,
  team2: teams[team2 - 1].players,
  team1_score: score1,
  team2_score: score2,
  winner: score1 > score2 ? team1 : team2,
});

test("groups three-team games into rounds of three", () => {
  const games = [
    game(1, 2, 10, 8),
    game(1, 3, 7, 9),
    game(2, 3, 11, 6),
    game(1, 2, 5, 8),
    game(1, 3, 12, 9),
    game(2, 3, 6, 10),
  ];

  const rounds = buildPracticeRounds(games, teams);

  assert.equal(rounds.length, 2);
  assert.equal(rounds[0].games.length, 3);
  assert.equal(rounds[1].games[0].team1Number, 1);
  assert.equal(rounds[1].complete, true);
});

test("keeps an incomplete final round visible", () => {
  const rounds = buildPracticeRounds(
    [game(1, 2, 10, 8), game(1, 3, 7, 9), game(2, 3, 11, 6), game(1, 2, 5, 8)],
    teams,
  );

  assert.equal(rounds.length, 2);
  assert.equal(rounds[1].games.length, 1);
  assert.equal(rounds[1].complete, false);
});

test("reconstructs deleted teams from saved games and their winners", () => {
  const reconstructed = inferPracticeTeams([
    game(1, 2, 10, 8),
    game(1, 3, 7, 9),
    game(2, 3, 11, 6),
  ]);

  assert.deepEqual(
    reconstructed.map((team) => team.team_number),
    [1, 2, 3],
  );
  assert.deepEqual(reconstructed[2].players, [5, 6]);
});

test("calculates the final totals across every round", () => {
  const summary = buildPracticeSummary(
    [game(1, 2, 10, 8), game(1, 3, 7, 9), game(2, 3, 11, 6)],
    teams,
  );

  assert.equal(summary.ranking[0].team_number, 2);
  assert.equal(summary.ranking[0].wins, 1);
  assert.equal(summary.ranking[0].pointsScored, 19);
});
