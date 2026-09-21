import test from "node:test";
import assert from "node:assert/strict";
import {
  getCombinedAttendance,
  prioritizeAvailablePlayers,
} from "./attendancePriority.js";

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
