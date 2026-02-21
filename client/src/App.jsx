import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Chatbot from './components/Chatbot';

const API_URL = 'http://localhost:5000/api';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <div className="app-container">
        {user && (
          <nav className="nav">
            <Link to="/" className="nav-brand">KodBank</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <span style={{ color: 'var(--secondary)', fontWeight: '500' }}>{user.name}</span>
              <span className="logout-link" onClick={handleLogout}>Logout</span>
            </div>
          </nav>
        )}

        <Routes>
          <Route
            path="/login"
            element={!user ? <Auth onLogin={handleLogin} initialMode="login" /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!user ? <Auth onLogin={handleLogin} initialMode="register" /> : <Navigate to="/" />}
          />
          <Route
            path="/"
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
          />
        </Routes>

        <Chatbot />
      </div>
    </Router>
  );
};

export default App;
