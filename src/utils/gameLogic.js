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

export const clampGameDuration = (minutes, seconds) => {
  const parsedMinutes = Number(minutes);
  const parsedSeconds = Number(seconds);
  const safeMinutes = Number.isFinite(parsedMinutes)
    ? Math.max(0, Math.floor(parsedMinutes))
    : 0;
  const safeSeconds = Number.isFinite(parsedSeconds)
    ? Math.max(0, Math.floor(parsedSeconds))
    : 0;

  return Math.min(30 * 60, safeMinutes * 60 + safeSeconds);
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

const GAME_SEQUENCE = [
  [1, 2],
  [1, 3],
  [2, 3],
];

export const getNextTeamPair = (selectedTeams, allTeams) => {
  if (selectedTeams.length !== 2 || allTeams.length < 3) return selectedTeams;

  const currentNumbers = selectedTeams
    .map((team) => Number(team.team_number))
    .sort((a, b) => a - b);
  const currentIndex = GAME_SEQUENCE.findIndex(
    ([first, second]) => first === currentNumbers[0] && second === currentNumbers[1],
  );
  if (currentIndex === -1) return selectedTeams;

  const nextNumbers = GAME_SEQUENCE[(currentIndex + 1) % GAME_SEQUENCE.length];
  const teamByNumber = new Map(
    allTeams.map((team) => [Number(team.team_number), team]),
  );
  const nextTeams = nextNumbers.map((teamNumber) => teamByNumber.get(teamNumber));

  return nextTeams.every(Boolean) ? nextTeams : selectedTeams;
};
