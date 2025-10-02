import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function Games() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [teamColors, setTeamColors] = useState({});
  const [timer, setTimer] = useState(600);
  const [durationChoice, setDurationChoice] = useState(600);
  const [running, setRunning] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [showPlayers, setShowPlayers] = useState({});
  const [allPlayers, setAllPlayers] = useState([]);
  const [teamWins, setTeamWins] = useState({});
  const hornRef = useRef(null);

  const COLORS = {
    black: { bg: "#000000", text: "white" },
    white: { bg: "#ffffff", text: "black" },
    yellow: { bg: "#ffff00", text: "black" },
  };

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

  useEffect(() => {
    if (selectedTraining) {
      fetchTeams(selectedTraining.id);
      fetchTeamWins(selectedTraining.id);
    }
  }, [selectedTraining]);

  const fetchTeams = async (trainingId) => {
    const { data, error } = await supabase
      .from("training_teams")
      .select("*")
      .eq("training_id", trainingId)
      .order("team_number");

    if (!error) {
      setTeams(data || []);
      const defaults = {};
      (data || []).forEach((t) => {
        defaults[t.team_number] = "black"; // default color
      });
      setTeamColors(defaults);
    }
  };

  const fetchAllPlayers = async () => {
    const { data, error } = await supabase.from("players").select("id, name");
    if (!error) setAllPlayers(data);
  };

  const getPlayerName = (id) => {
    const player = allPlayers.find((p) => p.id === id);
    return player ? player.name : id;
  };

  const fetchTeamWins = async (trainingId) => {
    const { data, error } = await supabase
      .from("games")
      .select("winner")
      .eq("training_id", trainingId);

    if (error) return;

    const wins = {};
    for (const g of data) {
      if (g.winner != null) {
        wins[g.winner] = (wins[g.winner] || 0) + 1;
      }
    }
    setTeamWins(wins);
  };

  useEffect(() => {
    let interval;
    if (running && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      setRunning(false);
      if (hornRef.current) {
        hornRef.current.currentTime = 0;
        hornRef.current.play().catch(() => {
          console.warn("⚠️ Horn blocked until user interaction.");
        });
      }
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
      fetchTeamWins(selectedTraining.id);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-900 text-white rounded-2xl shadow-lg">
      <h1 className="text-4xl font-bold mb-8 text-center">🎮 Jogos</h1>

      {/* Wins summary */}
      {Object.keys(teamWins).length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📊 Vitórias até agora</h2>
          <ul className="space-y-2">
            {Object.entries(teamWins).map(([team, wins]) => (
              <li key={team} className="p-3 bg-gray-800 rounded-lg">
                Equipa {team}: <strong>{wins}</strong> vitória(s)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timer settings */}
      <div className="flex justify-center gap-6 mb-8">
        <div className="text-center">
          <label className="block mb-2 text-lg font-semibold">Min</label>
          <select
            value={Math.floor(durationChoice / 60)}
            onChange={(e) => {
              const mins = Number(e.target.value);
              const secs = durationChoice % 60;
              const total = mins * 60 + secs;
              setDurationChoice(total);
              setTimer(total);
            }}
            className="w-28 h-16 text-2xl font-bold rounded bg-gray-700 border border-gray-600 text-center"
          >
            {[...Array(21).keys()].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="text-center">
          <label className="block mb-2 text-lg font-semibold">Seg</label>
          <select
            value={durationChoice % 60}
            onChange={(e) => {
              const secs = Number(e.target.value);
              const mins = Math.floor(durationChoice / 60);
              const total = mins * 60 + secs;
              setDurationChoice(total);
              setTimer(total);
            }}
            className="w-28 h-16 text-2xl font-bold rounded bg-gray-700 border border-gray-600 text-center"
          >
            {[0, 10, 20, 30, 40, 50].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams selection with 3-color dropdown */}
      <h2 className="text-xl font-semibold mb-4">Escolhe 2 equipas:</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {teams.map((team) => {
          const color = teamColors[team.team_number] || "black";
          const bg = COLORS[color].bg;
          const text = COLORS[color].text;

          return (
            <div
              key={team.id}
              className={`p-4 rounded-xl cursor-pointer transition ${
                selectedTeams.some((t) => t.id === team.id) ? "ring-4 ring-green-500" : ""
              }`}
              style={{ backgroundColor: bg, color: text }}
              onClick={() => toggleTeamSelection(team)}
            >
              <h3 className="font-bold mb-2">Equipa {team.team_number}</h3>
              <select
                value={color}
                onChange={(e) =>
                  setTeamColors((prev) => ({
                    ...prev,
                    [team.team_number]: e.target.value,
                  }))
                }
                className="px-2 py-1 mb-2 rounded text-black"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="black">⚫ Preto</option>
                <option value="white">⚪ Branco</option>
                <option value="yellow">🟡 Amarelo</option>
              </select>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlayers((prev) => ({ ...prev, [team.id]: !prev[team.id] }));
                }}
                className="underline text-sm"
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
          );
        })}
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
                <button onClick={() => setRunning(true)} className="bg-green-600 px-6 py-3 text-xl rounded">▶️ Start</button>
              ) : (
                <button onClick={() => setRunning(false)} className="bg-yellow-600 px-6 py-3 text-xl rounded">⏸ Pause</button>
              )}
              <button onClick={resetGame} className="bg-gray-600 px-6 py-3 text-xl rounded">🔄 Reset</button>
              <button onClick={saveGame} className="bg-blue-600 px-6 py-3 text-xl rounded">💾 Guardar</button>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="grid grid-cols-2 gap-8 mb-10 text-center">
            {selectedTeams.map((team, idx) => {
              const color = teamColors[team.team_number] || "black";
              const bg = COLORS[color].bg;
              const text = COLORS[color].text;
              const score = idx === 0 ? team1Score : team2Score;
              const setScore = idx === 0 ? setTeam1Score : setTeam2Score;

              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl shadow-lg"
                  style={{ backgroundColor: bg, color: text }}
                >
                  <h2 className="text-3xl font-bold mb-4">Equipa {team.team_number}</h2>
                  <p className="text-8xl font-extrabold mb-6">{score}</p>
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => setScore((s) => s + 1)} className="bg-green-600 px-4 py-2 rounded text-xl">+1</button>
                    <button onClick={() => setScore((s) => Math.max(0, s - 1))} className="bg-red-600 px-4 py-2 rounded text-xl">-1</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <audio ref={hornRef} src={`${import.meta.env.BASE_URL}horn.mp3`} preload="auto" />
    </div>
  );
}
