import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../useAuth";
import {
  formatAttendanceRecord,
  getCombinedAttendance,
  getCurrentSeasonAttendance,
  getPreviousSeasonAttendance,
  getPreviousSeasonPoints,
  PREVIOUS_SEASON_TOTAL_TRAININGS,
} from "../utils/attendancePriority";
import { useCurrentSeasonTrainingTotal } from "../useCurrentSeasonTrainingTotal";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const { isAdmin } = useAuth();
  const currentSeasonTotal = useCurrentSeasonTrainingTotal();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players") // 👈 agora vai buscar à VIEW
      .select("*")
      .order("name", { ascending: true });

    if (error) setError(error.message);
    else setPlayers(data || []);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const { error } = await supabase.from("players").insert([
      { name: newName, total_points: 0 }, // já não tem attendance
    ]);

    if (error) setError(error.message);
    else {
      setNewName("");
      fetchPlayers();
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-800 text-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">👥 Jogadores</h1>

      {error && (
        <p className="text-red-500 bg-red-100 p-2 rounded mb-4">{error}</p>
      )}

      {/* Player list */}
      <ul className="divide-y divide-gray-700 mb-6">
        {players.map((p) => (
          <li key={p.id} className="py-3 flex justify-between">
            <span className="font-medium">{p.name}</span>
            <span className="text-right text-sm text-gray-400">
              Época anterior: {formatAttendanceRecord(getPreviousSeasonAttendance(p), PREVIOUS_SEASON_TOTAL_TRAININGS)}
              {" | "}
              Época atual: {formatAttendanceRecord(getCurrentSeasonAttendance(p), currentSeasonTotal)}
              <br />
              Total: {getCombinedAttendance(p)}
              <br />
              Pontos 25/26: {getPreviousSeasonPoints(p)} | Pontos 26/27: {p.total_points}
            </span>
          </li>
        ))}
      </ul>

      {/* Admin section */}
      {isAdmin && (
        <form
          onSubmit={handleAddPlayer}
          className="mt-4 p-4 border rounded bg-green-50 bg-opacity-10"
        >
          <h2 className="font-semibold mb-2">➕ Adicionar Jogador</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome do jogador"
              className="border px-3 py-2 flex-1 rounded bg-gray-600 text-white"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Adicionar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
