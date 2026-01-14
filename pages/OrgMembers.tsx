
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Organization, UserRole } from '../types';
import { db } from '../db';

const OrgMembers: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams();
  const org = db.getOrganizationById(Number(id));
  
  if (!org) return <div className="p-20 text-center font-light">Organization not found</div>;

  const owner = db.getUsers().find(u => u.id === org.ownerId);
  const members = db.getUsers().filter(u => org.memberIds.includes(u.id));

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <header className="flex items-center justify-between border-b border-[#2D2926]/10 pb-8">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="w-10 h-10 flex items-center justify-center border border-[#2D2926]/10 rounded-full hover:bg-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </Link>
          <div>
            <h1 className="text-3xl font-light logo-text">{org.name}</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Directory / Members</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization Owner</h2>
          {owner && (
            <div className="flex items-center gap-4 p-6 bg-white rounded-[32px] border border-[#2D2926]/5 shadow-sm">
              <img src={owner.profilePicture} className="w-16 h-16 rounded-2xl object-cover shadow-sm" alt="" />
              <div>
                <p className="text-lg font-medium">{owner.name} {owner.surname}</p>
                <p className="text-xs text-gray-400">{owner.email}</p>
                <span className="mt-2 inline-block px-3 py-1 bg-[#2D2926] text-white rounded-full text-[8px] font-bold uppercase tracking-widest">OWNER</span>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team Members ({members.length})</h2>
          <div className="space-y-4">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-4 bg-white/50 rounded-3xl border border-[#2D2926]/5 hover:bg-white transition-all">
                <img src={member.profilePicture} className="w-12 h-12 rounded-xl object-cover" alt="" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{member.name} {member.surname}</p>
                  <p className="text-[10px] text-gray-400">{member.email}</p>
                </div>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{member.role}</span>
              </div>
            ))}
            {members.length === 0 && (
              <div className="py-12 text-center text-gray-300 italic text-sm">No members added yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default OrgMembers;
