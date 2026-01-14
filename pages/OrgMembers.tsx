
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Organization, UserRole } from '../types';
import { db } from '../db';
import { Trash2 } from 'lucide-react';

const OrgMembers: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams();
  const [org, setOrg] = useState<Organization | undefined>();
  const [owner, setOwner] = useState<User | undefined>();
  const [members, setMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (!id) {
        setLoading(false);
        return;
      }
      const organization = await db.getOrganizationById(id);
      if (!organization) {
        setLoading(false);
        return;
      }
      setOrg(organization);

      const users = await db.getUsers();
      setAllUsers(users);

      const orgOwner = users.find(u => String(u.id) === String(organization.ownerId));
      setOwner(orgOwner);

      const orgMembers = users.filter(u =>
        organization.memberIds.some(mid => String(mid) === String(u.id)) &&
        String(u.id) !== String(organization.ownerId)
      );
      setMembers(orgMembers);
    } catch (error) {
      console.error('Failed to load organization members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: number | string) => {
    if (!org) return;
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        const updatedMemberIds = org.memberIds.filter(id => String(id) !== String(memberId));
        await db.updateOrganization(org.id, { memberIds: updatedMemberIds }, user);
        setMembers(members.filter(m => String(m.id) !== String(memberId)));
      } catch (error) {
        console.error('Failed to remove member:', error);
        alert('Failed to remove member. Please try again.');
      }
    }
  };

  const handleInviteMember = async (userId: number | string) => {
    if (!org) return;
    try {
      const updatedMemberIds = [...org.memberIds, userId];
      const updatedOrg = await db.updateOrganization(org.id, { memberIds: updatedMemberIds }, user);
      if (updatedOrg) {
        setOrg(updatedOrg);
        // Refresh members list
        const users = await db.getUsers();
        const orgMembers = users.filter(u =>
          updatedOrg.memberIds.some(mid => String(mid) === String(u.id)) &&
          String(u.id) !== String(updatedOrg.ownerId)
        );
        setMembers(orgMembers);
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      alert('Failed to invite member. Please try again.');
    }
  };

  const isOwner = org && String(user.id) === String(org.ownerId);

  const availableUsers = allUsers.filter(u => {
    if (!org) return false;
    const isSelf = String(u.id) === String(user.id);
    const isAlreadyMember = org.memberIds.some(mid => String(mid) === String(u.id));
    const isOrgOwner = String(u.id) === String(org.ownerId);
    const isConfirmed = u.isConfirmed;

    if (isSelf || isAlreadyMember || isOrgOwner || !isConfirmed) return false;

    const query = memberSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.surname.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <div className="p-20 text-center font-light">Loading...</div>;
  }

  if (!org) return <div className="p-20 text-center font-light">Organization not found</div>;
  
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
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team Members ({members.length})</h2>
            {isOwner && (
              <button
                onClick={() => { setShowInviteModal(true); setMemberSearchQuery(''); }}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-all text-sm font-bold"
                title="Add Member"
              >
                +
              </button>
            )}
          </div>
          <div className="space-y-4">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-4 bg-white/50 rounded-3xl border border-[#2D2926]/5 hover:bg-white transition-all">
                <img src={member.profilePicture} className="w-12 h-12 rounded-xl object-cover" alt="" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{member.name} {member.surname}</p>
                  <p className="text-[10px] text-gray-400">{member.email}</p>
                </div>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{member.role}</span>
                {String(user.id) === String(org.ownerId) && String(member.id) !== String(org.ownerId) && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="opacity-1 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
                  title="Remove Member"
                >
                  <Trash2 size={16} />
                </button>
              )}
              </div>
            ))}
            {members.length === 0 && (
              <div className="py-12 text-center text-gray-300 italic text-sm">No members added yet.</div>
            )}
          </div>
        </section>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light mb-6 logo-text">Add Members</h2>

            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-[#F2F1E8] border border-[#2D2926]/5 rounded-2xl focus:outline-none focus:border-[#2D2926]/20 font-light text-sm transition-all"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              {availableUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}+${u.surname}&background=2D2926&color=F2F1E8`}
                      className="w-10 h-10 rounded-full object-cover"
                      alt=""
                    />
                    <div>
                      <p className="text-sm font-semibold">{u.name} {u.surname}</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleInviteMember(u.id);
                    }}
                    className="px-4 py-1.5 bg-[#F2F1E8] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#2D2926] hover:text-white transition-all"
                  >
                    Add
                  </button>
                </div>
              ))}
              {availableUsers.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-400 text-xs italic font-light">
                    {memberSearchQuery ? 'No users matching your search.' : 'No users available to add.'}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowInviteModal(false); setMemberSearchQuery(''); }}
              className="mt-8 w-full py-4 border border-gray-100 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

};

export default OrgMembers;