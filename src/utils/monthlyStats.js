import { inferPracticeTeams } from "./practiceResults.js";
import { calculateTeamRanking } from "./teamRanking.js";

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getMonthRange = (referenceDate = new Date()) => ({
  start: dateKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)),
  end: dateKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1)),
});

const emptyStats = () => ({ practices: 0, points: 0 });

export const buildMonthlyPlayerStats = (
  trainings = [],
  attendance = [],
  games = [],
) => {
  const completedTrainingIds = new Set(
    trainings
      .filter((training) => training.completed_at)
      .map((training) => String(training.id)),
  );
  const stats = new Map();
  const attendanceKeys = new Set();

  const getStats = (playerId) => {
    const key = String(playerId);
    if (!stats.has(key)) stats.set(key, emptyStats());
    return stats.get(key);
  };

  attendance.forEach((record) => {
    const trainingId = String(record.training_id);
    const playerId = String(record.player_id);
    const attendanceKey = `${trainingId}:${playerId}`;
    if (!completedTrainingIds.has(trainingId) || attendanceKeys.has(attendanceKey)) return;

    attendanceKeys.add(attendanceKey);
    getStats(playerId).practices += 1;
  });

  completedTrainingIds.forEach((trainingId) => {
    const trainingGames = games.filter(
      (game) => String(game.training_id) === trainingId,
    );
    if (!trainingGames.length) return;

    const teams = inferPracticeTeams(trainingGames);
    const ranking = calculateTeamRanking(teams, trainingGames);
    const pointsByPlace = ranking.length === 2 ? [3, 2] : [3, 2, 1];

    ranking.slice(0, 3).forEach((team, index) => {
      const awardedPoints = pointsByPlace[index] || 0;
      (team.players || []).forEach((playerId) => {
        getStats(playerId).points += awardedPoints;
      });
    });
  });

  return Object.fromEntries(stats);
};

export const getPlayerMonthlyStats = (statsByPlayer, playerId) =>
  statsByPlayer?.[String(playerId)] || emptyStats();
