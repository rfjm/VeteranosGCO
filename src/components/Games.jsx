import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Games() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [timer, setTimer] = useState(600);
  const [durationChoice, setDurationChoice] = useState(600);
  const [running, setRunning] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [showPlayers, setShowPlayers] = useState({});
  const [allPlayers, setAllPlayers] = useState([]);

  // 👉 Fetch trainings and auto-select the latest
  useEffect(() => {
    const fetchTrainings = async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data.length > 0) {
        setTrainings(data);
        setSelectedTraining(data[0]);
      }
    };
    fetchTrainings();
    fetchAllPlayers();
  }, []);

  // 👉 Fetch teams whenever selectedTraining changes
  useEffect(() => {
    if (selectedTraining) {
      fetchTeams(selectedTraining.id);
    }
  }, [selectedTraining]);

  const fetchTeams = async (trainingId) => {
    const { data, error } = await supabase
      .from("training_teams")
      .select("*")
      .eq("training_id", trainingId)
      .order("team_number");

    if (!error) setTeams(data || []);
  };

  const fetchAllPlayers = async () => {
    const { data, error } = await supabase.from("players").select("id, name");
    if (!error) setAllPlayers(data);
  };

  const getPlayerName = (id) => {
    const player = allPlayers.find((p) => p.id === id);
    return player ? player.name : id;
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (running && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      setRunning(false);
    }
    return () => clearInterval(interval);
  }, [running, timer]);

  const toggleTeamSelection = (team) => {
    if (selectedTeams.some((t) => t.id === team.id)) {
      setSelectedTeams((prev) => prev.filter((t) => t.id !== team.id));
    } else if (selectedTeams.length < 2) {
      setSelectedTeams((prev) => [...prev, team]);
    } else {
      alert("⚠️ Só pode escolher 2 equipas!");
    }
  };

  const resetGame = () => {
    setTimer(durationChoice);
    setTeam1Score(0);
    setTeam2Score(0);
    setRunning(false);
  };

  const saveGame = async () => {
    if (selectedTeams.length !== 2 || !selectedTraining) return;

    const winner =
      team1Score > team2Score
        ? selectedTeams[0].team_number
        : selectedTeams[1].team_number;

    const { error } = await supabase.from("games").insert([
      {
        training_id: selectedTraining.id,
        team1: selectedTeams[0].players,
        team2: selectedTeams[1].players,
        team1_score: team1Score,
        team2_score: team2Score,
        winner,
        date: selectedTraining.date,
        duration_minutes: durationChoice / 60,
      },
    ]);

    if (error) {
      alert("❌ Erro ao guardar jogo: " + error.message);
    } else {
      alert("✅ Jogo guardado!");
      resetGame();
    }
  };

  const endTraining = async () => {
    if (!selectedTraining) return;

    // fetch all teams for training
    const { data: allTeams, error: teamsErr } = await supabase
      .from("training_teams")
      .select("id, team_number, players")
      .eq("training_id", selectedTraining.id)
      .order("team_number");

    if (teamsErr) {
      alert("Erro ao buscar equipas: " + teamsErr.message);
      return;
    }

    // init wins
    const winsMap = {};
    for (const t of allTeams) winsMap[t.team_number] = 0;

    // fetch games
    const { data: games, error: gamesErr } = await supabase
      .from("games")
      .select("winner")
      .eq("training_id", selectedTraining.id);

    if (gamesErr) {
      alert("Erro ao buscar jogos: " + gamesErr.message);
      return;
    }

    for (const g of games || []) {
      if (g?.winner != null && winsMap[g.winner] != null) {
        winsMap[g.winner] += 1;
      }
    }

    // rank teams
    const ranking = allTeams
      .map((t) => ({
        team_number: t.team_number,
        players: t.players || [],
        wins: winsMap[t.team_number] || 0,
      }))
      .sort((a, b) => b.wins - a.wins);

    const places = Math.min(ranking.length, 3);
    const pointsByPlace = places === 2 ? [3, 2] : [3, 2, 1];

    for (let i = 0; i < places; i++) {
      const team = ranking[i];
      const add = pointsByPlace[i];

      for (const playerId of team.players) {
        const { data: current } = await supabase
          .from("players")
          .select("total_points")
          .eq("id", playerId)
          .single();

        const newTotal = (current?.total_points || 0) + add;

        await supabase
          .from("players")
          .update({ total_points: newTotal })
          .eq("id", playerId);
      }
    }

    alert("✅ Pontos atribuídos!");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-900 text-white rounded-2xl shadow-lg">
      <h1 className="text-4xl font-bold mb-8 text-center">🎮 Jogos</h1>

      {/* Duration selector */}
      <div className="flex justify-center mb-6">
        <label className="mr-3 font-semibold">⏱ Duração:</label>
        <select
          value={durationChoice}
          onChange={(e) => {
            setDurationChoice(Number(e.target.value));
            setTimer(Number(e.target.value));
          }}
          className="px-3 py-2 rounded bg-gray-700 border border-gray-600"
        >
          <option value={300}>5 min</option>
          <option value={600}>10 min</option>
          <option value={900}>15 min</option>
          <option value={1200}>20 min</option>
        </select>
      </div>

      {/* Teams */}
      <h2 className="text-xl font-semibold mb-4">Escolhe 2 equipas:</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {teams.map((team) => (
          <div
            key={team.id}
            className={`p-4 rounded-xl cursor-pointer transition ${
              selectedTeams.some((t) => t.id === team.id)
                ? "bg-green-600"
                : "bg-gray-700"
            }`}
            onClick={() => toggleTeamSelection(team)}
          >
            <h3 className="font-bold mb-2">Equipa {team.team_number}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlayers((prev) => ({
                  ...prev,
                  [team.id]: !prev[team.id],
                }));
              }}
              className="text-yellow-400 underline text-sm"
            >
              {showPlayers[team.id] ? "Esconder Jogadores" : "Ver Jogadores"}
            </button>
            {showPlayers[team.id] && (
              <ul className="mt-2 space-y-1">
                {team.players.map((pid, i) => (
                  <li key={i} className="bg-gray-800 rounded px-2 py-1">
                    {getPlayerName(pid)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Timer + Scoreboard */}
      {selectedTeams.length === 2 && (
        <>
          <div className="text-center mb-10">
            <div className="text-8xl md:text-9xl font-mono font-bold">
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
            </div>
            <div className="flex justify-center gap-4 mt-6">
              {!running ? (
                <button
                  onClick={() => setRunning(true)}
                  className="bg-green-600 px-6 py-3 text-xl rounded"
                >
                  ▶️ Start
                </button>
              ) : (
                <button
                  onClick={() => setRunning(false)}
                  className="bg-yellow-600 px-6 py-3 text-xl rounded"
                >
                  ⏸ Pause
                </button>
              )}
              <button
                onClick={resetGame}
                className="bg-gray-600 px-6 py-3 text-xl rounded"
              >
                🔄 Reset
              </button>
              <button
                onClick={saveGame}
                className="bg-blue-600 px-6 py-3 text-xl rounded"
              >
                💾 Guardar
              </button>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="grid grid-cols-2 gap-8 mb-10 text-center">
            <div className="bg-blue-800 p-6 rounded-2xl shadow-lg">
              <h2 className="text-3xl font-bold mb-4">
                Equipa {selectedTeams[0].team_number}
              </h2>
              <p className="text-8xl font-extrabold mb-6">{team1Score}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setTeam1Score((s) => s + 1)}
                  className="bg-green-600 px-4 py-2 rounded text-xl"
                >
                  +1
                </button>
                <button
                  onClick={() => setTeam1Score((s) => Math.max(0, s - 1))}
                  className="bg-red-600 px-4 py-2 rounded text-xl"
                >
                  -1
                </button>
              </div>
            </div>

            <div className="bg-red-800 p-6 rounded-2xl shadow-lg">
              <h2 className="text-3xl font-bold mb-4">
                Equipa {selectedTeams[1].team_number}
              </h2>
              <p className="text-8xl font-extrabold mb-6">{team2Score}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setTeam2Score((s) => s + 1)}
                  className="bg-green-600 px-4 py-2 rounded text-xl"
                >
                  +1
                </button>
                <button
                  onClick={() => setTeam2Score((s) => Math.max(0, s - 1))}
                  className="bg-red-600 px-4 py-2 rounded text-xl"
                >
                  -1
                </button>
              </div>
            </div>
          </div>

          {/* End training button */}
          <div className="text-center mt-8">
            <button
              onClick={endTraining}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 text-xl rounded"
            >
              🏁 Finalizar Treino
            </button>
          </div>
        </>
      )}
    </div>
  );
}
