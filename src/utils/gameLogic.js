export const getGameEndAction = ({
  timer,
  running,
  selectedTeamCount,
  team1Score,
  team2Score,
}) => {
  if (!running || timer !== 0) return "none";
  if (selectedTeamCount !== 2) return "missing-teams";
  if (team1Score === team2Score) return "free-throws";
  return "auto-save";
};

export const getWinnerTeamNumber = (selectedTeams, team1Score, team2Score) => {
  if (selectedTeams.length !== 2 || team1Score === team2Score) return null;
  return team1Score > team2Score
    ? selectedTeams[0].team_number
    : selectedTeams[1].team_number;
};

const rosterKey = (players = []) => [...players].map(String).sort().join("|");

export const getRecentGameResults = (games, teams, limit = 3) => {
  const teamByRoster = new Map(
    teams.map((team) => [rosterKey(team.players), team.team_number]),
  );

  return games
    .slice(-limit)
    .reverse()
    .map((game) => ({
      id: game.id,
      team1: teamByRoster.get(rosterKey(game.team1)) ?? "?",
      team2: teamByRoster.get(rosterKey(game.team2)) ?? "?",
      team1Score: game.team1_score,
      team2Score: game.team2_score,
    }));
};
