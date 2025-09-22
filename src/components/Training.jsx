import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Training() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [players, setPlayers] = useState([]);
  const [present, setPresent] = useState([]);
  const [trainingId, setTrainingId] = useState(null);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [choice12, setChoice12] = useState(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("name");
    if (error) setError(error.message);
    else setPlayers(data || []);
  };

  const createTraining = async () => {
    const { data, error } = await supabase
      .from("trainings")
      .insert([{ date }])
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setTrainingId(data.id);
    }
  };

  const togglePresence = (id) => {
    setPresent((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const generateTeams = () => {
    alert("⚡ Gerador de equipas implementado na versão final 😉");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">🏀 Novo Treino</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-6 flex gap-2 items-center">
        <label className="font-semibold">Data:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <button
          onClick={createTraining}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Criar treino
        </button>
      </div>

      {trainingId && (
        <>
          <h2 className="text-xl font-semibold mb-2">👥 Selecionar Jogadores</h2>
          <ul className="grid grid-cols-2 gap-2 mb-4">
            {players.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-2 p-2 border rounded ${
                  present.includes(p.id) ? "bg-green-100" : "bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={present.includes(p.id)}
                  onChange={() => togglePresence(p.id)}
                />
                <span>{p.name}</span>
              </li>
            ))}
          </ul>

          {present.length === 12 && (
            <div className="mb-4">
              <label className="mr-2">Formato:</label>
              <select
                value={choice12 || ""}
                onChange={(e) => setChoice12(e.target.value)}
                className="border px-2 py-1 rounded"
              >
                <option value="">-- escolher --</option>
                <option value="3x4">3 equipas de 4</option>
                <option value="2x6">2 equipas de 6</option>
              </select>
            </div>
          )}

          <button
            onClick={generateTeams}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Gerar Equipas
          </button>
        </>
      )}

      {teams.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-center">⚡ Equipas Geradas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map((team, idx) => (
              <div key={idx} className="p-4 border rounded bg-gray-50 shadow-sm">
                <h3 className="font-bold mb-2 text-blue-700">Equipa {idx + 1}</h3>
                <ul>
                  {team.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
