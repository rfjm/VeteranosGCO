import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [mvp, setMvp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: ranking, error: rankingError } = await supabase
        .from("player_ranking")
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

      setPlayers(ranking || []);
      setMvp(mvpMes || null);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <p className="p-4">⏳ A carregar...</p>;
  if (error) return <p className="p-4 text-red-500">Erro: {error}</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">🏆 Leaderboard</h1>

      {mvp && (
        <div className="mb-6 p-4 border rounded bg-purple-100 text-center">
          <h2 className="font-semibold text-lg mb-2">🌟 MVP do Mês</h2>
          <p className="text-xl font-bold">{mvp.name}</p>
          <p className="text-gray-700">{mvp.total_points} pontos</p>
        </div>
      )}

      <table className="table-auto w-full border rounded overflow-hidden shadow-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Treinos</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Média</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr
              key={p.player_id}
              className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} text-center`}
            >
              <td className="p-2 border font-medium">{p.name}</td>
              <td className="p-2 border">{p.trainings_played}</td>
              <td className="p-2 border font-bold">{p.total_points}</td>
              <td className="p-2 border">{p.average_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
