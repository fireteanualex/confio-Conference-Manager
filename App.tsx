
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User } from './types';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ConferenceDetail from './pages/ConferenceDetail';
import OrgMembers from './pages/OrgMembers';

const Navbar: React.FC<{ user: User | null; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#F2F1E8]/80 backdrop-blur-md border-b border-[#2D2926]/10 z-50 h-16 px-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-12 h-12 border-0 border-[#2D2926] rounded-md flex items-center justify-center font-bold logo-text"><img src='/assets/logos/confio-logo-light.svg'></img></div>
        <span className="text-xl font-400 logo-text tracking-widest">CONFIO</span>
      </Link>
      
      {user ? (
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors font-light">Dashboard</Link>
          <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img 
              src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}+${user.surname}&background=2D2926&color=F2F1E8`} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-[#2D2926]/20 object-cover"
            />
            <span className="font-light">{user.name}</span>
          </Link>
          <button 
            onClick={onLogout}
            className="px-4 py-1 border border-[#2D2926] rounded-full text-xs hover:bg-[#2D2926] hover:text-white transition-all font-semibold"
          >
            LOGOUT
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-light">SIGN IN</Link>
          <Link to="/register" className="px-5 py-2 bg-[#2D2926] text-white rounded-full text-xs font-semibold hover:opacity-90 transition-opacity">GET STARTED</Link>
        </div>
      )}
    </nav>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('confio_session');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('confio_session', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('confio_session');
  };

  return (
    <Router>
      <div className="min-h-screen pt-16">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
            <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
            <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile user={user} onUpdate={handleLogin} /> : <Navigate to="/login" />} />
            <Route path="/conference/:id" element={user ? <ConferenceDetail user={user} /> : <Navigate to="/login" />} />
            <Route path="/organization/:id/members" element={user ? <OrgMembers user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
