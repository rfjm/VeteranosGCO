import test from "node:test";
import assert from "node:assert/strict";
import { getGameEndAction, getWinnerTeamNumber } from "./gameLogic.js";

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
