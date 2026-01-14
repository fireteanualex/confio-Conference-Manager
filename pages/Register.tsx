
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { UserRole } from '../types';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    role: UserRole.AUTHOR
  });
  const [step, setStep] = useState<'FORM' | 'CONFIRM'>('FORM');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.registerUser({
      name: formData.name,
      surname: formData.surname,
      email: formData.email,
      role: formData.role,
      profilePicture: `https://ui-avatars.com/api/?name=${formData.name}+${formData.surname}&background=2D2926&color=F2F1E8`
    });
    setStep('CONFIRM');
  };

  const handleConfirmMock = () => {
    db.confirmUserEmail(formData.email);
    alert("Email confirmed! You can now log in.");
    navigate('/login');
  };

  if (step === 'CONFIRM') {
    return (
      <div className="max-w-md mx-auto mt-24 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-white border-2 border-dashed border-[#2D2926]/10 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </div>
        <h2 className="text-3xl font-light mb-4 logo-text">Verify Email</h2>
        <p className="text-gray-500 mb-10 font-light leading-relaxed">
          We've sent a confirmation code to <span className="font-semibold text-[#2D2926]">{formData.email}</span>. 
          <br/>(Mock mode: click the button below to simulate clicking the email link)
        </p>
        <button 
          onClick={handleConfirmMock}
          className="w-full py-4 bg-[#2D2926] text-white rounded-full font-semibold hover:opacity-90 transition-opacity mb-4"
        >
          SIMULATE EMAIL CONFIRMATION
        </button>
        <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black">Return to Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 animate-in fade-in duration-500">
      <div className="bg-white p-12 rounded-[40px] shadow-sm border border-[#2D2926]/5">
        <h1 className="text-3xl font-light mb-10 logo-text">Create Account</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-semibold mb-3 uppercase tracking-widest text-gray-500">First Name</label>
            <input 
              type="text" required
              className="w-full px-5 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] font-light transition-colors"
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-3 uppercase tracking-widest text-gray-500">Last Name</label>
            <input 
              type="text" required
              className="w-full px-5 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] font-light transition-colors"
              onChange={e => setFormData({...formData, surname: e.target.value})}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-3 uppercase tracking-widest text-gray-500">Email Address</label>
            <input 
              type="email" required
              className="w-full px-5 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] font-light transition-colors"
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-3 uppercase tracking-widest text-gray-500">Role</label>
            <select 
              className="w-full px-5 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] appearance-none font-light transition-colors"
              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
            >
              <option value={UserRole.AUTHOR}>Author / Submitter</option>
              <option value={UserRole.REVIEWER}>Reviewer / Academic</option>
              <option value={UserRole.ORGANIZER}>Organizer</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-3 uppercase tracking-widest text-gray-500">Password</label>
            <input 
              type="password" required
              className="w-full px-5 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] font-light transition-colors"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button className="col-span-2 py-5 bg-[#2D2926] text-white rounded-[20px] font-semibold hover:opacity-90 transition-opacity mt-4 shadow-xl shadow-black/5">
            CREATE ACCOUNT
          </button>
        </form>
        <p className="mt-10 text-center text-sm text-gray-500 font-light">
          Already have an account? <Link to="/login" className="text-[#2D2926] font-semibold border-b border-transparent hover:border-current transition-all">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
