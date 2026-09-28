import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  filterPlayersForRanking,
  formatAttendanceRecord,
  getCurrentSeasonAverage,
  getCurrentSeasonAttendance,
  getPreviousSeasonAttendance,
  getPreviousSeasonPoints,
  PREVIOUS_SEASON_TOTAL_TRAININGS,
  rankPlayersByPointsAndAttendance,
} from "../utils/attendancePriority";
import { getPlayerMonthlyStats } from "../utils/monthlyStats";
import { useCurrentMonthStats } from "../useCurrentMonthStats";
import { useCurrentSeasonTrainingTotal } from "../useCurrentSeasonTrainingTotal";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [showPreviousSeason, setShowPreviousSeason] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [playersError, setPlayersError] = useState(null);
  const currentSeasonTotal = useCurrentSeasonTrainingTotal();
  const {
    statsByPlayer,
    loading: loadingMonth,
    error: monthError,
  } = useCurrentMonthStats();

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("total_points", { ascending: false });

      if (error) setPlayersError(error.message);
      else setPlayers(rankPlayersByPointsAndAttendance(data || []));
      setLoadingPlayers(false);
    };

    fetchPlayers();
  }, []);

  if (loadingPlayers || loadingMonth) {
    return <p className="p-4 text-white">⏳ A carregar...</p>;
  }

  const error = playersError || monthError;
  if (error) return <p className="p-4 text-red-400">Erro: {error}</p>;

  const visiblePlayers = filterPlayersForRanking(players, showPreviousSeason);

  return (
    <div className="mx-auto max-w-5xl rounded-2xl bg-gray-800 p-4 text-white shadow-lg sm:p-6">
      <h1 className="mb-4 text-center text-3xl font-bold">🏆 Ranking</h1>

      <div className="mb-5 flex justify-center">
        <button
          type="button"
          onClick={() => setShowPreviousSeason((current) => !current)}
          className="rounded-lg bg-gray-700 px-4 py-2 font-semibold text-gray-100 hover:bg-gray-600"
        >
          {showPreviousSeason ? "Ocultar época anterior" : "Mostrar época anterior"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] table-auto border-collapse overflow-hidden rounded">
          <thead>
            <tr className="bg-gray-700 text-gray-200">
              <th className="sticky left-0 z-20 border border-gray-600 bg-gray-700 p-2 shadow-[2px_0_4px_rgba(0,0,0,0.35)]">
                Nome
              </th>
              <th className="border border-gray-600 p-2">Treinos no mês</th>
              <th className="border border-gray-600 p-2">Pontos do mês</th>
              <th className="border border-gray-600 p-2">Treinos na época</th>
              <th className="border border-gray-600 p-2">Pontos na época</th>
              <th className="border border-gray-600 p-2">Média</th>
              {showPreviousSeason && (
                <>
                  <th className="border border-gray-600 p-2">Treinos 25/26</th>
                  <th className="border border-gray-600 p-2">Pontos 25/26</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {visiblePlayers.map((player, index) => {
              const monthlyStats = getPlayerMonthlyStats(statsByPlayer, player.id);

              return (
                <tr
                  key={player.id}
                  className={`${index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"} text-center`}
                >
                  <td
                    className={`sticky left-0 z-10 border border-gray-700 p-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.35)] ${
                      index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
                    }`}
                  >
                    {player.name}
                  </td>
                  <td className="border border-gray-700 p-2">
                    {monthlyStats.practices}
                  </td>
                  <td className="border border-gray-700 p-2 font-bold text-purple-300">
                    {monthlyStats.points}
                  </td>
                  <td className="border border-gray-700 p-2">
                    {formatAttendanceRecord(
                      getCurrentSeasonAttendance(player),
                      currentSeasonTotal,
                    )}
                  </td>
                  <td className="border border-gray-700 p-2 font-bold text-green-400">
                    {player.total_points}
                  </td>
                  <td className="border border-gray-700 p-2">
                    {getCurrentSeasonAverage(player).toFixed(2)}
                  </td>
                  {showPreviousSeason && (
                    <>
                      <td className="border border-gray-700 p-2">
                        {formatAttendanceRecord(
                          getPreviousSeasonAttendance(player),
                          PREVIOUS_SEASON_TOTAL_TRAININGS,
                        )}
                      </td>
                      <td className="border border-gray-700 p-2 font-bold text-yellow-400">
                        {getPreviousSeasonPoints(player)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
