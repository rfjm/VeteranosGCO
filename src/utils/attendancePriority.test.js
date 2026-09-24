import test from "node:test";
import assert from "node:assert/strict";
import {
  formatAttendanceRecord,
  getCombinedAttendance,
  getCurrentSeasonAverage,
  getPlayerTeamRating,
  rankPlayersForTeamProtection,
  getPreviousSeasonPoints,
  prioritizeAvailablePlayers,
  rankPlayersByPointsAndAttendance,
} from "./attendancePriority.js";

test("team protection ignores players without a current-season result", () => {
  const players = [
    { id: 1, name: "No games", total_points: 0, current_season_trainings: 0, previous_season_points: 100, previous_season_trainings: 10 },
    { id: 2, name: "Lower historic rank", total_points: 1, current_season_trainings: 1, previous_season_points: 20, previous_season_trainings: 10 },
    { id: 3, name: "Higher historic rank", total_points: 1, current_season_trainings: 1, previous_season_points: 30, previous_season_trainings: 10 },
    { id: 4, name: "Best current average", total_points: 3, current_season_trainings: 1, previous_season_points: 1, previous_season_trainings: 10 },
  ];

  assert.deepEqual(
    rankPlayersForTeamProtection(players).map((player) => player.id),
    [4, 3, 2],
  );
});

test("reads previous-season points without affecting current points", () => {
  const player = { previous_season_points: 109, total_points: 0 };

  assert.equal(getPreviousSeasonPoints(player), 109);
  assert.equal(player.total_points, 0);
});

test("uses 2025/26 points per attendance for the 22 September teams", () => {
  const player = {
    previous_season_points: 93,
    previous_season_trainings: 47,
    total_points: 6,
    current_season_trainings: 2,
  };

  assert.equal(getPlayerTeamRating(player, "2026-09-22"), 93 / 47);
});

test("uses only current-season points per attendance after 22 September", () => {
  const player = {
    previous_season_points: 109,
    previous_season_trainings: 51,
    total_points: 6,
    current_season_trainings: 2,
  };

  assert.equal(getPlayerTeamRating(player, "2026-09-23"), 3);
});

test("calculates the current average after the first practice", () => {
  assert.equal(
    getCurrentSeasonAverage({ total_points: 3, current_season_trainings: 1 }),
    3,
  );
  assert.equal(
    getCurrentSeasonAverage({ total_points: 0, current_season_trainings: 0 }),
    0,
  );
});

test("formats player attendance against the season total", () => {
  assert.equal(formatAttendanceRecord(54, 61), "54/61");
  assert.equal(formatAttendanceRecord(undefined, undefined), "0/0");
});

test("ranks players by points and uses attendance to break ties", () => {
  const players = [
    { id: 1, name: "Ten points", total_points: 10, previous_season_trainings: 4 },
    { id: 2, name: "More attendance", total_points: 8, previous_season_trainings: 20 },
    { id: 3, name: "Less attendance", total_points: 8, previous_season_trainings: 12 },
  ];

  assert.deepEqual(
    rankPlayersByPointsAndAttendance(players).map((player) => player.id),
    [1, 2, 3],
  );
});

test("combines previous and current season attendance", () => {
  assert.equal(
    getCombinedAttendance({
      previous_season_trainings: 22,
      current_season_trainings: 3,
    }),
    25,
  );
});

test("uses the legacy count until the season migration is installed", () => {
  assert.equal(getCombinedAttendance({ trainings_played: 14 }), 14);
});

test("selects only the top 18 available players by combined attendance", () => {
  const players = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    name: `Player ${String(index + 1).padStart(2, "0")}`,
    previous_season_trainings: index,
    current_season_trainings: index % 3,
  }));

  const { selected, waitlisted } = prioritizeAvailablePlayers(players);

  assert.equal(selected.length, 18);
  assert.equal(waitlisted.length, 2);
  assert.deepEqual(
    waitlisted.map((player) => player.id),
    [2, 1],
  );
});

test("prefers current-season attendance when combined totals are tied", () => {
  const players = [
    { id: 1, name: "Last season", previous_season_trainings: 10, current_season_trainings: 2 },
    { id: 2, name: "This season", previous_season_trainings: 8, current_season_trainings: 4 },
  ];

  const { selected } = prioritizeAvailablePlayers(players, 1);

  assert.equal(selected[0].id, 2);
});
