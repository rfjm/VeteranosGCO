import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ADMIN_PASS = "treino123"; // reuse from players

export default function Training() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [players, setPlayers] = useState([]);
  const [present, setPresent] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [error, setError] = useState(null);

  // admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [choice12, setChoice12] = useState(null);

  // teams
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetchPlayers();
    fetchTrainings();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("name");
    if (error) setError(error.message);
    else setPlayers(data || []);
  };

  const fetchTrainings = async () => {
    const { data, error } = await supabase
      .from("trainings")
      .select("*")
      .order("date", { ascending: false });
    if (error) setError(error.message);
    else setTrainings(data || []);
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
      setSelectedTraining(data);
      fetchTrainings();
    }
  };

const deleteTraining = async (id) => {
  const { error } = await supabase.from("trainings").delete().eq("id", id);

  if (error) {
    setError(error.message);
  } else {
    setTrainings((prev) => prev.filter((t) => t.id !== id));
    if (selectedTraining?.id === id) {
      setSelectedTraining(null);
      setPresent([]);
      setTeams([]);
    }

    // 🔄 Recalcular stats
    await supabase.rpc("recalculate_all_player_stats");
  }
};




  const updateTraining = async (id, newDate) => {
    const { error } = await supabase
      .from("trainings")
      .update({ date: newDate })
      .eq("id", id);
    if (error) setError(error.message);
    else fetchTrainings();
  };

  const togglePresence = (id) => {
    setPresent((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const generateTeams = () => {
    const selectedPlayers = players.filter((p) => present.includes(p.id));
    const newTeams = generateBalancedTeams(selectedPlayers);

    setTeams(newTeams);
    saveTeams(newTeams);
  };

  const checkPassword = () => {
    if (passInput === ADMIN_PASS) {
      setIsAdmin(true);
      setPassInput("");
    } else {
      alert("❌ Wrong password");
    }
  };

  // fetch attendance for a training
  const fetchAttendance = async (trainingId) => {
    const { data, error } = await supabase
      .from("training_attendance")
      .select("player_id")
      .eq("training_id", trainingId);

    if (error) {
      setError(error.message);
    } else {
      setPresent(data.map((a) => a.player_id));
    }
  };

  // save attendance
 const saveAttendance = async () => {
  if (!selectedTraining) return;

  // Clear old attendance
  await supabase
    .from("training_attendance")
    .delete()
    .eq("training_id", selectedTraining.id);

  // Insert new attendance
  const rows = present.map((pid) => ({
    training_id: selectedTraining.id,
    player_id: pid,
  }));
  await supabase.from("training_attendance").insert(rows);

  // Atualizar players.trainings_played
  await supabase.rpc("reset_training_counts"); // 🔥 vamos criar isto
  await supabase.rpc("recalculate_training_counts");

  alert("✅ Presenças guardadas!");
};

  const saveTeams = async (generatedTeams) => {
    if (!selectedTraining) return;

    await supabase
      .from("training_teams")
      .delete()
      .eq("training_id", selectedTraining.id);

    const rows = generatedTeams.map((team, idx) => ({
      training_id: selectedTraining.id,
      team_number: idx + 1,
      players: team.map((p) => p.id),
    }));

    await supabase.from("training_teams").insert(rows);

    alert("✅ Equipas guardadas!");
  };

  // TODO: melhorar o gerador de equipas (baseado no ranking, máx. 3 equipas, etc.)
  const generateBalancedTeams = (players) => {
  const sorted = [...players].sort((a, b) => b.total_points - a.total_points);
  const n = sorted.length;
  let numTeams;

  if (n <= 11) {
    numTeams = 2;
  } else if (n === 12 || n === 13 || n === 14) {
    if (!choice12) {
      alert("⚠️ Tens de escolher 2 ou 3 equipas antes de gerar!");
      return [];
    }
    numTeams = parseInt(choice12, 10); // "2" ou "3"
  } else {
    numTeams = 3;
  }

  const teams = Array.from({ length: numTeams }, () => []);

  let direction = 1;
  let teamIndex = 0;

  for (const player of sorted) {
    teams[teamIndex].push(player);

    teamIndex += direction;
    if (teamIndex === numTeams) {
      teamIndex = numTeams - 1;
      direction = -1;
    } else if (teamIndex < 0) {
      teamIndex = 0;
      direction = 1;
    }
  }

  return teams;
};




  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-800 text-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">🏀 Treinos</h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Create new training */}
      <div className="mb-6 flex gap-2 items-center justify-center">
        <label className="font-semibold">Data:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white"
        />
        <button
          onClick={createTraining}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Criar treino
        </button>
      </div>

      {/* Trainings list */}
      <h2 className="text-xl font-semibold mb-2">📅 Treinos Anteriores</h2>
      <ul className="divide-y divide-gray-700 mb-6">
        {trainings.map((t) => (
          <li
            key={t.id}
            className={`flex justify-between items-center py-3 px-3 rounded hover:bg-gray-700 cursor-pointer ${
              selectedTraining?.id === t.id ? "bg-gray-700" : ""
            }`}
            onClick={() => {
              if (selectedTraining?.id === t.id) {
                setSelectedTraining(null);
                setPresent([]);
              } else {
                setSelectedTraining(t);
                fetchAttendance(t.id);
              }
            }}
          >
            <span>{new Date(t.date).toLocaleDateString()}</span>
            {isAdmin && (
              <div className="flex gap-2">
                <input
                  type="date"
                  defaultValue={t.date}
                  onChange={(e) => updateTraining(t.id, e.target.value)}
                  className="px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTraining(t.id);
                  }}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Apagar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Select players */}
      {selectedTraining && (
        <>
          <h2 className="text-xl font-semibold mb-2">👥 Jogadores</h2>
          {isAdmin ? (
            <>
              <ul className="grid grid-cols-2 gap-2 mb-4">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className={`flex items-center gap-2 p-2 border rounded ${
                      present.includes(p.id) ? "bg-green-600" : "bg-gray-700"
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
              <button
  onClick={saveAttendance}
  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
>
  Guardar Presenças
</button>

{present.length >= 12 && present.length <= 14 && (
  <div className="mb-4">
    <label className="mr-2">Formato:</label>
    <select
      value={choice12 || ""}
      onChange={(e) => setChoice12(e.target.value)}
      className="border px-2 py-1 rounded bg-gray-700 text-white"
    >
      <option value="">-- escolher --</option>
      <option value="2">2 equipas</option>
      <option value="3">3 equipas</option>
    </select>
  </div>
)}

<button
  onClick={generateTeams}
  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
>
  Gerar Equipas
</button>

            </>
          ) : (
            <ul className="grid grid-cols-2 gap-2 mb-4">
              {players
                .filter((p) => present.includes(p.id))
                .map((p) => (
                  <li
                    key={p.id}
                    className="p-2 bg-green-600 rounded text-center font-medium"
                  >
                    {p.name}
                  </li>
                ))}
            </ul>
          )}
        </>
      )}

      {/* Show generated teams */}
      {teams.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-center">⚡ Equipas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map((team, idx) => (
              <div
                key={idx}
                className="p-4 border rounded bg-gray-700 shadow-sm"
              >
                <h3 className="font-bold mb-2 text-blue-300">
                  Equipa {idx + 1}
                </h3>
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

      {/* Admin login */}
      {!isAdmin && (
        <div className="mt-6 p-4 border rounded bg-gray-700">
          <h2 className="font-semibold mb-2">🔒 Admin login</h2>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Password"
              className="border px-3 py-2 flex-1 rounded bg-gray-600 text-white"
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
      )}
    </div>
  );
}
