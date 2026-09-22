import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { calculateTeamRanking } from "../utils/teamRanking";
import { useAuth } from "../useAuth";
import {
  clampGameDuration,
  getGameEndAction,
  getNextTeamPair,
  getRecentGameResults,
  getStoredDurationMinutes,
  getWinnerTeamNumber,
} from "../utils/gameLogic";

const COLORS = {
  black: { bg: "#000000", text: "white", name: "Preto" },
  white: { bg: "#ffffff", text: "black", name: "Branco" },
  yellow: {
    bg: "#f5ff00",
    text: "black",
    name: "Amarelo",
    shadow: "0 0 28px rgba(245, 255, 0, 0.5)",
  },
};

const TEAM_COLOR = { 1: "yellow", 2: "black", 3: "white" };

const getTeamStyle = (teamNumber) =>
  COLORS[TEAM_COLOR[Number(teamNumber)] || "black"];

export default function Games() {
  const { isAdmin } = useAuth();
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [timer, setTimer] = useState(300); // default 5 minutes
  const [durationChoice, setDurationChoice] = useState(300);
  const [running, setRunning] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [showPlayers, setShowPlayers] = useState({});
  const [allPlayers, setAllPlayers] = useState([]);
  const [teamStandings, setTeamStandings] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [gameNotice, setGameNotice] = useState("");
  const [savingGame, setSavingGame] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hornRef = useRef(null);
  const scoreboardRef = useRef(null);

  useEffect(() => {
    const updateFullscreenState = () => {
      const fullscreenElement =
        document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(fullscreenElement === scoreboardRef.current);
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("webkitfullscreenchange", updateFullscreenState);
    };
  }, []);

  // Load trainings and players
  useEffect(() => {
    const fetchTrainings = async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
      .order("date", { ascending: false });
      if (!error && data.length > 0) {
        setSelectedTraining(data[0]);
      }
    };
    fetchTrainings();
    fetchAllPlayers();
  }, []);

  const fetchTeams = useCallback(async (trainingId) => {
    const { data, error } = await supabase
      .from("training_teams")
      .select("*")
      .eq("training_id", trainingId)
      .order("team_number");

    if (!error) {
      setTeams(data || []);
      return data || [];
    }
    return [];
  }, []);

  const fetchAllPlayers = async () => {
    const { data, error } = await supabase.from("players").select("id, name");
    if (!error) setAllPlayers(data);
  };

  const getPlayerName = (id) => {
    const player = allPlayers.find((p) => p.id === id);
    return player ? player.name : id;
  };

  const fetchGameSummary = useCallback(async (trainingId, currentTeams) => {
    const { data, error } = await supabase
      .from("games")
      .select("id, team1, team2, team1_score, team2_score, winner, created_at")
      .eq("training_id", trainingId)
      .order("created_at", { ascending: true });
    if (error) return;

    setTeamStandings(calculateTeamRanking(currentTeams, data || []));

    if (!data?.length) {
      setRecentGames([]);
      return;
    }

    setRecentGames(getRecentGameResults(data, currentTeams));
  }, []);

  // Load teams, standings and the previous result
  useEffect(() => {
    if (selectedTraining) {
      const loadTrainingGames = async () => {
        const loadedTeams = await fetchTeams(selectedTraining.id);
        await fetchGameSummary(selectedTraining.id, loadedTeams);
      };

      setSelectedTeams([]);
      setGameNotice("");
      loadTrainingGames();
    }
  }, [selectedTraining, fetchTeams, fetchGameSummary]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (running && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0 && running) {
      setRunning(false);
      if (hornRef.current) {
        hornRef.current.currentTime = 0;
        hornRef.current.play().catch(() => {
          console.warn("⚠️ Horn blocked until user interaction.");
        });
      }

      const action = getGameEndAction({
        timer,
        running,
        selectedTeamCount: selectedTeams.length,
        team1Score,
        team2Score,
      });

      if (action === "free-throws") {
        setGameNotice("🏀 Empate: decide o jogo nos lances livres, atualiza o resultado final e guarda manualmente.");
      } else if (action === "missing-teams") {
        setGameNotice("⚠️ O tempo terminou, mas não foi possível guardar sem duas equipas selecionadas.");
      } else if (action === "manual-save") {
        setGameNotice("⏱️ Tempo terminado: confirma ou ajusta o resultado e carrega em Guardar.");
      }
    }
    return () => clearInterval(interval);
  }, [running, timer, selectedTeams.length, team1Score, team2Score]);

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
    setGameNotice("");
  };

  const updateDuration = (minutes, seconds) => {
    const newDuration = clampGameDuration(minutes, seconds);
    setDurationChoice(newDuration);
    setTimer(newDuration);
    setGameNotice("");
  };

  const toggleScoreboardFullscreen = async () => {
    const fullscreenElement =
      document.fullscreenElement || document.webkitFullscreenElement;

    try {
      if (fullscreenElement) {
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        await exitFullscreen?.call(document);
      } else {
        scoreboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        const requestFullscreen =
          scoreboardRef.current?.requestFullscreen ||
          scoreboardRef.current?.webkitRequestFullscreen;
        await requestFullscreen?.call(scoreboardRef.current);
      }
    } catch {
      // Scrolling still provides the large scoreboard when fullscreen is unavailable.
    }
  };

  const saveGame = async () => {
    if (selectedTeams.length !== 2 || !selectedTraining) return;
    if (savingGame) return;

    const winner = getWinnerTeamNumber(selectedTeams, team1Score, team2Score);
    if (winner == null) {
      setGameNotice("🏀 O jogo está empatado. Introduz o resultado final dos lances livres antes de guardar.");
      return;
    }

    setSavingGame(true);
    const { error } = await supabase.from("games").insert([
      {
        training_id: selectedTraining.id,
        team1: selectedTeams[0].players,
        team2: selectedTeams[1].players,
        team1_score: team1Score,
        team2_score: team2Score,
        winner,
        date: selectedTraining.date,
        // Supabase stores this legacy field as an integer. The timer itself
        // still supports exact seconds from 0:00 through 30:00.
        duration_minutes: getStoredDurationMinutes(durationChoice),
      },
    ]);

    if (error) {
      alert("❌ Erro ao guardar jogo: " + error.message);
    } else {
      const nextTeams = getNextTeamPair(selectedTeams, teams);
      alert("✅ Jogo guardado!");
      await fetchGameSummary(selectedTraining.id, teams);
      resetGame();
      setSelectedTeams(nextTeams);
      setGameNotice(
        `Próximo jogo: Equipa ${nextTeams[0].team_number} vs Equipa ${nextTeams[1].team_number}`,
      );
    }
    setSavingGame(false);
  };

  const endTraining = async () => {
    if (!selectedTraining) return;

    const { data: allTeams, error: teamsErr } = await supabase
      .from("training_teams")
      .select("id, team_number, players")
      .eq("training_id", selectedTraining.id)
      .order("team_number");

    if (teamsErr) {
      alert("Erro ao buscar equipas: " + teamsErr.message);
      return;
    }
    if (!allTeams || allTeams.length < 2) {
      alert("⚠️ São necessárias pelo menos 2 equipas.");
      return;
    }

    const { data: games, error: gamesErr } = await supabase
      .from("games")
      .select("team1, team2, team1_score, team2_score, winner")
      .eq("training_id", selectedTraining.id);

    if (gamesErr) {
      alert("Erro ao buscar jogos: " + gamesErr.message);
      return;
    }

    const ranking = calculateTeamRanking(allTeams, games);

    const places = Math.min(ranking.length, 3);
    const pointsByPlace = places === 2 ? [3, 2] : [3, 2, 1];

    for (let i = 0; i < places; i++) {
      const team = ranking[i];
      const add = pointsByPlace[i];

      for (const playerId of team.players) {
        const { data: current, error: curErr } = await supabase
          .from("players")
          .select("total_points")
          .eq("id", playerId)
          .single();

        if (curErr) continue;

        const newTotal = (current?.total_points || 0) + add;

        await supabase
          .from("players")
          .update({ total_points: newTotal })
          .eq("id", playerId);
      }
    }

    const { error: deleteError } = await supabase
      .from("training_teams")
      .delete()
      .eq("training_id", selectedTraining.id);

    if (deleteError) {
      alert("Os pontos foram atribuídos, mas ocorreu um erro ao remover as equipas: " + deleteError.message);
      return;
    }

    setTeams([]);
    setSelectedTeams([]);
    setTeamStandings([]);
    alert("✅ Pontos atribuídos e equipas removidas!");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-900 text-white rounded-2xl shadow-lg">
      <h1 className="text-4xl font-bold mb-8 text-center">🎮 Jogos</h1>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-gray-800 p-4">
          <h2 className="mb-3 text-xl font-bold">📊 Classificação</h2>
          {teamStandings.length ? (
            <ol className="space-y-2">
              {teamStandings.map((team, index) => (
                <li key={team.team_number} className="flex items-center justify-between rounded bg-gray-700 p-2">
                  <span>{index + 1}.º Equipa {team.team_number}</span>
                  <span><strong>{team.wins}</strong> V / <strong>{team.losses}</strong> D</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-gray-400">Ainda não existem equipas.</p>
          )}
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <h2 className="mb-3 text-xl font-bold">⏮️ Últimos 3 jogos</h2>
          {recentGames.length ? (
            <ol className="space-y-2">
              {recentGames.map((game, index) => (
                <li
                  key={game.id}
                  className={`flex items-center justify-center gap-3 rounded p-2 text-center ${
                    index === 0 ? "bg-gray-700" : "bg-gray-900"
                  }`}
                >
                  <span className="font-semibold">Equipa {game.team1}</span>
                  <strong className="text-xl">{game.team1Score} – {game.team2Score}</strong>
                  <span className="font-semibold">Equipa {game.team2}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-gray-400">Ainda não existem jogos guardados.</p>
          )}
        </div>
      </div>

      {/* Teams with fixed colours */}
      <h2 className="text-xl font-semibold mb-4">Escolhe 2 equipas:</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {teams.map((team) => {
          const style = getTeamStyle(team.team_number);
          const isSelected = selectedTeams.some((selected) => selected.id === team.id);

          return (
            <div
              key={team.id}
              className="cursor-pointer rounded-xl p-4 transition"
              style={{
                backgroundColor: style.bg,
                color: style.text,
                boxShadow: style.shadow,
                outline: isSelected ? "4px solid #22c55e" : "none",
                outlineOffset: isSelected ? "4px" : "0",
              }}
              onClick={() => toggleTeamSelection(team)}
            >
              <h3 className="font-bold mb-2">Equipa {team.team_number} · {style.name}</h3>
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
                    <li key={i} className="bg-blue-600 rounded px-2 py-1">
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
          <section
            ref={scoreboardRef}
            className="flex min-h-[100svh] scroll-mt-2 flex-col overflow-hidden rounded-2xl bg-gray-950 p-2 text-center sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              <label className="text-sm sm:text-base">⏱️ Duração:</label>
              <div className="flex items-center gap-1">
                <input
                  aria-label="Minutos"
                  type="number"
                  min="0"
                  max="30"
                  value={Math.floor(durationChoice / 60)}
                  disabled={running}
                  onChange={(e) => updateDuration(e.target.value, durationChoice % 60)}
                  className="w-16 rounded px-2 py-1 text-center text-black disabled:opacity-50"
                />
                <span>min</span>
                <input
                  aria-label="Segundos"
                  type="number"
                  min="0"
                  max="59"
                  value={durationChoice % 60}
                  disabled={running || durationChoice >= 30 * 60}
                  onChange={(e) => updateDuration(Math.floor(durationChoice / 60), e.target.value)}
                  className="w-16 rounded px-2 py-1 text-center text-black disabled:opacity-50"
                />
                <span>s</span>
              </div>
              <button
                type="button"
                onClick={toggleScoreboardFullscreen}
                className="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600"
              >
                {isFullscreen ? "⛶ Sair do ecrã inteiro" : "⛶ Ecrã inteiro"}
              </button>
            </div>

            <div className="font-mono text-[clamp(5rem,20vh,12rem)] font-black leading-none tracking-tight">
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
            </div>
            {gameNotice && (
              <p className="mx-auto max-w-3xl rounded-lg bg-orange-700 p-2 font-semibold sm:p-3">
                {gameNotice}
              </p>
            )}
            <div className="my-2 flex flex-wrap justify-center gap-2 sm:gap-4">
              {!running && timer > 0 ? (
                <button onClick={() => setRunning(true)} className="rounded bg-green-600 px-5 py-2 text-lg sm:text-xl">▶️ Start</button>
              ) : running ? (
                <button onClick={() => setRunning(false)} className="rounded bg-yellow-600 px-5 py-2 text-lg sm:text-xl">⏸ Pause</button>
              ) : null}
              <button onClick={resetGame} className="rounded bg-gray-600 px-5 py-2 text-lg sm:text-xl">🔄 Reset</button>
              <button
                onClick={() => saveGame()}
                disabled={savingGame || !isAdmin}
                title={!isAdmin ? "Inicia sessão como administrador para guardar o jogo." : undefined}
                className="rounded bg-blue-600 px-5 py-2 text-lg disabled:cursor-not-allowed disabled:opacity-50 sm:text-xl"
              >
                {savingGame ? "A guardar…" : isAdmin ? "💾 Guardar" : "🔒 Guardar"}
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
              {selectedTeams.map((team, idx) => {
                const style = getTeamStyle(team.team_number);
                const score = idx === 0 ? team1Score : team2Score;
                const setScore = idx === 0 ? setTeam1Score : setTeam2Score;

                return (
                  <div
                    key={team.id}
                    className="flex min-h-0 flex-col justify-between rounded-2xl p-2 shadow-lg sm:p-4"
                    style={{ backgroundColor: style.bg, color: style.text, boxShadow: style.shadow }}
                  >
                    <h2 className="text-[clamp(1.5rem,4vw,3.5rem)] font-black leading-none">
                      Equipa {team.team_number}
                    </h2>
                    <p className="flex flex-1 items-center justify-center text-[clamp(8rem,30vh,20rem)] font-black leading-none tracking-tighter">
                      {score}
                    </p>
                    <div className="flex justify-center gap-2 sm:gap-4">
                      <button onClick={() => setScore((s) => s + 1)} className="rounded bg-green-600 px-5 py-2 text-2xl font-bold sm:px-8 sm:py-3">+1</button>
                      <button onClick={() => setScore((s) => Math.max(0, s - 1))} className="rounded bg-red-600 px-5 py-2 text-2xl font-bold sm:px-8 sm:py-3">-1</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Always keep the final action at the bottom of the page. */}
      <div className="mt-8 border-t border-gray-700 pt-8 text-center">
        <button
          onClick={endTraining}
          disabled={!isAdmin || !selectedTraining || teams.length < 2}
          title={!isAdmin ? "Inicia sessão como administrador para finalizar o treino." : undefined}
          className="rounded bg-purple-600 px-6 py-3 text-xl hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdmin ? "🏁 Finalizar Treino" : "🔒 Finalizar Treino"}
        </button>
      </div>
      <audio ref={hornRef} src={`${import.meta.env.BASE_URL}horn.mp3`} preload="auto" />
    </div>
  );
}
