import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Game from './components/Game';
import './App.css';
import './index.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#121212] text-white font-sans">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/game" element={<Game />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;