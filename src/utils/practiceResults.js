import { calculateTeamRanking } from "./teamRanking.js";

const rosterKey = (players = []) =>
  [...players].map(String).sort().join("|");

export const inferPracticeTeams = (games = []) => {
  const rosters = new Map();
  const teamNumberByRoster = new Map();

  for (const game of games) {
    const firstKey = rosterKey(game.team1);
    const secondKey = rosterKey(game.team2);
    if (firstKey) rosters.set(firstKey, game.team1 || []);
    if (secondKey) rosters.set(secondKey, game.team2 || []);

    const firstScore = Number(game.team1_score) || 0;
    const secondScore = Number(game.team2_score) || 0;
    const winner = Number(game.winner);

    if (Number.isFinite(winner) && firstScore !== secondScore) {
      teamNumberByRoster.set(
        firstScore > secondScore ? firstKey : secondKey,
        winner,
      );
    }
  }

  const usedNumbers = new Set(teamNumberByRoster.values());
  let nextNumber = 1;

  for (const key of rosters.keys()) {
    if (teamNumberByRoster.has(key)) continue;
    while (usedNumbers.has(nextNumber)) nextNumber += 1;
    teamNumberByRoster.set(key, nextNumber);
    usedNumbers.add(nextNumber);
  }

  return [...rosters.entries()]
    .map(([key, players]) => ({
      team_number: teamNumberByRoster.get(key),
      players,
    }))
    .sort((first, second) => first.team_number - second.team_number);
};

export const resolvePracticeGame = (game, teams) => {
  const teamByRoster = new Map(
    teams.map((team) => [rosterKey(team.players), team.team_number]),
  );

  return {
    ...game,
    team1Number: teamByRoster.get(rosterKey(game.team1)) ?? "?",
    team2Number: teamByRoster.get(rosterKey(game.team2)) ?? "?",
  };
};

export const buildPracticeRounds = (games = [], teams = []) => {
  if (!games.length || !teams.length) return [];

  const gamesPerRound = Math.max(1, (teams.length * (teams.length - 1)) / 2);
  const rounds = [];

  for (let index = 0; index < games.length; index += gamesPerRound) {
    const roundGames = games.slice(index, index + gamesPerRound);
    rounds.push({
      number: rounds.length + 1,
      games: roundGames.map((game) => resolvePracticeGame(game, teams)),
      ranking: calculateTeamRanking(teams, roundGames),
      complete: roundGames.length === gamesPerRound,
    });
  }

  return rounds;
};

export const buildPracticeSummary = (games = [], savedTeams = []) => {
  const teams = savedTeams.length ? savedTeams : inferPracticeTeams(games);

  return {
    teams,
    rounds: buildPracticeRounds(games, teams),
    ranking: calculateTeamRanking(teams, games),
  };
};
