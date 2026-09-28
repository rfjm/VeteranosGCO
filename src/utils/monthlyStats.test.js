import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMonthlyPlayerStats,
  getMonthRange,
  getPlayerMonthlyStats,
} from "./monthlyStats.js";

const teams = [
  { team_number: 1, players: ["a", "b"] },
  { team_number: 2, players: ["c", "d"] },
  { team_number: 3, players: ["e", "f"] },
];

const game = (trainingId, first, second, firstScore, secondScore, winner) => ({
  training_id: trainingId,
  team1: teams[first - 1].players,
  team2: teams[second - 1].players,
  team1_score: firstScore,
  team2_score: secondScore,
  winner,
});

test("returns the current local calendar month range", () => {
  assert.deepEqual(getMonthRange(new Date(2026, 8, 28)), {
    start: "2026-09-01",
    end: "2026-10-01",
  });
});

test("calculates monthly practices and awarded points from completed practices", () => {
  const trainings = [
    { id: "one", completed_at: "2026-09-22T22:00:00Z" },
    { id: "draft", completed_at: null },
  ];
  const attendance = [
    { training_id: "one", player_id: "a" },
    { training_id: "one", player_id: "a" },
    { training_id: "one", player_id: "c" },
    { training_id: "draft", player_id: "e" },
  ];
  const games = [
    game("one", 1, 2, 10, 8, 1),
    game("one", 1, 3, 10, 7, 1),
    game("one", 2, 3, 9, 6, 2),
  ];

  const stats = buildMonthlyPlayerStats(trainings, attendance, games);

  assert.deepEqual(getPlayerMonthlyStats(stats, "a"), { practices: 1, points: 3 });
  assert.deepEqual(getPlayerMonthlyStats(stats, "c"), { practices: 1, points: 2 });
  assert.deepEqual(getPlayerMonthlyStats(stats, "e"), { practices: 0, points: 1 });
  assert.deepEqual(getPlayerMonthlyStats(stats, "missing"), { practices: 0, points: 0 });
});
