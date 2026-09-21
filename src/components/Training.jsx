  import { useState, useEffect, useCallback } from "react";
  import { supabase } from "../supabaseClient";
  import { createBalancedTeams, getTeamAverage } from "../utils/teamGenerator";
  import { useAuth } from "../useAuth";
  import TrainingCalendar from "./TrainingCalendar";
  import { dateFromKey, dateKey } from "../utils/calendar";
  import { prioritizeAvailablePlayers } from "../utils/attendancePriority";

  export default function Training() {
    const [players, setPlayers] = useState([]);
    const [present, setPresent] = useState([]); // array of player IDs
    const [trainings, setTrainings] = useState([]);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [error, setError] = useState(null);

    const { isAdmin } = useAuth();

    // Teams held as arrays of FULL player objects [{id,name,total_points,...}]
    const [teams, setTeams] = useState([]);
    const [choice12, setChoice12] = useState(""); // "2" or "3" for 12–14 players
    const [editMode, setEditMode] = useState(false);

    const loadTeams = useCallback(async (trainingId) => {
      const { data, error } = await supabase.from("training_teams").select("*").eq("training_id", trainingId).order("team_number");
      if (error) {
        setError(error.message);
        return;
      }
      const toObj = (id) => players.find((p) => p.id === id);
      const hydrated = (data || []).map((row) => (row.players || []).map(toObj).filter(Boolean)) || [];
      setTeams(hydrated);
    }, [players]);

    useEffect(() => {
      fetchPlayers();
      fetchTrainings();
    }, []);

    useEffect(() => {
      if (selectedTraining && players.length) {
        loadTeams(selectedTraining.id);
        fetchAttendance(selectedTraining.id);
      }
    }, [selectedTraining, players, loadTeams]);

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

    const createTraining = async () => {
      const today = dateKey(new Date());
      const existingTraining = trainings.find(
        (training) => String(training.date).slice(0, 10) === today,
      );

      if (existingTraining) {
        setSelectedTraining(existingTraining);
        alert("ℹ️ O treino de hoje já existe e foi selecionado.");
        return;
      }

      const { data, error } = await supabase
        .from("trainings")
        .insert([{ date: today }])
        .select()
        .single();
      if (error) setError(error.message);
      else {
        setSelectedTraining(data);
        setTrainings((current) =>
          [data, ...current].sort((a, b) => String(b.date).localeCompare(String(a.date))),
        );
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
        } catch {
          // The training is still deleted if the optional stats refresh fails.
        }
      }
    };

    const togglePresence = (id) => {
      setPresent((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    };

    const fetchAttendance = async (trainingId) => {
      const { data, error } = await supabase.from("training_attendance").select("player_id").eq("training_id", trainingId);
      if (error) setError(error.message);
      else setPresent(data.map((a) => a.player_id));
    };

    const availablePlayers = players.filter((player) => present.includes(player.id));
    const attendancePriority = prioritizeAvailablePlayers(availablePlayers);
    const selectedPlayerIds = attendancePriority.selected.map((player) => player.id);

    const saveAttendance = async () => {
  if (!selectedTraining) {
    alert("⚠️ Nenhum treino selecionado!");
    return;
  }

  // wipe old attendance for this training
  const { error: delError } = await supabase
    .from("training_attendance")
    .delete()
    .eq("training_id", selectedTraining.id);

  if (delError) {
    alert("❌ Erro ao apagar presenças: " + delError.message);
    return;
  }

  // insert new attendance
  const rows = selectedPlayerIds.map((pid) => ({
    training_id: selectedTraining.id,
    player_id: pid,
  }));

  const { error: insError } = await supabase
    .from("training_attendance")
    .insert(rows);

  if (insError) {
    alert("❌ Erro ao guardar presenças: " + insError.message);
    return;
  }

  await fetchPlayers();

  if (attendancePriority.waitlisted.length) {
    alert(
      `✅ 18 presenças guardadas. Lista de espera: ${attendancePriority.waitlisted
        .map((player) => player.name)
        .join(", ")}`,
    );
  } else {
    alert("✅ Presenças guardadas!");
  }
};



    const generateTeams = async () => {
      if (!selectedTraining) {
        alert("⚠️ Cria primeiro um treino.");
        return;
      }

      const selectedPlayers = attendancePriority.selected;
      if (selectedPlayers.length < 6) {
        alert("⚠️ São precisos pelo menos 6 jogadores.");
        return;
      }

      if (selectedPlayers.length >= 12 && selectedPlayers.length <= 14 && !choice12) {
        alert("⚠️ Tens de escolher 2 ou 3 equipas antes de gerar!");
        return;
      }

      const numberOfTeams =
        selectedPlayers.length <= 11
          ? 2
          : selectedPlayers.length <= 14
            ? parseInt(choice12, 10)
            : 3;
      const newTeams = createBalancedTeams(selectedPlayers, numberOfTeams);
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
    const benchPlayers = selectedPlayerIds
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

        {/* Create today's training */}
        {isAdmin && (
          <div className="mb-6 flex justify-center">
            <button onClick={createTraining} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto">
              Criar treino de hoje
            </button>
          </div>
        )}

        <TrainingCalendar
          trainings={trainings}
          selectedTraining={selectedTraining}
          onSelect={setSelectedTraining}
        />

        {selectedTraining && (
          <div className="mb-6 flex flex-col items-center justify-between gap-2 rounded-lg bg-gray-700 p-3 sm:flex-row">
            <p>
              Treino selecionado: <strong>{dateFromKey(selectedTraining.date).toLocaleDateString("pt-PT")}</strong>
            </p>
            {isAdmin && (
              <button
                onClick={() => deleteTraining(selectedTraining.id)}
                className="text-sm text-red-300 hover:text-red-200"
              >
                Apagar treino
              </button>
            )}
          </div>
        )}

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

                {attendancePriority.waitlisted.length > 0 && (
                  <div className="mt-4 rounded-lg border border-orange-500 bg-orange-950 p-3">
                    <p className="font-semibold text-orange-200">
                      Limite de 18 jogadores — lista de espera por assiduidade:
                    </p>
                    <p className="mt-1 text-sm text-orange-100">
                      {attendancePriority.waitlisted.map((player) => player.name).join(", ")}
                    </p>
                  </div>
                )}
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
                  <h3 className="font-bold text-blue-300">Equipa {idx + 1}</h3>
                  <p className="mb-2 text-sm text-gray-300">
                    Média: {getTeamAverage(team).toFixed(2)}
                  </p>
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

      </div>
    );
  }
