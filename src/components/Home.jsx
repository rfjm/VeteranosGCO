import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-4xl font-bold mb-8 flex items-center gap-2">
        🏀 Basket App
      </h1>

      <p className="mb-10 text-lg text-gray-400">
        Bem-vindo ao Basket App! Escolha uma opção abaixo 👇
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <Link
          to="/ranking"
          className="bg-blue-700 hover:bg-blue-800 transition text-white rounded-2xl shadow-lg p-10 flex flex-col items-center"
        >
          <span className="text-4xl">🏆</span>
          <span className="mt-3 text-xl font-semibold">Ranking</span>
        </Link>

        <Link
          to="/players"
          className="bg-green-700 hover:bg-green-800 transition text-white rounded-2xl shadow-lg p-10 flex flex-col items-center"
        >
          <span className="text-4xl">👥</span>
          <span className="mt-3 text-xl font-semibold">Jogadores</span>
        </Link>

        <Link
          to="/treino"
          className="bg-orange-700 hover:bg-orange-800 transition text-white rounded-2xl shadow-lg p-10 flex flex-col items-center"
        >
          <span className="text-4xl">🏀</span>
          <span className="mt-3 text-xl font-semibold">Treino</span>
        </Link>
      </div>
    </div>
  );
}
