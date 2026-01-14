
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
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);
  const remembered = db.getRememberedAccounts().slice(0, 3); // Limit to 3 users

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const user = await db.loginUser(email, password);

      // Store user with limited cache (max 3 users)
      const cachedUsers = JSON.parse(localStorage.getItem('confio_users') || '[]');
      const existingUserIndex = cachedUsers.findIndex((u: User) => u.email === email);

      if (existingUserIndex >= 0) {
        cachedUsers[existingUserIndex] = user;
      } else {
        cachedUsers.push(user);
        // Keep only the 3 most recent users
        if (cachedUsers.length > 3) {
          cachedUsers.shift(); // Remove oldest user
        }
      }
      localStorage.setItem('confio_users', JSON.stringify(cachedUsers));

      db.rememberAccount(email);

      onLogin(user);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Invalid credentials');
    }
  };

  const handleQuickLogin = async (user: User) => {
    setError('');
    setQuickLoggingIn(true);

    try {
      // Fetch fresh user data from server to ensure it's up to date
      const freshUser = await db.getUserById(user.id);
      if (freshUser) {
        onLogin(freshUser);
        navigate('/dashboard');
      } else {
        throw new Error('User not found');
      }
    } catch (error: any) {
      setError('Quick login failed. Please sign in manually.');
      console.error('Quick login error:', error);
    } finally {
      setQuickLoggingIn(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    alert(`${provider} OAuth is not yet implemented. Please use email/password login.`);
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
                <div key={acc.id} className="group relative flex items-center justify-between p-4 border border-[#2D2926]/5 rounded-3xl hover:bg-[#F2F1E8] hover:shadow-md transition-all cursor-pointer">
                  <button
                    onClick={() => handleQuickLogin(acc)}
                    disabled={quickLoggingIn}
                    className="flex items-center gap-4 flex-1 text-left disabled:opacity-50"
                  >
                    <div className="relative">
                      <img
                        src={acc.profilePicture || `https://ui-avatars.com/api/?name=${acc.name}+${acc.surname}&background=2D2926&color=F2F1E8`}
                        className="w-12 h-12 rounded-2xl shadow-sm object-cover"
                        alt=""
                      />
                      {quickLoggingIn && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{acc.name} {acc.surname}</p>
                      <p className="text-[10px] text-gray-500">{acc.email}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Remove ${acc.name} ${acc.surname} from this device?`)) {
                        db.forgetAccount(acc.email);
                        // Also remove from cached users
                        const cachedUsers = JSON.parse(localStorage.getItem('confio_users') || '[]');
                        const updatedCache = cachedUsers.filter((u: User) => u.email !== acc.email);
                        localStorage.setItem('confio_users', JSON.stringify(updatedCache));
                        window.location.reload();
                      }
                    }}
                    className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all ml-2"
                    title="Remove from device"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-400 text-center mt-3 italic">Tap to continue • Stored on this device only • Max 3 users</p>
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