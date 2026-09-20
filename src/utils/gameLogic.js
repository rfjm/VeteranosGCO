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
