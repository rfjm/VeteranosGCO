import { buildPracticeSummary } from "../utils/practiceResults";

const TEAM_STYLES = {
  1: {
    name: "Amarela",
    card: "border-[#f5ff00] bg-[#f5ff00] text-black",
    player: "bg-yellow-100",
  },
  2: {
    name: "Preta",
    card: "border-gray-500 bg-black text-white",
    player: "bg-gray-900",
  },
  3: {
    name: "Branca",
    card: "border-white bg-white text-black",
    player: "bg-gray-100",
  },
};

const styleForTeam = (teamNumber) =>
  TEAM_STYLES[Number(teamNumber)] || TEAM_STYLES[2];

const teamLabel = (teamNumber) => {
  const style = styleForTeam(teamNumber);
  return `Equipa ${teamNumber} · ${style.name}`;
};

function RankingTable({ ranking }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-center text-sm">
        <thead>
          <tr className="bg-gray-700 text-gray-200">
            <th className="border border-gray-600 p-2">Pos.</th>
            <th className="border border-gray-600 p-2 text-left">Equipa</th>
            <th className="border border-gray-600 p-2">V</th>
            <th className="border border-gray-600 p-2">D</th>
            <th className="border border-gray-600 p-2">Marcados</th>
            <th className="border border-gray-600 p-2">Sofridos</th>
            <th className="border border-gray-600 p-2">Dif.</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((team, index) => (
            <tr key={team.team_number} className="bg-gray-900">
              <td className="border border-gray-700 p-2 font-bold">{index + 1}.º</td>
              <td className="border border-gray-700 p-2 text-left font-semibold">
                {teamLabel(team.team_number)}
              </td>
              <td className="border border-gray-700 p-2">{team.wins}</td>
              <td className="border border-gray-700 p-2">{team.losses}</td>
              <td className="border border-gray-700 p-2">{team.pointsScored}</td>
              <td className="border border-gray-700 p-2">{team.pointsAgainst}</td>
              <td className="border border-gray-700 p-2 font-bold">
                {team.pointDifference > 0 ? "+" : ""}{team.pointDifference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PracticeResults({ games, savedTeams, players }) {
  const summary = buildPracticeSummary(games, savedTeams);
  const playerById = new Map(players.map((player) => [String(player.id), player]));

  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-xl border border-green-500 bg-green-950 p-4 text-center">
        <h2 className="text-2xl font-bold text-green-200">🏁 Treino concluído</h2>
        <p className="mt-1 text-sm text-green-100">
          {games.length} {games.length === 1 ? "jogo guardado" : "jogos guardados"}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-semibold">👥 Jogadores por equipa</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {summary.teams.map((team) => {
            const style = styleForTeam(team.team_number);
            return (
              <article
                key={team.team_number}
                className={`rounded-xl border-2 p-4 shadow-sm ${style.card}`}
              >
                <h3 className="mb-3 font-bold">{teamLabel(team.team_number)}</h3>
                <ul className="space-y-2">
                  {(team.players || []).map((playerId) => (
                    <li key={playerId} className={`rounded px-3 py-2 ${style.player}`}>
                      {playerById.get(String(playerId))?.name || playerId}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-semibold">🏀 Resultados por ronda</h2>
        {summary.rounds.length ? (
          <div className="space-y-5">
            {summary.rounds.map((round) => (
              <article key={round.number} className="rounded-xl bg-gray-700 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">Ronda {round.number}</h3>
                  {!round.complete && (
                    <span className="rounded bg-orange-700 px-2 py-1 text-xs font-semibold">
                      Ronda incompleta
                    </span>
                  )}
                </div>
                <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {round.games.map((game) => (
                    <li key={game.id} className="rounded-lg bg-gray-900 p-3 text-center">
                      <span className="font-semibold">Equipa {game.team1Number}</span>
                      <strong className="mx-3 text-xl">
                        {game.team1_score} – {game.team2_score}
                      </strong>
                      <span className="font-semibold">Equipa {game.team2Number}</span>
                    </li>
                  ))}
                </ul>
                <RankingTable ranking={round.ranking} />
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded bg-gray-700 p-4 text-gray-300">
            Não existem jogos guardados para este treino.
          </p>
        )}
      </div>

      {summary.ranking.length > 0 && (
        <div className="rounded-xl border border-purple-500 bg-purple-950 p-4">
          <h2 className="mb-3 text-xl font-bold text-purple-100">🏆 Total final</h2>
          <RankingTable ranking={summary.ranking} />
        </div>
      )}
    </section>
  );
}
