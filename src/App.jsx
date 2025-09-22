import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Leaderboard from "./components/Leaderboard";
import Players from "./components/Players";
import Training from "./components/Training";
import Home from "./components/Home";

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Navbar always visible */}
      <nav className="bg-blue-700 shadow-md">
        <div className="container mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🏀 Basket App
          </h1>
          <div className="flex gap-6">
            <NavLink
              to="/ranking"
              className={({ isActive }) =>
                `hover:text-yellow-400 transition ${
                  isActive ? "font-bold text-yellow-400" : ""
                }`
              }
            >
              🏆 Ranking
            </NavLink>
            <NavLink
              to="/players"
              className={({ isActive }) =>
                `hover:text-yellow-400 transition ${
                  isActive ? "font-bold text-yellow-400" : ""
                }`
              }
            >
              👥 Jogadores
            </NavLink>
            <NavLink
              to="/treino"
              className={({ isActive }) =>
                `hover:text-yellow-400 transition ${
                  isActive ? "font-bold text-yellow-400" : ""
                }`
              }
            >
              🏀 Treino
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ranking" element={<Leaderboard />} />
          <Route path="/players" element={<Players />} />
          <Route path="/treino" element={<Training />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
