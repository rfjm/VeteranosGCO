import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Leaderboard from "./components/Leaderboard";
import Players from "./components/Players";
import Training from "./components/Training";
import Home from "./components/Home";
import Games from "./components/Games";
import Layout from "./Layout"; // if you kept it separated, or define inside App

function App() {
  return (
    <Router>
      <Layout>
        <Routes>  
          <Route path="/VeteranosGCO" element={<Home />} />
          <Route path="/ranking" element={<Leaderboard />} />
          <Route path="/players" element={<Players />} />
          <Route path="/treino" element={<Training />} />
          <Route path="/games" element={<Games />} /> {/* 👈 new route */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
