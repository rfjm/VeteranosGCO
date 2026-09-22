import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  formatAttendanceRecord,
  getCombinedAttendance,
  getCurrentSeasonAttendance,
  getPreviousSeasonAttendance,
  getPreviousSeasonPoints,
  PREVIOUS_SEASON_TOTAL_TRAININGS,
  rankPlayersByPointsAndAttendance,
} from "../utils/attendancePriority";
import { useCurrentSeasonTrainingTotal } from "../useCurrentSeasonTrainingTotal";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [mvp, setMvp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentSeasonTotal = useCurrentSeasonTrainingTotal();

  useEffect(() => {
    const fetchData = async () => {
      const { data: ranking, error: rankingError } = await supabase
        .from("players")
        .select("*")
        .order("total_points", { ascending: false });

      if (rankingError) {
        setError(rankingError.message);
        setLoading(false);
        return;
      }

      const { data: mvpMes } = await supabase
        .from("mvp_mes")
        .select("*")
        .limit(1)
        .maybeSingle();

      setPlayers(rankPlayersByPointsAndAttendance(ranking || []));
      setMvp(mvpMes || null);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <p className="p-4 text-white">⏳ A carregar...</p>;
  if (error) return <p className="p-4 text-red-400">Erro: {error}</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-800 text-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">🏆 Ranking</h1>

      {mvp && (
        <div className="mb-6 p-4 border rounded bg-purple-700 text-center text-white">
          <h2 className="font-semibold text-lg mb-2">🌟 MVP do Mês</h2>
          <p className="text-xl font-bold">{mvp.name}</p>
          <p className="text-gray-200">{mvp.total_points} pontos</p>
        </div>
      )}

      <div className="overflow-x-auto">
      <table className="table-auto w-full min-w-[820px] border-collapse rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-700 text-gray-200">
            <th className="p-2 border border-gray-600">Nome</th>
            <th className="p-2 border border-gray-600">Época anterior</th>
            <th className="p-2 border border-gray-600">Época atual</th>
            <th className="p-2 border border-gray-600">Treinos</th>
            <th className="p-2 border border-gray-600">Pontos 25/26</th>
            <th className="p-2 border border-gray-600">Pontos 26/27</th>
            <th className="p-2 border border-gray-600">Média</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr
              key={p.id}
              className={`${
                i % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
              } text-center`}
            >
              <td className="p-2 border border-gray-700 font-medium">
                {p.name}
              </td>
              <td className="p-2 border border-gray-700">
                {formatAttendanceRecord(getPreviousSeasonAttendance(p), PREVIOUS_SEASON_TOTAL_TRAININGS)}
              </td>
              <td className="p-2 border border-gray-700">
                {formatAttendanceRecord(getCurrentSeasonAttendance(p), currentSeasonTotal)}
              </td>
              <td className="p-2 border border-gray-700">
                {getCombinedAttendance(p)}
              </td>
              <td className="p-2 border border-gray-700 font-bold text-yellow-400">
                {getPreviousSeasonPoints(p)}
              </td>
              <td className="p-2 border border-gray-700 font-bold text-green-400">
                {p.total_points}
              </td>
              <td className="p-2 border border-gray-700">
                {p.average_points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
