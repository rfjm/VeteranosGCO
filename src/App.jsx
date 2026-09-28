import { HashRouter, Navigate, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Players from "./components/Players";
import Training from "./components/Training";
import Leaderboard from "./components/Leaderboard";
import Games from "./components/Games";
import AuthProvider from "./AuthProvider";
import { useAuth } from "./useAuth";

function AdminPlayersRoute() {
  const { isAdmin, loading } = useAuth();

  if (loading) return <p className="p-4 text-white">⏳ A carregar...</p>;
  return isAdmin ? <Players /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Leaderboard />} />
            <Route path="/players" element={<AdminPlayersRoute />} />
            <Route path="/training" element={<Training />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/games" element={<Games />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
}
