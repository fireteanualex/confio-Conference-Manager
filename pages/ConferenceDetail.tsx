
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Conference, Paper, UserRole, PaperStatus } from '../types';
import { db } from '../db';

const ConferenceDetail: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conf, setConf] = useState<Conference | undefined>();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAssignReviewerModal, setShowAssignReviewerModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [reviewerSearchQuery, setReviewerSearchQuery] = useState('');

  const [editConf, setEditConf] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '17:00'
  });
  const [submission, setSubmission] = useState({ title: '', abstract: '', file_url: '' });

  // All hooks must be called before any conditional returns (Rules of Hooks)
  const availableReviewers = React.useMemo(() => {
    return allUsers.filter(u => {
      if (u.role !== UserRole.REVIEWER) return false;

      // Filter by search query
      const query = reviewerSearchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.surname.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    });
  }, [allUsers, reviewerSearchQuery]);

  const attendees = React.useMemo(() => {
    return allUsers.filter(u =>
      (conf?.attendeeIds || []).some(id => String(id) === String(u.id))
    );
  }, [allUsers, conf]);

  const availableUsers = React.useMemo(() => {
    return allUsers.filter(u => {
      const isAlreadyAttendee = (conf?.attendeeIds || []).some(id => String(id) === String(u.id));
      const isOrganizerOfMeeting = conf && String(u.id) === String(conf.organizer_id);
      if (isAlreadyAttendee || isOrganizerOfMeeting) return false;

      const query = inviteSearchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.surname.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    });
  }, [allUsers, conf, inviteSearchQuery]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading conference with id:', id);

      const conferences = await db.getConferences();
      console.log('Fetched conferences:', conferences);

      const conference = conferences.find(c => String(c.id) === String(id));
      console.log('Found conference:', conference);

      if (!conference) {
        console.warn('Conference not found for id:', id);
        setLoading(false);
        return;
      }

      setConf(conference);
      setEditConf({
        title: conference.title,
        description: conference.description,
        start_date: conference.start_date,
        end_date: conference.end_date,
        start_time: conference.start_time || '09:00',
        end_time: conference.end_time || '17:00'
      });

      const [conferencePapers, users] = await Promise.all([
        db.getPapersByConference(conference.id),
        db.getUsers()
      ]);

      console.log('Loaded papers:', conferencePapers);
      console.log('Loaded users:', users);

      setPapers(conferencePapers);
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to load conference details:', error);
      alert('Failed to load conference details. Please check the console for more information.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center font-light text-gray-500">Loading...</div>;
  }

  if (!conf) return <div className="p-20 text-center font-light text-gray-500">Conference not found</div>;

  const handleUpdate = async () => {
    try {
      const updated = await db.updateConference(conf.id, editConf, user);
      if (updated) {
        setConf(updated);
        setIsEditing(false);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      try {
        await db.deleteConference(conf.id, user);
        navigate('/dashboard');
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleInviteUser = async (userId: number | string) => {
    const currentAttendees = conf.attendeeIds || [];
    if (currentAttendees.some(id => String(id) === String(userId))) return;

    try {
      const updated = await db.updateConference(conf.id, {
        attendeeIds: [...currentAttendees, userId]
      }, user);
      if (updated) setConf(updated);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRemoveUser = async (userId: number | string) => {
    try {
      const updated = await db.updateConference(conf.id, {
        attendeeIds: (conf.attendeeIds || []).filter(id => String(id) !== String(userId))
      }, user);
      if (updated) setConf(updated);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSubmitPaper = async () => {
    try {
      await db.submitPaper({
        ...submission,
        author_id: user.id,
        conference_id: conf.id
      }, user);
      const updatedPapers = await db.getPapersByConference(conf.id);
      setPapers(updatedPapers);
      setShowSubmitModal(false);
      setSubmission({ title: '', abstract: '', file_url: '' });
      alert('Paper submitted! Reviewers will be assigned shortly.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAssignReviewer = async (reviewerId: number | string) => {
    if (!selectedPaper) return;
    try {
      await db.assignReviewerToPaper(selectedPaper.id, reviewerId, user);
      const updatedPapers = await db.getPapersByConference(conf.id);
      setPapers(updatedPapers);
      const updatedPaper = updatedPapers.find(p => p.id === selectedPaper.id);
      if (updatedPaper) setSelectedPaper(updatedPaper);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRemoveReviewer = async (paperId: number | string, reviewerId: number | string) => {
    try {
      await db.removeReviewerFromPaper(paperId, reviewerId, user);
      const updatedPapers = await db.getPapersByConference(conf.id);
      setPapers(updatedPapers);
      if (selectedPaper && selectedPaper.id === paperId) {
        const updatedPaper = updatedPapers.find(p => p.id === paperId);
        if (updatedPaper) setSelectedPaper(updatedPaper);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openAssignReviewerModal = (paper: Paper) => {
    setSelectedPaper(paper);
    setReviewerSearchQuery('');
    setShowAssignReviewerModal(true);
  };

  const isOrganizerRole = user.role === UserRole.ORGANIZER;
  const isMeetingOrganizer = String(user.id) === String(conf.organizer_id);
  const canManageMeeting = isOrganizerRole && isMeetingOrganizer;
  const canSubmit = user.role === UserRole.AUTHOR;

  const getAssignedReviewers = (paper: Paper) => {
    if (!paper.reviewer_ids || paper.reviewer_ids.length === 0) return [];
    return allUsers.filter(u =>
      paper.reviewer_ids?.some(id => String(id) === String(u.id))
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-6 w-full animate-in slide-in-from-top-2">
              <input 
                value={editConf.title} 
                onChange={e => setEditConf({...editConf, title: e.target.value})}
                className="text-4xl font-light bg-transparent border-b border-[#2D2926]/30 focus:border-[#2D2926] outline-none w-full pb-2 transition-colors"
                placeholder="Meeting Title"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <input type="date" value={editConf.start_date} onChange={e => setEditConf({...editConf, start_date: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-[#2D2926]/10 rounded-xl text-xs focus:border-[#2D2926] focus:outline-none transition-colors" />
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <input type="time" value={editConf.start_time} onChange={e => setEditConf({...editConf, start_time: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-[#2D2926]/10 rounded-xl text-xs focus:border-[#2D2926] focus:outline-none transition-colors" />
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <input type="date" value={editConf.end_date} onChange={e => setEditConf({...editConf, end_date: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-[#2D2926]/10 rounded-xl text-xs focus:border-[#2D2926] focus:outline-none transition-colors" />
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <input type="time" value={editConf.end_time} onChange={e => setEditConf({...editConf, end_time: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-[#2D2926]/10 rounded-xl text-xs focus:border-[#2D2926] focus:outline-none transition-colors" />
                </div>
              </div>
            </div>
          ) : (
            <h1 className="text-4xl font-light mb-4">{conf.title}</h1>
          )}
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mt-4">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              {conf.start_date} {conf.start_time}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Until {conf.end_date} {conf.end_time}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {conf.type}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          {conf.meeting_link && (conf.type === 'ONLINE' || conf.type === 'HYBRID') && (
            <a 
              href={conf.meeting_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-3 bg-[#2D2926] text-white rounded-full text-xs font-bold shadow-xl hover:scale-105 transition-all text-center uppercase tracking-widest"
            >
              Join Live Session
            </a>
          )}
          <div className="flex gap-2 justify-end">
            {canManageMeeting && (
              <>
                {isEditing ? (
                  <button onClick={handleUpdate} className="px-6 py-2 bg-black text-white rounded-full text-xs font-bold shadow-lg hover:opacity-90 transition-opacity">SAVE CHANGES</button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="px-6 py-2 border border-black rounded-full text-xs font-bold hover:bg-black hover:text-white transition-all">EDIT MEETING</button>
                )}
                <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-xs font-semibold mb-6 uppercase tracking-widest text-gray-400">Description</h2>
            {isEditing ? (
              <textarea 
                value={editConf.description} 
                onChange={e => setEditConf({...editConf, description: e.target.value})}
                className="w-full p-6 bg-white rounded-3xl border border-gray-100 min-h-[150px] outline-none shadow-sm focus:border-black transition-colors font-light"
                placeholder="Details about the meeting..."
              />
            ) : (
              <p className="text-gray-600 leading-relaxed bg-white/50 p-8 rounded-[40px] border border-white/50 font-light whitespace-pre-wrap">{conf.description}</p>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Scientific Submissions ({papers.length})</h2>
              {canSubmit && (
                <button onClick={() => setShowSubmitModal(true)} className="px-4 py-2 bg-[#2D2926] text-white rounded-full text-[10px] font-bold tracking-widest hover:opacity-90 transition-opacity">SUBMIT PAPER</button>
              )}
            </div>
            
            <div className="space-y-4">
              {papers.length > 0 ? papers.map(paper => {
                const assignedReviewers = getAssignedReviewers(paper);
                return (
                  <div key={paper.id} className="bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{paper.title}</h4>
                        <p className="text-xs text-gray-400">Version {paper.version} • Status: <span className="font-bold text-[#2D2926] uppercase tracking-widest text-[9px]">{paper.status}</span></p>
                      </div>
                      <button className="p-3 hover:bg-gray-50 rounded-2xl transition-colors text-gray-400 hover:text-black">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      </button>
                    </div>

                    {/* Assigned Reviewers Section */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Assigned Reviewers ({assignedReviewers.length})</h5>
                        {canManageMeeting && (
                          <button
                            onClick={() => openAssignReviewerModal(paper)}
                            className="px-3 py-1 bg-[#F2F1E8] rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-[#2D2926] hover:text-white transition-all"
                          >
                            + Assign
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {assignedReviewers.length > 0 ? assignedReviewers.map(reviewer => (
                          <div key={reviewer.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                            <img src={reviewer.profilePicture || `https://ui-avatars.com/api/?name=${reviewer.name}`} className="w-5 h-5 rounded-full object-cover" alt="" />
                            <span className="text-xs font-medium">{reviewer.name} {reviewer.surname}</span>
                            {canManageMeeting && (
                              <button
                                onClick={() => handleRemoveReviewer(paper.id, reviewer.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            )}
                          </div>
                        )) : (
                          <p className="text-xs text-gray-400 italic">No reviewers assigned yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[40px] bg-white/30">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">No papers submitted yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Invited Attendees ({attendees.length})</h2>
              {canManageMeeting && (
                <button 
                  onClick={() => { setShowInviteModal(true); setInviteSearchQuery(''); }}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                >
                  +
                </button>
              )}
            </div>
            <div className="space-y-3">
              {attendees.map(attendee => (
                <div key={attendee.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-50 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img src={attendee.profilePicture || `https://ui-avatars.com/api/?name=${attendee.name}`} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div>
                      <p className="text-sm font-semibold">{attendee.name} {attendee.surname}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{attendee.role}</p>
                    </div>
                  </div>
                  {canManageMeeting && (
                    <button onClick={() => handleRemoveUser(attendee.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  )}
                </div>
              ))}
              {attendees.length === 0 && <p className="text-center text-xs text-gray-400 py-4 italic font-light">No attendees invited yet.</p>}
            </div>
          </section>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light mb-6 logo-text">Invite Users</h2>
            
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-[#F2F1E8] border border-[#2D2926]/5 rounded-2xl focus:outline-none focus:border-[#2D2926]/20 font-light text-sm transition-all"
                value={inviteSearchQuery}
                onChange={(e) => setInviteSearchQuery(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              {availableUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div>
                      <p className="text-sm font-semibold">{u.name} {u.surname}</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleInviteUser(u.id)}
                    className="px-4 py-1.5 bg-[#F2F1E8] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#2D2926] hover:text-white transition-all"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => { setShowInviteModal(false); setInviteSearchQuery(''); }} 
              className="mt-8 w-full py-4 border border-gray-100 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light mb-6 logo-text">Submit Paper</h2>
            <div className="space-y-4">
              <input
                type="text" placeholder="Paper Title"
                className="w-full px-4 py-3 bg-[#F2F1E8]/30 border border-[#2D2926]/10 rounded-xl focus:outline-none transition-colors font-light"
                value={submission.title}
                onChange={e => setSubmission({...submission, title: e.target.value})}
              />
              <textarea
                placeholder="Abstract"
                className="w-full px-4 py-3 bg-[#F2F1E8]/30 border border-[#2D2926]/10 rounded-xl focus:outline-none h-32 transition-colors font-light"
                value={submission.abstract}
                onChange={e => setSubmission({...submission, abstract: e.target.value})}
              />
              <div className="border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center">
                <p className="text-[10px] text-gray-400 mb-2 font-bold tracking-widest uppercase">Select PDF Document</p>
                <input type="file" className="text-xs mx-auto" onChange={e => setSubmission({...submission, file_url: 'mock_url'})} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest hover:text-black transition-colors">Cancel</button>
              <button onClick={handleSubmitPaper} className="flex-1 py-4 bg-[#2D2926] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity">SUBMIT</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Reviewer Modal */}
      {showAssignReviewerModal && selectedPaper && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light mb-2 logo-text">Assign Reviewers</h2>
            <p className="text-sm text-gray-500 mb-6">Paper: <span className="font-semibold">{selectedPaper.title}</span></p>

            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input
                type="text"
                placeholder="Search reviewers by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-[#F2F1E8] border border-[#2D2926]/5 rounded-2xl focus:outline-none focus:border-[#2D2926]/20 font-light text-sm transition-all"
                value={reviewerSearchQuery}
                onChange={(e) => setReviewerSearchQuery(e.target.value)}
              />
            </div>

            {/* Currently Assigned Reviewers */}
            {getAssignedReviewers(selectedPaper).length > 0 && (
              <div className="mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Currently Assigned</h3>
                <div className="space-y-2">
                  {getAssignedReviewers(selectedPaper).map(reviewer => (
                    <div key={reviewer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <img src={reviewer.profilePicture || `https://ui-avatars.com/api/?name=${reviewer.name}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                        <div>
                          <p className="text-sm font-semibold">{reviewer.name} {reviewer.surname}</p>
                          <p className="text-[10px] text-gray-400">{reviewer.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveReviewer(selectedPaper.id, reviewer.id)}
                        className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Reviewers */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Available Reviewers</h3>
              {availableReviewers.filter(r =>
                !getAssignedReviewers(selectedPaper).some(ar => ar.id === r.id)
              ).map(reviewer => (
                <div key={reviewer.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={reviewer.profilePicture || `https://ui-avatars.com/api/?name=${reviewer.name}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                    <div>
                      <p className="text-sm font-semibold">{reviewer.name} {reviewer.surname}</p>
                      <p className="text-[10px] text-gray-400">{reviewer.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssignReviewer(reviewer.id)}
                    className="px-4 py-1.5 bg-[#F2F1E8] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#2D2926] hover:text-white transition-all"
                  >
                    Assign
                  </button>
                </div>
              ))}
              {availableReviewers.filter(r =>
                !getAssignedReviewers(selectedPaper).some(ar => ar.id === r.id)
              ).length === 0 && (
                <p className="text-center text-xs text-gray-400 py-8 italic">No available reviewers found</p>
              )}
            </div>

            <button
              onClick={() => { setShowAssignReviewerModal(false); setReviewerSearchQuery(''); }}
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

export default ConferenceDetail;