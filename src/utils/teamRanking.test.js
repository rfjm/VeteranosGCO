import test from "node:test";
import assert from "node:assert/strict";
import { calculateTeamRanking } from "./teamRanking.js";

const teams = [
  { team_number: 1, players: [1, 2] },
  { team_number: 2, players: [3, 4] },
  { team_number: 3, players: [5, 6] },
];

const game = (team1, team2, team1Score, team2Score, winner) => ({
  team1: teams[team1 - 1].players,
  team2: teams[team2 - 1].players,
  team1_score: team1Score,
  team2_score: team2Score,
  winner,
});

test("ranks tied records by point difference", () => {
  const games = [
    game(1, 2, 10, 8, 1),
    game(2, 3, 12, 10, 2),
    game(3, 1, 15, 10, 3),
  ];

  const ranking = calculateTeamRanking(teams, games);

  assert.deepEqual(
    ranking.map(({ team_number }) => team_number),
    [3, 2, 1],
  );
  assert.deepEqual(
    ranking.map(({ pointDifference }) => pointDifference),
    [3, 0, -3],
  );
});

test("ranks equal records and point differences by total points scored", () => {
  const games = [
    game(1, 2, 20, 10, 1),
    game(2, 3, 30, 20, 2),
    game(3, 1, 40, 30, 3),
  ];

  const ranking = calculateTeamRanking(teams, games);

  assert.deepEqual(
    ranking.map(({ team_number }) => team_number),
    [3, 1, 2],
  );
  assert.deepEqual(
    ranking.map(({ pointDifference }) => pointDifference),
    [0, 0, 0],
  );
  assert.deepEqual(
    ranking.map(({ pointsScored }) => pointsScored),
    [60, 50, 40],
  );
});

test("matches saved team rosters regardless of player order", () => {
  const ranking = calculateTeamRanking(teams, [
    {
      team1: [2, 1],
      team2: [4, 3],
      team1_score: 12,
      team2_score: 8,
      winner: 1,
    },
  ]);

  assert.equal(ranking[0].team_number, 1);
  assert.equal(ranking[0].wins, 1);
  assert.equal(ranking[0].pointDifference, 4);
});
