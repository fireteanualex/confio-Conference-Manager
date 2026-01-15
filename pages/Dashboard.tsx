
import React, { useState, useEffect } from 'react';
import { User, Conference, Organization, UserRole, OrgInvitation, InvitationStatus, ConferenceType } from '../types';
import { db } from '../db';
import { Link } from 'react-router-dom';
import { compressImage } from '../utils/imageCompression';

// Separate component for conference card to properly use hooks
const ConferenceCard: React.FC<{ conf: Conference; user: User; onDelete: (e: React.MouseEvent, id: number | string) => void }> = ({ conf, user, onDelete }) => {
  const [paperCount, setPaperCount] = useState(0);

  useEffect(() => {
    const loadPaperCount = async () => {
      const papers = await db.getPapersByConference(conf.id);
      setPaperCount(papers.length);
    };
    loadPaperCount();
  }, [conf.id]);

  // Participant count includes attendees + the organizer
  const attendeeCount = (conf.attendeeIds || []).length + 1;
  const isUpcoming = new Date(conf.start_date) > new Date();

  return (
    <Link to={`/conference/${conf.id}`} className="group relative bg-white p-10 rounded-[48px] border border-[#2D2926]/5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-start mb-8">
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-[#F2F1E8] text-[#2D2926] rounded-full text-[9px] font-bold uppercase tracking-widest">
            {conf.type}
          </span>
          <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${isUpcoming ? 'bg-black text-white' : 'bg-red-500 text-white animate-pulse'}`}>
            {isUpcoming ? 'Soon' : 'Live'}
          </span>
        </div>
        {String(conf.organizer_id) === String(user.id) && (
          <button
            onClick={(e) => onDelete(e, conf.id)}
            className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="Remove Meeting"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-3xl font-light mb-3 group-hover:translate-x-1 transition-transform">{conf.title}</h3>
        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed font-light">{conf.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#F2F1E8]/40 p-3 rounded-2xl text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Submissions</p>
          <p className="text-lg font-semibold">{paperCount}</p>
        </div>
        <div className="bg-[#F2F1E8]/40 p-3 rounded-2xl text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Participants</p>
          <p className="text-lg font-semibold">{attendeeCount}</p>
        </div>
        <div className="bg-[#F2F1E8]/40 p-3 rounded-2xl text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Time</p>
          <p className="text-xs font-semibold mt-1">{conf.start_time}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-gray-50 gap-4">
        <div className="text-xs text-gray-400 font-medium">
          {conf.start_date}
        </div>

        <div className="flex items-center gap-3">
          {(conf.type === 'ONLINE' || conf.type === 'HYBRID') && conf.meeting_link && (
            <a
              href={conf.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-6 py-3 bg-[#2D2926] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Join Session
            </a>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2926] opacity-40 group-hover:opacity-100 transition-opacity">Details &rarr;</span>
        </div>
      </div>
    </Link>
  );
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | string | null>(null);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showConfModal, setShowConfModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [invitingToOrg, setInvitingToOrg] = useState<Organization | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [compressingLogo, setCompressingLogo] = useState(false);

  const [newOrg, setNewOrg] = useState({ name: '', logoUrl: '' });
  const [newConf, setNewConf] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '17:00',
    type: 'OFFLINE' as ConferenceType,
    meeting_link: ''
  });

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  // Load conferences when org is selected
  useEffect(() => {
    const loadConferences = async () => {
      if (selectedOrgId) {
        const confs = await db.getConferencesByOrg(selectedOrgId);
        setConferences(confs);
      } else {
        setConferences([]);
      }
    };
    loadConferences();
  }, [selectedOrgId]);

  const refreshData = async () => {
    try {
      setLoading(true);

      // Ensure user.id exists before making API calls
      if (!user || !user.id) {
        console.error('User ID is not available');
        setLoading(false);
        return;
      }

      const [orgs, invites, users] = await Promise.all([
        db.getOrganizations(),
        db.getInvitationsForUser(user.id),
        db.getUsers()
      ]);

      const userOrgs = orgs.filter(o =>
        String(o.ownerId) === String(user.id) ||
        o.memberIds.some(mid => String(mid) === String(user.id))
      );

      setOrganizations(userOrgs);
      setInvitations(invites);
      setAllUsers(users);

      if (selectedOrgId && !userOrgs.find(o => String(o.id) === String(selectedOrgId))) {
        setSelectedOrgId(null);
        setConferences([]);
      } else if (selectedOrgId) {
        const confs = await db.getConferencesByOrg(selectedOrgId);
        setConferences(confs);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async () => {
    try {
      await db.createOrganization({ name: newOrg.name, logoUrl: newOrg.logoUrl, ownerId: user.id, memberIds: [] }, user);
      await refreshData();
      setShowOrgModal(false);
      setNewOrg({ name: '', logoUrl: '' });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateOrg = async () => {
    if (editingOrg) {
      try {
        await db.updateOrganization(editingOrg.id, { name: editingOrg.name, logoUrl: editingOrg.logoUrl }, user);
        await refreshData();
        setEditingOrg(null);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleDeleteOrg = async () => {
    if (editingOrg && confirm(`Are you sure you want to delete "${editingOrg.name}"? All associated meetings will be lost.`)) {
      try {
        await db.deleteOrganization(editingOrg.id, user);
        await refreshData();
        setEditingOrg(null);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleCreateConf = async () => {
    if (!selectedOrgId) return;
    try {
      await db.createConference({
        ...newConf,
        organizer_id: user.id,
        organization_id: selectedOrgId
      }, user);
      await refreshData();
      setShowConfModal(false);
      setNewConf({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        start_time: '09:00',
        end_time: '17:00',
        type: 'OFFLINE',
        meeting_link: ''
      });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteConf = async (e: React.MouseEvent, confId: number | string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Permanently remove this meeting?')) {
      try {
        await db.deleteConference(confId, user);
        await refreshData();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleInviteMember = async (targetUserId: number | string) => {
    if (invitingToOrg) {
      try {
        await db.createInvitation(invitingToOrg.id, targetUserId, user);
        alert("Invitation sent successfully.");
        setInvitingToOrg(null);
        setMemberSearchQuery('');
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleRespondInvitation = async (inviteId: number | string, status: InvitationStatus.ACCEPTED | InvitationStatus.DECLINED) => {
    try {
      await db.respondToInvitation(inviteId, status, user);
      await refreshData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setCompressingLogo(true);
      try {
        // Compress image before uploading (smaller size for logos)
        const compressedImage = await compressImage(file, 400, 400, 0.85);

        if (isEditing && editingOrg) {
          setEditingOrg({ ...editingOrg, logoUrl: compressedImage });
        } else {
          setNewOrg({ ...newOrg, logoUrl: compressedImage });
        }
      } catch (error) {
        console.error('Logo compression failed:', error);
        alert('Failed to process logo. Please try another file.');
      } finally {
        setCompressingLogo(false);
      }
    }
  };

  const isOrganizer = user.role === UserRole.ORGANIZER;

  const filteredPotentialInvitees = allUsers.filter(u => {
    const isSelf = String(u.id) === String(user.id);
    const isAlreadyMember = invitingToOrg?.memberIds.some(mid => String(mid) === String(u.id));
    const isOwner = String(invitingToOrg?.ownerId) === String(u.id);
    const isConfirmed = u.isConfirmed;

    if (isSelf || isAlreadyMember || isOwner || !isConfirmed) return false;

    const query = memberSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.surname.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section className="bg-white border border-[#2D2926]/5 rounded-[40px] p-8 shadow-sm">
          <h2 className="text-xs font-semibold mb-6 uppercase tracking-widest text-gray-400">Pending Invitations</h2>
          <div className="space-y-4">
            {invitations.map(invite => {
              const org = organizations.find(o => String(o.id) === String(invite.orgId));
              const sender = allUsers.find(u => String(u.id) === String(invite.invitedByUserId));
              return (
                <div key={invite.id} className="flex items-center justify-between p-4 bg-[#F2F1E8]/50 rounded-3xl border border-[#2D2926]/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-bold text-[#2D2926]">
                      {org?.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover rounded-2xl" alt="" /> : org?.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Invitation to join <span className="font-bold">{org?.name}</span></p>
                      <p className="text-xs text-gray-500 italic">Sent by {sender?.name} {sender?.surname}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondInvitation(invite.id, InvitationStatus.ACCEPTED)}
                      className="px-6 py-2 bg-[#2D2926] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondInvitation(invite.id, InvitationStatus.DECLINED)}
                      className="px-6 py-2 border border-[#2D2926] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-light mb-2">Hello, {user.name}</h1>
          <p className="text-gray-500">Select an organization below to access meetings.</p>
        </div>
        {isOrganizer && (
          <div className="flex gap-4">
            <button
              onClick={() => setShowOrgModal(true)}
              className="px-6 py-2 border border-[#2D2926] rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              + NEW ORGANIZATION
            </button>
          </div>
        )}
      </header>

      {/* Organizations Section */}
      <section>
        <h2 className="text-xs font-semibold mb-6 uppercase tracking-widest text-gray-400">Your Organizations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map(org => (
            <div
              key={org.id}
              onClick={() => setSelectedOrgId(org.id)}
              className={`group cursor-pointer transition-all p-6 rounded-[32px] border ${String(selectedOrgId) === String(org.id) ? 'bg-[#2D2926] border-[#2D2926] text-[#F2F1E8] shadow-2xl' : 'bg-white border-[#2D2926]/5 shadow-sm text-[#2D2926]'} hover:shadow-lg`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold overflow-hidden bg-[#F2F1E8] text-[#2D2926]`}>
                  {org.logoUrl ? (
                    <img src={org.logoUrl} className="w-full h-full object-cover" alt={org.name} />
                  ) : (
                    <span className="text-2xl">{org.name[0]}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{org.name}</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${String(selectedOrgId) === String(org.id) ? 'text-[#F2F1E8]/60' : 'text-gray-400'}`}>
                    {String(org.ownerId) === String(user.id) ? 'My Organization' : 'Member'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                {String(org.ownerId) === String(user.id) && (
                  <>
                    <button
                      onClick={() => setEditingOrg(org)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${String(selectedOrgId) === String(org.id) ? 'bg-[#F2F1E8]/10 hover:bg-[#F2F1E8]/20' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => { setInvitingToOrg(org); setMemberSearchQuery(''); }}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors ${String(selectedOrgId) === String(org.id) ? 'border-[#F2F1E8]/20 hover:bg-[#F2F1E8]/10' : 'border-[#2D2926]/10 hover:bg-gray-50'}`}
                    >
                      Invite
                    </button>
                  </>
                )}
                <Link
                  to={`/organization/${org.id}/members`}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center transition-colors ${String(selectedOrgId) === String(org.id) ? 'bg-[#F2F1E8] text-[#2D2926]' : 'bg-[#F2F1E8]'}`}
                >
                  Members
                </Link>
              </div>
            </div>
          ))}
          {organizations.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 italic">No organizations joined. Create one to get started.</div>
          )}
        </div>
      </section>

      {/* Conferences Section */}
      <section className="animate-in fade-in duration-700">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Meetings & Conferences</h2>
            <h3 className="text-xl font-light">
              {selectedOrgId ? organizations.find(o => String(o.id) === String(selectedOrgId))?.name : 'Selection Required'}
            </h3>
          </div>
          {selectedOrgId && isOrganizer && String(organizations.find(o => String(o.id) === String(selectedOrgId))?.ownerId) === String(user.id) && (
            <button
              onClick={() => setShowConfModal(true)}
              className="px-6 py-3 bg-[#2D2926] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-black/10"
            >
              + Create Meeting
            </button>
          )}
        </div>

        {selectedOrgId ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {conferences.map(conf => (
              <ConferenceCard
                key={conf.id}
                conf={conf}
                user={user}
                onDelete={handleDeleteConf}
              />
            ))}
            {conferences.length === 0 && (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[48px] bg-white/30">
                <div className="w-16 h-16 bg-[#F2F1E8] rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <p className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">No meetings planned in this organization.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-40 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[48px] bg-white/30 animate-pulse">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <p className="text-[#2D2926]/60 uppercase tracking-[0.2em] text-xs font-bold mb-2">Organization Workspace</p>
            <p className="text-gray-400 font-light text-sm max-w-xs mx-auto">Please select an organization from the cards above to see its scientific meetings and members.</p>
          </div>
        )}
      </section>

      {/* Settings Modal (Organization) */}
      {editingOrg && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
               <h2 className="text-2xl font-light logo-text">Org Settings</h2>
               <button onClick={handleDeleteOrg} className="p-2 text-red-300 hover:text-red-500 transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
               </button>
            </div>

            <div className="space-y-6 mb-10">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2 mb-2">Organization Name</label>
                <input
                  type="text"
                  placeholder="Organization Name"
                  className="w-full px-6 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] transition-colors font-light"
                  value={editingOrg.name}
                  onChange={e => setEditingOrg({ ...editingOrg, name: e.target.value })}
                />
              </div>

              <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                <div className="relative">
                  <img src={editingOrg.logoUrl || `https://ui-avatars.com/api/?name=${editingOrg.name}`} className="w-24 h-24 rounded-2xl object-cover shadow-sm" alt="Preview" />
                  {compressingLogo && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <label className={`cursor-pointer px-4 py-2 text-[9px] font-bold uppercase tracking-widest bg-white border border-gray-100 rounded-full transition-colors ${compressingLogo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}>
                  {compressingLogo ? 'Compressing...' : 'Change Logo'}
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleLogoUpload(e, true)} disabled={compressingLogo} />
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setEditingOrg(null)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest font-light">Cancel</button>
              <button onClick={handleUpdateOrg} className="flex-1 py-4 bg-[#2D2926] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Org Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light mb-6 logo-text">New Organization</h2>
            <div className="space-y-4 mb-8">
              <input
                type="text"
                placeholder="Organization Name"
                className="w-full px-4 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] transition-colors font-light"
                value={newOrg.name}
                onChange={e => setNewOrg({ ...newOrg, name: e.target.value })}
              />
              <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-gray-100 rounded-2xl">
                <div className="relative">
                  {newOrg.logoUrl ? (
                    <img src={newOrg.logoUrl} className="w-20 h-20 rounded-xl object-cover" alt="Preview" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300">LOGO</div>
                  )}
                  {compressingLogo && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <label className={`cursor-pointer px-4 py-1 text-[10px] font-bold uppercase tracking-widest bg-gray-100 rounded-full transition-colors ${compressingLogo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}>
                  {compressingLogo ? 'Compressing...' : 'Upload Logo'}
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleLogoUpload(e)} disabled={compressingLogo} />
                </label>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowOrgModal(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest font-light">Cancel</button>
              <button onClick={handleCreateOrg} className="flex-1 py-4 bg-[#2D2926] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {invitingToOrg && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light mb-2 logo-text">Invite Member</h2>
            <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest font-bold">To: {invitingToOrg.name}</p>

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
              {filteredPotentialInvitees.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div>
                      <p className="text-sm font-semibold">{u.name} {u.surname}</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInviteMember(u.id)}
                    className="px-4 py-1.5 bg-[#F2F1E8] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#2D2926] hover:text-white transition-all"
                  >
                    Send Invite
                  </button>
                </div>
              ))}
              {filteredPotentialInvitees.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-400 text-xs italic font-light">
                    {memberSearchQuery ? 'No users matching your search.' : 'No users available to invite.'}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => { setInvitingToOrg(null); setMemberSearchQuery(''); }}
              className="mt-8 w-full py-4 border border-gray-100 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showConfModal && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-2xl shadow-2xl my-auto animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light mb-6 logo-text">New Conference / Meeting</h2>
            <div className="space-y-6">
              <input
                type="text" placeholder="Meeting Title"
                className="w-full px-6 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none focus:border-[#2D2926] text-lg font-light transition-colors"
                value={newConf.title}
                onChange={e => setNewConf({...newConf, title: e.target.value})}
              />
              <textarea
                placeholder="Description"
                className="w-full px-6 py-4 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-2xl focus:outline-none h-32 font-light transition-colors"
                value={newConf.description}
                onChange={e => setNewConf({...newConf, description: e.target.value})}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest ml-2">Meeting Type</label>
                  <div className="flex gap-4 bg-[#F2F1E8] p-2 rounded-2xl border border-[#2D2926]/5">
                    {['OFFLINE', 'ONLINE', 'HYBRID'].map(t => (
                      <button
                        key={t}
                        onClick={() => setNewConf({...newConf, type: t as ConferenceType})}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${newConf.type === t ? 'bg-[#2D2926] text-white' : 'text-gray-400 hover:text-black'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {(newConf.type === 'ONLINE' || newConf.type === 'HYBRID') && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest ml-2">Meeting Link</label>
                    <input
                      type="url" placeholder="https://zoom.us/..."
                      className="w-full px-4 py-2 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-xl focus:outline-none font-light"
                      value={newConf.meeting_link}
                      onChange={e => setNewConf({...newConf, meeting_link: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest ml-2">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-xl focus:outline-none focus:border-[#2D2926] text-sm font-light cursor-pointer"
                      value={newConf.start_date}
                      onChange={e => setNewConf({...newConf, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest ml-2">Start Time</label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-xl focus:outline-none focus:border-[#2D2926] text-sm font-light cursor-pointer"
                      value={newConf.start_time}
                      onChange={e => setNewConf({...newConf, start_time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest ml-2">End Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-xl focus:outline-none focus:border-[#2D2926] text-sm font-light cursor-pointer"
                      value={newConf.end_date}
                      onChange={e => setNewConf({...newConf, end_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest ml-2">End Time</label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 bg-[#F2F1E8] border border-[#2D2926]/10 rounded-xl focus:outline-none focus:border-[#2D2926] text-sm font-light cursor-pointer"
                      value={newConf.end_time}
                      onChange={e => setNewConf({...newConf, end_time: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowConfModal(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest font-light">Cancel</button>
              <button onClick={handleCreateConf} className="flex-1 py-4 bg-[#2D2926] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-black/10">Launch Meeting</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
