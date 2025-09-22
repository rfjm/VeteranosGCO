import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [mvp, setMvp] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // ranking
      const { data: ranking } = await supabase
        .from("player_ranking") // view no Supabase
        .select("*")
        .order("total_points", { ascending: false });
      setPlayers(ranking || []);

      // MVP
      const { data: mvpMes } = await supabase
        .from("mvp_mes") // view no Supabase
        .select("*")
        .limit(1)
        .single();
      setMvp(mvpMes);
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🏆 Leaderboard</h1>
      {mvp && (
        <div className="mb-6 p-4 border rounded bg-purple-100">
          <h2 className="font-semibold">MVP do Mês</h2>
          <p>{mvp.name} — {mvp.total_points} pontos</p>
        </div>
      )}
      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Treinos</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Média</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.player_id}>
              <td className="p-2 border">{p.name}</td>
              <td className="p-2 border">{p.trainings_played}</td>
              <td className="p-2 border">{p.total_points}</td>
              <td className="p-2 border">{p.average_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
