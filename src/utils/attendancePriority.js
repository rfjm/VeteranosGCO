const attendanceValue = (player, field, fallback = 0) => {
  const value = Number(player?.[field]);
  return Number.isFinite(value) ? value : fallback;
};

export const getPreviousSeasonAttendance = (player) =>
  attendanceValue(
    player,
    "previous_season_trainings",
    attendanceValue(player, "trainings_played"),
  );

export const getCurrentSeasonAttendance = (player) =>
  attendanceValue(player, "current_season_trainings");

export const getCombinedAttendance = (player) =>
  getPreviousSeasonAttendance(player) + getCurrentSeasonAttendance(player);

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
