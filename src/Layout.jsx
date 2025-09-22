import { NavLink } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <nav className="bg-blue-700 shadow-md">
        <div className="container mx-auto flex justify-between items-center px-6 py-4">

          <div className="flex gap-6">
            <NavLink to="/VeteranosGCO" end className={({ isActive }) =>
              `hover:text-yellow-400 transition ${
                isActive ? "font-bold text-yellow-400" : ""
              }`
            }>
              🏠 Home
            </NavLink>

            <NavLink to="/ranking" className={({ isActive }) =>
              `hover:text-yellow-400 transition ${
                isActive ? "font-bold text-yellow-400" : ""
              }`
            }>
              🏆 Ranking
            </NavLink>

            <NavLink to="/players" className={({ isActive }) =>
              `hover:text-yellow-400 transition ${
                isActive ? "font-bold text-yellow-400" : ""
              }`
            }>
              👥 Jogadores
            </NavLink>

            <NavLink to="/treino" className={({ isActive }) =>
              `hover:text-yellow-400 transition ${
                isActive ? "font-bold text-yellow-400" : ""
              }`
            }>
              🏀 Treino
            </NavLink>
            
            <NavLink
              to="/games"
              className={({ isActive }) =>
                `hover:text-yellow-400 transition ${
                  isActive ? "font-bold text-yellow-400" : ""
                }`
              }
            >
              🎮 Jogos
            </NavLink>

          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-6 py-12">{children}</main>
    </div>
  );
}
