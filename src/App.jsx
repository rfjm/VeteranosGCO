import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Leaderboard from "./components/Leaderboard";

function App() {
  return (
    <div className="container mx-auto">
      <Leaderboard />
    </div>
  );
}

export default App
