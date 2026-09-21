const teamKey = (teamNumber) => String(teamNumber);

const rosterKey = (players = []) =>
  [...players].map(String).sort().join("|");

export function calculateTeamRanking(teams, games) {
  const statsByTeam = new Map();
  const teamByRoster = new Map();

  for (const team of teams) {
    const key = teamKey(team.team_number);

    statsByTeam.set(key, {
      team_number: team.team_number,
      players: team.players || [],
      wins: 0,
      losses: 0,
      pointsScored: 0,
      pointsAgainst: 0,
      pointDifference: 0,
    });
    teamByRoster.set(rosterKey(team.players), key);
  }

  for (const game of games || []) {
    const team1Key = teamByRoster.get(rosterKey(game.team1));
    const team2Key = teamByRoster.get(rosterKey(game.team2));

    // A game's scores can only be assigned when both saved rosters still
    // correspond to teams from this training.
    if (!team1Key || !team2Key || team1Key === team2Key) continue;

    const team1 = statsByTeam.get(team1Key);
    const team2 = statsByTeam.get(team2Key);
    const team1Score = Number(game.team1_score) || 0;
    const team2Score = Number(game.team2_score) || 0;

    team1.pointsScored += team1Score;
    team1.pointsAgainst += team2Score;
    team2.pointsScored += team2Score;
    team2.pointsAgainst += team1Score;

    const winnerKey = teamKey(game.winner);
    if (winnerKey === team1Key) {
      team1.wins += 1;
      team2.losses += 1;
    } else if (winnerKey === team2Key) {
      team2.wins += 1;
      team1.losses += 1;
    }
  }

  return [...statsByTeam.values()]
    .map((team) => ({
      ...team,
      pointDifference: team.pointsScored - team.pointsAgainst,
    }))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        a.losses - b.losses ||
        b.pointDifference - a.pointDifference ||
        b.pointsScored - a.pointsScored ||
        String(a.team_number).localeCompare(String(b.team_number), undefined, {
          numeric: true,
        }),
    );
}
