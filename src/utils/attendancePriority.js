const attendanceValue = (player, field, fallback = 0) => {
  const value = Number(player?.[field]);
  return Number.isFinite(value) ? value : fallback;
};

export const PREVIOUS_SEASON_TOTAL_TRAININGS = 61;
export const CURRENT_SEASON_START_DATE = "2026-09-01";
export const HISTORIC_TEAM_RATING_DATE = "2026-09-22";

export const formatAttendanceRecord = (attendance, totalTrainings) =>
  `${Math.max(0, Number(attendance) || 0)}/${Math.max(0, Number(totalTrainings) || 0)}`;

export const getPreviousSeasonAttendance = (player) =>
  attendanceValue(
    player,
    "previous_season_trainings",
    attendanceValue(player, "trainings_played"),
  );

export const getCurrentSeasonAttendance = (player) =>
  attendanceValue(player, "current_season_trainings");

export const getPreviousSeasonPoints = (player) =>
  attendanceValue(player, "previous_season_points");

const pointsPerAttendance = (points, attendance) => {
  const appearances = Math.max(0, Number(attendance) || 0);
  return appearances > 0 ? (Number(points) || 0) / appearances : 0;
};

export const getPlayerTeamRating = (player, trainingDate) => {
  const date = String(trainingDate || "").slice(0, 10);

  if (date === HISTORIC_TEAM_RATING_DATE) {
    return pointsPerAttendance(
      getPreviousSeasonPoints(player),
      getPreviousSeasonAttendance(player),
    );
  }

  return pointsPerAttendance(
    attendanceValue(player, "total_points"),
    getCurrentSeasonAttendance(player),
  );
};

export const getCombinedAttendance = (player) =>
  getPreviousSeasonAttendance(player) + getCurrentSeasonAttendance(player);

export const rankPlayersByPointsAndAttendance = (players) =>
  [...players].sort((first, second) => {
    const pointsDifference =
      (Number(second.total_points) || 0) - (Number(first.total_points) || 0);
    if (pointsDifference !== 0) return pointsDifference;

    const attendanceDifference =
      getCombinedAttendance(second) - getCombinedAttendance(first);
    if (attendanceDifference !== 0) return attendanceDifference;

    return String(first.name || "").localeCompare(String(second.name || ""), "pt");
  });

export const prioritizeAvailablePlayers = (availablePlayers, limit = 18) => {
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0));
  const ranked = [...availablePlayers].sort((first, second) => {
    const combinedDifference =
      getCombinedAttendance(second) - getCombinedAttendance(first);
    if (combinedDifference !== 0) return combinedDifference;

    const currentDifference =
      getCurrentSeasonAttendance(second) - getCurrentSeasonAttendance(first);
    if (currentDifference !== 0) return currentDifference;

    const previousDifference =
      getPreviousSeasonAttendance(second) - getPreviousSeasonAttendance(first);
    if (previousDifference !== 0) return previousDifference;

    const nameDifference = String(first.name || "").localeCompare(
      String(second.name || ""),
      "pt",
    );
    if (nameDifference !== 0) return nameDifference;

    return String(first.id).localeCompare(String(second.id));
  });

  return {
    selected: ranked.slice(0, safeLimit),
    waitlisted: ranked.slice(safeLimit),
  };
};
