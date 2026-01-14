
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../db';
import { compressImage } from '../utils/imageCompression';

const Profile: React.FC<{ user: User; onUpdate: (u: User) => void }> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    surname: user.surname,
    email: user.email,
    profilePicture: user.profilePicture
  });
  const [saved, setSaved] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await db.updateUser(user.id, formData);
      if (updated) {
        onUpdate(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setCompressing(true);
      try {
        // Compress image before uploading
        const compressedImage = await compressImage(file, 800, 800, 0.8);
        setFormData({ ...formData, profilePicture: compressedImage });
      } catch (error) {
        console.error('Image compression failed:', error);
        alert('Failed to process image. Please try another file.');
      } finally {
        setCompressing(false);
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-12">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-[#2D2926]/5">
        <h1 className="text-3xl font-light mb-10 logo-text">Your Profile</h1>
        
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative group">
              <img
                src={formData.profilePicture || `https://ui-avatars.com/api/?name=${user.name}+${user.surname}`}
                className="w-32 h-32 rounded-full border-4 border-[#F2F1E8] shadow-lg object-cover"
                alt="Profile"
              />
              <label className={`absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-opacity cursor-pointer ${compressing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {compressing ? (
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={compressing} />
              </label>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {compressing ? 'Compressing image...' : 'Click to change picture'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-gray-500">First Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-[#F2F1E8]/30 border border-[#2D2926]/10 rounded-xl focus:outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-gray-500">Last Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-[#F2F1E8]/30 border border-[#2D2926]/10 rounded-xl focus:outline-none"
                value={formData.surname}
                onChange={e => setFormData({...formData, surname: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-gray-500">Email Address</label>
              <input 
                type="email" 
                disabled
                className="w-full px-4 py-3 bg-gray-50 border border-[#2D2926]/10 rounded-xl text-gray-400 cursor-not-allowed"
                value={formData.email}
              />
            </div>
          </div>

          <button className="w-full py-4 bg-[#2D2926] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity">
            {saved ? 'CHANGES SAVED!' : 'UPDATE PROFILE'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;