import test from "node:test";
import assert from "node:assert/strict";
import {
  clampGameDuration,
  getGameEndAction,
  getNextTeamPair,
  getRecentGameResults,
  getStoredDurationMinutes,
  getWinnerTeamNumber,
} from "./gameLogic.js";

test("clamps custom game durations between zero and thirty minutes", () => {
  assert.equal(clampGameDuration(5, 0), 300);
  assert.equal(clampGameDuration(0, 0), 0);
  assert.equal(clampGameDuration(29, 59), 1799);
  assert.equal(clampGameDuration(30, 45), 1800);
  assert.equal(clampGameDuration(-2, -10), 0);
});

test("stores custom durations as whole minutes for the integer database column", () => {
  assert.equal(getStoredDurationMinutes(10), 0);
  assert.equal(getStoredDurationMinutes(5 * 60 + 30), 5);
  assert.equal(getStoredDurationMinutes(30 * 60), 30);
});

test("automatically saves a finished game with a winner", () => {
  assert.equal(
    getGameEndAction({
      timer: 0,
      running: true,
      selectedTeamCount: 2,
      team1Score: 10,
      team2Score: 8,
    }),
    "auto-save",
  );
});

test("requires manual free throws when the timer ends tied", () => {
  assert.equal(
    getGameEndAction({
      timer: 0,
      running: true,
      selectedTeamCount: 2,
      team1Score: 10,
      team2Score: 10,
    }),
    "free-throws",
  );
});

test("does nothing before the running timer reaches zero", () => {
  assert.equal(
    getGameEndAction({
      timer: 1,
      running: true,
      selectedTeamCount: 2,
      team1Score: 10,
      team2Score: 8,
    }),
    "none",
  );
});

test("does not return a winner for a tied score", () => {
  const teams = [{ team_number: 1 }, { team_number: 2 }];

  assert.equal(getWinnerTeamNumber(teams, 5, 5), null);
  assert.equal(getWinnerTeamNumber(teams, 6, 5), 1);
  assert.equal(getWinnerTeamNumber(teams, 5, 6), 2);
});

test("returns the three most recent results with team numbers", () => {
  const teams = [
    { team_number: 1, players: [1, 2] },
    { team_number: 2, players: [3, 4] },
    { team_number: 3, players: [5, 6] },
  ];
  const games = [
    { id: 1, team1: [1, 2], team2: [3, 4], team1_score: 5, team2_score: 4 },
    { id: 2, team1: [5, 6], team2: [2, 1], team1_score: 7, team2_score: 8 },
    { id: 3, team1: [4, 3], team2: [6, 5], team1_score: 9, team2_score: 6 },
    { id: 4, team1: [1, 2], team2: [5, 6], team1_score: 10, team2_score: 11 },
  ];

  assert.deepEqual(getRecentGameResults(games, teams), [
    { id: 4, team1: 1, team2: 3, team1Score: 10, team2Score: 11 },
    { id: 3, team1: 2, team2: 3, team1Score: 9, team2Score: 6 },
    { id: 2, team1: 3, team2: 1, team1Score: 7, team2Score: 8 },
  ]);
});

test("advances matchups through the fixed three-team sequence", () => {
  const teams = [
    { team_number: 1 },
    { team_number: 2 },
    { team_number: 3 },
  ];

  assert.deepEqual(
    getNextTeamPair([teams[0], teams[1]], teams).map((team) => team.team_number),
    [1, 3],
  );
  assert.deepEqual(
    getNextTeamPair([teams[2], teams[0]], teams).map((team) => team.team_number),
    [2, 3],
  );
  assert.deepEqual(
    getNextTeamPair([teams[1], teams[2]], teams).map((team) => team.team_number),
    [1, 2],
  );
});

test("keeps the same matchup when only two teams exist", () => {
  const teams = [{ team_number: 1 }, { team_number: 2 }];

  assert.equal(getNextTeamPair(teams, teams), teams);
});
