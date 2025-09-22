import { Link } from "react-router-dom";
import { useState } from "react";

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <h1 className="text-xl font-bold">🏀 Basket App</h1>
          <button
            className="sm:hidden text-gray-200"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
          <nav className="hidden sm:flex gap-4">
            <Link to="/VeteranosGCO" className="hover:text-blue-400">Home</Link>
            <Link to="/players" className="hover:text-blue-400">Players</Link>
            <Link to="/training" className="hover:text-blue-400">Training</Link>
            <Link to="/leaderboard" className="hover:text-blue-400">Ranking</Link>
            <Link to="/games" className="hover:text-blue-400">Games</Link>
          </nav>
        </div>
        {open && (
          <nav className="sm:hidden bg-gray-700 px-4 pb-4 flex flex-col gap-2">
            <Link to="/" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/players" onClick={() => setOpen(false)}>Players</Link>
            <Link to="/training" onClick={() => setOpen(false)}>Training</Link>
            <Link to="/leaderboard" onClick={() => setOpen(false)}>Ranking</Link>
            <Link to="/games" onClick={() => setOpen(false)}>Games</Link>
          </nav>
        )}
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
