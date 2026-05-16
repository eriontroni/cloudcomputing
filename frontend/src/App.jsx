import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BlogDashboard from './pages/BlogDashboard';
import MoviesDashboard from './pages/MoviesDashboard';
import GradebookDashboard from './pages/GradebookDashboard';


export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <Routes>
          <Route path="/" element={<Navigate to="/blog" replace />} />
          <Route path="/blog/*" element={<BlogDashboard />} />
          <Route path="/movies/*" element={<MoviesDashboard />} />
          <Route path="/gradebook/*" element={<GradebookDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
