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

export const getCurrentSeasonAverage = (player) =>
  pointsPerAttendance(
    attendanceValue(player, "total_points"),
    getCurrentSeasonAttendance(player),
  );

export const getPlayerTeamRating = (player, trainingDate) => {
  const date = String(trainingDate || "").slice(0, 10);

  if (date === HISTORIC_TEAM_RATING_DATE) {
    return pointsPerAttendance(
      getPreviousSeasonPoints(player),
      getPreviousSeasonAttendance(player),
    );
  }

  return getCurrentSeasonAverage(player);
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

export const filterPlayersForRanking = (players, includePreviousSeason = false) =>
  players.filter(
    (player) =>
      getCurrentSeasonAttendance(player) > 0 ||
      (includePreviousSeason && getPreviousSeasonAttendance(player) > 0),
  );

const latestPracticePoints = (pointsByPlayer, player) =>
  attendanceValue(pointsByPlayer, String(player.id));

const compareCommonProtectionTies = (
  first,
  second,
  pointsByPlayer,
  direction,
) => {
  const attendanceDifference =
    getCurrentSeasonAttendance(second) - getCurrentSeasonAttendance(first);
  if (attendanceDifference !== 0) return attendanceDifference;

  const latestPointsDifference =
    latestPracticePoints(pointsByPlayer, second) -
    latestPracticePoints(pointsByPlayer, first);
  if (latestPointsDifference !== 0) return latestPointsDifference * direction;

  const previousPointsDifference =
    getPreviousSeasonPoints(second) - getPreviousSeasonPoints(first);
  if (previousPointsDifference !== 0) return previousPointsDifference * direction;

  const previousAttendanceDifference =
    getPreviousSeasonAttendance(second) - getPreviousSeasonAttendance(first);
  if (previousAttendanceDifference !== 0) return previousAttendanceDifference;

  return String(first.name || "").localeCompare(String(second.name || ""), "pt");
};

export const selectPlayersForTeamProtection = (players, pointsByPlayer = {}) => {
  const eligible = players.filter(
    (player) =>
      getCurrentSeasonAttendance(player) > 0 &&
      attendanceValue(player, "total_points") > 0,
  );
  const top = [...eligible]
    .sort((first, second) => {
      const averageDifference =
        getCurrentSeasonAverage(second) - getCurrentSeasonAverage(first);
      return (
        averageDifference ||
        compareCommonProtectionTies(first, second, pointsByPlayer, 1)
      );
    })
    .slice(0, 3);
  const topIds = new Set(top.map((player) => String(player.id)));
  const bottom = eligible
    .filter((player) => !topIds.has(String(player.id)))
    .sort((first, second) => {
      const averageDifference =
        getCurrentSeasonAverage(first) - getCurrentSeasonAverage(second);
      return (
        averageDifference ||
        compareCommonProtectionTies(first, second, pointsByPlayer, -1)
      );
    })
    .slice(0, 3);

  return { top, bottom };
};

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
