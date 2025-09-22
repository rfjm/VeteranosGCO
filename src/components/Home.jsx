import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-4xl font-bold mb-8 flex items-center gap-2">
        🏀 Basket App
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Link
          to="/ranking"
          className="bg-blue-700 hover:bg-blue-800 transition text-white rounded-2xl shadow-lg p-8 flex flex-col items-center"
        >
          <span className="text-3xl">🏆</span>
          <span className="mt-2 text-xl font-semibold">Ranking</span>
        </Link>

        <Link
          to="/players"
          className="bg-green-700 hover:bg-green-800 transition text-white rounded-2xl shadow-lg p-8 flex flex-col items-center"
        >
          <span className="text-3xl">👥</span>
          <span className="mt-2 text-xl font-semibold">Jogadores</span>
        </Link>

        <Link
          to="/treino"
          className="bg-orange-700 hover:bg-orange-800 transition text-white rounded-2xl shadow-lg p-8 flex flex-col items-center"
        >
          <span className="text-3xl">🏀</span>
          <span className="mt-2 text-xl font-semibold">Treino</span>
        </Link>
      </div>
    </div>
  );
}
