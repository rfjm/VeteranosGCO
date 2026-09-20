import test from "node:test";
import assert from "node:assert/strict";
import { createBalancedTeams, getTeamAverage } from "./teamGenerator.js";

const players = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Player ${index + 1}`,
  average_points: index + 1,
  total_points: 100 - index,
}));

const seededRandom = (initialSeed) => {
  let seed = initialSeed;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
};

const countGroupMembers = (team, ids) =>
  team.filter((player) => ids.has(player.id)).length;

test("spreads the best and worst three players across three teams", () => {
  const teams = createBalancedTeams(players, 3, {
    random: seededRandom(1),
    attempts: 500,
  });
  const topThree = new Set([12, 11, 10]);
  const bottomThree = new Set([1, 2, 3]);

  assert.deepEqual(teams.map((team) => team.length), [4, 4, 4]);
  assert.deepEqual(teams.map((team) => countGroupMembers(team, topThree)), [1, 1, 1]);
  assert.deepEqual(teams.map((team) => countGroupMembers(team, bottomThree)), [1, 1, 1]);
});

test("uses a 2-1 split for each three-player group with two teams", () => {
  const teams = createBalancedTeams(players.slice(0, 9), 2, {
    random: seededRandom(2),
    attempts: 500,
  });
  const topThree = new Set([9, 8, 7]);
  const bottomThree = new Set([1, 2, 3]);

  assert.deepEqual(
    teams.map((team) => team.length).sort((a, b) => a - b),
    [4, 5],
  );
  assert.ok(teams.every((team) => countGroupMembers(team, topThree) < 3));
  assert.ok(teams.every((team) => countGroupMembers(team, bottomThree) < 3));
});

test("balances teams using average points rather than total points", () => {
  const teams = createBalancedTeams(players, 3, {
    random: seededRandom(3),
    attempts: 2000,
  });
  const averages = teams.map(getTeamAverage);

  assert.ok(Math.max(...averages) - Math.min(...averages) <= 0.5);
  assert.deepEqual(
    teams.flat().map((player) => player.id).sort((a, b) => a - b),
    players.map((player) => player.id),
  );
});
