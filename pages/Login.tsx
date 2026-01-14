
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../db';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const remembered = db.getRememberedAccounts();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = db.getUsers().find(u => u.email === email);
    if (foundUser) {
      if (!foundUser.isConfirmed) {
        setError('Please confirm your email address before signing in.');
        return;
      }
      db.rememberAccount(email);
      onLogin(foundUser);
      navigate('/dashboard');
    } else {
      setError('Invalid credentials');
    }
  };

  const handleOAuth = (provider: string) => {
    alert(`Redirecting to ${provider} OAuth...`);
    const mockUser = db.getUsers().find(u => u.isConfirmed) || db.getUsers()[0];
    onLogin(mockUser);
    navigate('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto mt-12 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-white p-12 rounded-[40px] shadow-sm border border-[#2D2926]/5">
        <h1 className="text-3xl font-light mb-10 text-center logo-text">Welcome Back</h1>
        
        {remembered.length > 0 && (
          <div className="mb-10">
            <p className="text-[10px] font-bold mb-5 text-gray-400 uppercase tracking-widest text-center">Continue as</p>
            <div className="space-y-3">
              {remembered.map(acc => (
                <div key={acc.id} className="group relative flex items-center justify-between p-4 border border-[#2D2926]/5 rounded-3xl hover:bg-[#F2F1E8] transition-all">
                  <button 
                    onClick={() => { 
                      if (!acc.isConfirmed) { setError('Account unconfirmed'); return; }
                      setEmail(acc.email); onLogin(acc); navigate('/dashboard'); 
                    }}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <img src={acc.profilePicture} className="w-12 h-12 rounded-2xl shadow-sm" alt="" />
                    <div>
                      <p className="font-semibold text-sm">{acc.name} {acc.surname}</p>
                      <p className="text-[10px] text-gray-500">{acc.email}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => { db.forgetAccount(acc.email); window.location.reload(); }}
                    className="p-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold mb-3 uppercase tracking-widest text-gray-500">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-5 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] font-light transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-3 uppercase tracking-widest text-gray-500">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-5 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] font-light transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-[10px] font-bold uppercase tracking-wide text-center">{error}</p>}
          <button className="w-full py-5 bg-[#2D2926] text-white rounded-[20px] font-semibold hover:opacity-90 transition-opacity shadow-xl shadow-black/5">
            SIGN IN
          </button>
        </form>

        <div className="mt-10 flex items-center gap-4 text-gray-200">
          <div className="h-[1px] flex-1 bg-current"></div>
          <span className="text-[10px] font-bold tracking-widest">OR</span>
          <div className="h-[1px] flex-1 bg-current"></div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4">
          <button onClick={() => handleOAuth('Google')} className="flex items-center justify-center py-4 border border-[#2D2926]/5 rounded-2xl hover:bg-gray-50 transition-colors">
            <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5 mr-3" alt="" />
            <span className="text-[10px] font-bold">GOOGLE</span>
          </button>
          <button onClick={() => handleOAuth('GitHub')} className="flex items-center justify-center py-4 border border-[#2D2926]/5 rounded-2xl hover:bg-gray-50 transition-colors">
            <img src="https://www.svgrepo.com/show/353782/github-icon.svg" className="w-5 h-5 mr-3" alt="" />
            <span className="text-[10px] font-bold">GITHUB</span>
          </button>
        </div>

        <p className="mt-12 text-center text-sm text-gray-500 font-light">
          New to Confio? <Link to="/register" className="text-[#2D2926] font-semibold">Join now</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
