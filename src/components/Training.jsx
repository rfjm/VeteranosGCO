  import { useState, useEffect } from "react";
  import { supabase } from "../supabaseClient";

  const ADMIN_PASS = "treino123";

  export default function Training() {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [players, setPlayers] = useState([]);
    const [present, setPresent] = useState([]); // array of player IDs
    const [trainings, setTrainings] = useState([]);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [error, setError] = useState(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [passInput, setPassInput] = useState("");

    // Teams held as arrays of FULL player objects [{id,name,total_points,...}]
    const [teams, setTeams] = useState([]);
    const [choice12, setChoice12] = useState(""); // "2" or "3" for 12–14 players
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
      fetchPlayers();
      fetchTrainings();
    }, []);

    useEffect(() => {
      if (selectedTraining && players.length) {
        loadTeams(selectedTraining.id);
        fetchAttendance(selectedTraining.id);
      }
    }, [selectedTraining, players]);

    const fetchPlayers = async () => {
      const { data, error } = await supabase.from("players").select("*").order("name");
      if (error) setError(error.message);
      else setPlayers(data || []);
    };

    const fetchTrainings = async () => {
      const { data, error } = await supabase.from("trainings").select("*").order("date", { ascending: false });
      if (error) setError(error.message);
      else setTrainings(data || []);
    };

    const shuffleArray = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };


    const createTraining = async () => {
      const { data, error } = await supabase.from("trainings").insert([{ date }]).select().single();
      if (error) setError(error.message);
      else {
        setSelectedTraining(data);
        fetchTrainings();
      }
    };

    const deleteTraining = async (id) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) setError(error.message);
      else {
        setTrainings((prev) => prev.filter((t) => t.id !== id));
        if (selectedTraining?.id === id) {
          setSelectedTraining(null);
          setPresent([]);
          setTeams([]);
          setEditMode(false);
        }
        try {
          await supabase.rpc("recalculate_all_player_stats");
        } catch {}
      }
    };

    const updateTraining = async (id, newDate) => {
      const { error } = await supabase.from("trainings").update({ date: newDate }).eq("id", id);
      if (error) setError(error.message);
      else fetchTrainings();
    };

    const togglePresence = (id) => {
      setPresent((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    };

    const fetchAttendance = async (trainingId) => {
      const { data, error } = await supabase.from("training_attendance").select("player_id").eq("training_id", trainingId);
      if (error) setError(error.message);
      else setPresent(data.map((a) => a.player_id));
    };

    const saveAttendance = async () => {
      if (!selectedTraining) return;
      await supabase.from("training_attendance").delete().eq("training_id", selectedTraining.id);
      const rows = present.map((pid) => ({ training_id: selectedTraining.id, player_id: pid }));
      await supabase.from("training_attendance").insert(rows);
      alert("✅ Presenças guardadas!");
    };

    const checkPassword = () => {
      if (passInput === ADMIN_PASS) {
        setIsAdmin(true);
        setPassInput("");
      } else {
        alert("❌ Wrong password");
      }
    };

    const loadTeams = async (trainingId) => {
      const { data, error } = await supabase.from("training_teams").select("*").eq("training_id", trainingId).order("team_number");
      if (error) {
        setError(error.message);
        return;
      }
      const toObj = (id) => players.find((p) => p.id === id);
      const hydrated = (data || []).map((row) => (row.players || []).map(toObj).filter(Boolean)) || [];
      setTeams(hydrated);
    };

  const generateBalancedTeams = (list) => {
    // Group by total_points
    const groups = {};
    for (const p of list) {
      const pts = p.total_points || 0;
      if (!groups[pts]) groups[pts] = [];
      groups[pts].push(p);
    }

    // Sort groups by points (high → low) and shuffle inside
    const sortedGroups = Object.entries(groups)
      .sort((a, b) => b[0] - a[0])
      .map(([_, players]) => shuffleArray(players));

    // Flatten back to list
    const sorted = sortedGroups.flat();

    const n = sorted.length;
    let numTeams;
    if (n <= 11) numTeams = 2;
    else if (n >= 12 && n <= 14) {
      if (!choice12) {
        alert("⚠️ Escolhe 2 ou 3 equipas antes de gerar!");
        return [];
      }
      numTeams = parseInt(choice12, 10);
    } else numTeams = 3;

    const result = Array.from({ length: numTeams }, () => []);
    let idx = 0, dir = 1;
    for (const p of sorted) {
      result[idx].push(p);
      idx += dir;
      if (idx === numTeams) {
        idx = numTeams - 1;
        dir = -1;
      } else if (idx < 0) {
        idx = 0;
        dir = 1;
      }
    }
    return result;
  };


    const generateTeams = async () => {
      if (!selectedTraining) {
        alert("⚠️ Cria primeiro um treino.");
        return;
      }

      const selectedPlayers = players.filter((p) => present.includes(p.id));
      if (selectedPlayers.length < 6) {
        alert("⚠️ São precisos pelo menos 6 jogadores.");
        return;
      }

      if (selectedPlayers.length >= 12 && selectedPlayers.length <= 14 && !choice12) {
        alert("⚠️ Tens de escolher 2 ou 3 equipas antes de gerar!");
        return;
      }

      const newTeams = generateBalancedTeams(selectedPlayers);
      if (!newTeams || newTeams.length === 0) return;

      setTeams(newTeams);
      setEditMode(true);

      // overwrite in DB
      await supabase.from("training_teams").delete().eq("training_id", selectedTraining.id);

      const rows = newTeams.map((team, idx) => ({
        training_id: selectedTraining.id,
        team_number: idx + 1,
        players: team.map((p) => p.id),
      }));

      const { error } = await supabase.from("training_teams").insert(rows);
      if (error) setError(error.message);
      else alert("✅ Novas equipas geradas e guardadas!");
    };

    // ====== EDIT MODE helpers ======
    const assignedIds = new Set(teams.flat().map((p) => p.id));
    const benchPlayers = present
      .filter((pid) => !assignedIds.has(pid))
      .map((pid) => players.find((p) => p.id === pid))
      .filter(Boolean);

    const addPlayerToTeam = (playerId, teamIdx) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return;
      setTeams((prev) => {
        if (prev[teamIdx].some((x) => x.id === playerId)) return prev;
        return prev.map((team, i) => (i === teamIdx ? [...team, player] : team));
      });
    };

    const removePlayerFromTeam = (teamIdx, playerId) => {
      setTeams((prev) => prev.map((team, i) => (i === teamIdx ? team.filter((p) => p.id !== playerId) : team)));
    };

    const movePlayerBetweenTeams = (fromIdx, playerId, toIdx) => {
      setTeams((prev) => {
        const copy = prev.map((t) => [...t]);
        const fromTeam = copy[fromIdx];
        const player = fromTeam.find((p) => p.id === playerId);
        if (!player) return prev;
        copy[fromIdx] = fromTeam.filter((p) => p.id !== playerId);
        if (!copy[toIdx].some((p) => p.id === playerId)) {
          copy[toIdx] = [...copy[toIdx], player];
        }
        return copy;
      });
    };

    const persistEditedTeams = async () => {
      await supabase.from("training_teams").delete().eq("training_id", selectedTraining.id);

      const rows = teams.map((team, idx) => ({
        training_id: selectedTraining.id,
        team_number: idx + 1,
        players: team.map((p) => p.id),
      }));

      await supabase.from("training_teams").insert(rows);
      setEditMode(false);
      alert("✅ Alterações guardadas!");
    };

    return (
      <div className="w-full max-w-4xl mx-auto bg-gray-800 text-white rounded-2xl shadow-lg p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">🏀 Treinos</h1>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {/* Create new training */}
        <div className="mb-6 flex flex-col sm:flex-row gap-2 items-center justify-center">
          <label className="font-semibold">Data:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white"
          />
          <button onClick={createTraining} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto">
            Criar treino
          </button>
        </div>

        {/* Trainings list */}
        <h2 className="text-xl font-semibold mb-2">📅 Treinos Anteriores</h2>
        <ul className="divide-y divide-gray-700 mb-6">
          {trainings.map((t) => (
            <li
              key={t.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-3 rounded hover:bg-gray-700 cursor-pointer ${
                selectedTraining?.id === t.id ? "bg-gray-700" : ""
              }`}
              onClick={() => {
                if (selectedTraining?.id === t.id) {
                  setSelectedTraining(null);
                  setPresent([]);
                  setTeams([]);
                  setEditMode(false);
                } else {
                  setSelectedTraining(t);
                }
              }}
            >
              <span>{new Date(t.date).toLocaleDateString()}</span>
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2">
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

        {/* Players + Generate Teams */}
        {selectedTraining && (
          <>
            <h2 className="text-xl font-semibold mb-2">👥 Jogadores</h2>

            {isAdmin ? (
              <>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {players.map((p) => (
                    <li
                      key={p.id}
                      className={`flex items-center gap-2 p-2 border rounded ${present.includes(p.id) ? "bg-green-700" : "bg-gray-700"}`}
                    >
                      <input type="checkbox" checked={present.includes(p.id)} onChange={() => togglePresence(p.id)} />
                      <span>{p.name}</span>
                    </li>
                  ))}
                </ul>

                {present.length >= 12 && present.length <= 14 && (
                  <div className="mb-4">
                    <label className="mr-2">Formato:</label>
                    <select
                      value={choice12}
                      onChange={(e) => setChoice12(e.target.value)}
                      className="border px-2 py-1 rounded bg-gray-700 text-white"
                    >
                      <option value="">-- escolher --</option>
                      <option value="2">2 equipas</option>
                      <option value="3">3 equipas</option>
                    </select>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={saveAttendance} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full sm:w-auto">
                    Guardar Presenças
                  </button>
                  <button onClick={generateTeams} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto">
                    Gerar Equipas
                  </button>
                  {teams.length > 0 && (
                    <button
                      onClick={() => setEditMode((v) => !v)}
                      className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 w-full sm:w-auto"
                    >
                      {editMode ? "Terminar Edição" : "Editar Equipas"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {players
                  .filter((p) => present.includes(p.id))
                  .map((p) => (
                    <li key={p.id} className="p-2 bg-green-700 rounded text-center font-medium">
                      {p.name}
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}

        {/* Teams + Bench */}
        {teams.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">⚡ Equipas</h2>
              {isAdmin && editMode && (
                <div className="flex gap-2">
                  <button onClick={persistEditedTeams} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm">
                    Guardar Alterações
                  </button>
                  <button onClick={() => setEditMode(false)} className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm">
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {teams.map((team, idx) => (
                <div key={idx} className="p-4 border rounded bg-gray-700 shadow-sm">
                  <h3 className="font-bold mb-2 text-blue-300">Equipa {idx + 1}</h3>
                  <ul className="space-y-2">
                    {team.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 bg-gray-800 px-2 py-2 rounded">
                        <span>{p.name}</span>
                        {editMode && (
                          <div className="flex gap-2">
                            {teams.map((_, tIdx) =>
                              tIdx !== idx ? (
                                <button
                                  key={tIdx}
                                  onClick={() => movePlayerBetweenTeams(idx, p.id, tIdx)}
                                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                                >
                                  → {tIdx + 1}
                                </button>
                              ) : null
                            )}
                            <button
                              onClick={() => removePlayerFromTeam(idx, p.id)}
                              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {editMode && (
              <div className="p-4 border rounded bg-gray-700 shadow-sm">
                <h3 className="font-bold mb-2 text-yellow-300">🧍‍♂️ Sem equipa (presentes)</h3>
                {benchPlayers.length === 0 ? (
                  <p className="text-sm text-gray-300">Sem jogadores por atribuir.</p>
                ) : (
                  <ul className="space-y-2">
                    {benchPlayers.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 bg-gray-800 px-2 py-2 rounded">
                        <span>{p.name}</span>
                        <div className="flex gap-2">
                          {teams.map((_, tIdx) => (
                            <button
                              key={tIdx}
                              onClick={() => addPlayerToTeam(p.id, tIdx)}
                              className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
                            >
                              + {tIdx + 1}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className="mt-6 p-4 border rounded bg-gray-700">
            <h2 className="font-semibold mb-2">🔒 Admin login</h2>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="password"
                placeholder="Password"
                className="border px-3 py-2 flex-1 rounded bg-gray-600 text-white"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
              />
              <button onClick={checkPassword} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto">
                Login
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
