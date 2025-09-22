import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const ADMIN_PASS = "treino123"; // change this

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passInput, setPassInput] = useState("");

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("name", { ascending: true });
    if (error) setError(error.message);
    else setPlayers(data || []);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const { error } = await supabase.from("players").insert([
      { name: newName, attendance: 0, total_points: 0 },
    ]);

    if (error) setError(error.message);
    else {
      setNewName("");
      fetchPlayers();
    }
  };

  const checkPassword = () => {
    if (passInput === ADMIN_PASS) {
      setIsAdmin(true);
      setPassInput("");
    } else {
      alert("❌ Wrong password");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">👥 Jogadores</h1>

      {error && (
        <p className="text-red-500 bg-red-100 p-2 rounded mb-4">{error}</p>
      )}

      {/* Player list */}
      <ul className="divide-y divide-gray-200 mb-6">
        {players.map((p) => (
          <li key={p.id} className="py-2 flex justify-between">
            <span className="font-medium">{p.name}</span>
            <span className="text-sm text-gray-600">
              Treinos: {p.attendance} | Pontos: {p.total_points}
            </span>
          </li>
        ))}
      </ul>

      {/* Admin section */}
      {!isAdmin ? (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">🔒 Admin login</h2>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Password"
              className="border px-3 py-2 flex-1 rounded"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
            />
            <button
              onClick={checkPassword}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Login
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleAddPlayer}
          className="mt-4 p-4 border rounded bg-green-50"
        >
          <h2 className="font-semibold mb-2">➕ Adicionar Jogador</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome do jogador"
              className="border px-3 py-2 flex-1 rounded"
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
