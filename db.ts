
import { User, UserRole, Conference, Paper, Review, Organization, PaperStatus, OrgInvitation, InvitationStatus } from './types';

// Initial Mock Data
const INITIAL_USERS: User[] = [
  { id: 1, name: 'Alex', surname: 'Organizer', email: 'alex@confio.com', role: UserRole.ORGANIZER, profilePicture: 'https://picsum.photos/200', isConfirmed: true },
  { id: 2, name: 'Sam', surname: 'Reviewer', email: 'sam@confio.com', role: UserRole.REVIEWER, profilePicture: 'https://picsum.photos/201', isConfirmed: true },
  { id: 3, name: 'Jordan', surname: 'Author', email: 'jordan@confio.com', role: UserRole.AUTHOR, profilePicture: 'https://picsum.photos/202', isConfirmed: true },
  { id: 4, name: 'Blake', surname: 'Reviewer', email: 'blake@confio.com', role: UserRole.REVIEWER, profilePicture: 'https://picsum.photos/203', isConfirmed: true },
];

class MockDB {
  private users: User[] = JSON.parse(localStorage.getItem('confio_users') || JSON.stringify(INITIAL_USERS));
  private organizations: Organization[] = JSON.parse(localStorage.getItem('confio_orgs') || '[]');
  private conferences: Conference[] = JSON.parse(localStorage.getItem('confio_conferences') || '[]');
  private papers: Paper[] = JSON.parse(localStorage.getItem('confio_papers') || '[]');
  private reviews: Review[] = JSON.parse(localStorage.getItem('confio_reviews') || '[]');
  private invitations: OrgInvitation[] = JSON.parse(localStorage.getItem('confio_invitations') || '[]');
  private rememberedAccounts: string[] = JSON.parse(localStorage.getItem('confio_remembered') || '[]');

  // Base URL for the Node.js backend
  private API_URL = 'http://localhost:3001/api';

  private save() {
    localStorage.setItem('confio_users', JSON.stringify(this.users));
    localStorage.setItem('confio_orgs', JSON.stringify(this.organizations));
    localStorage.setItem('confio_conferences', JSON.stringify(this.conferences));
    localStorage.setItem('confio_papers', JSON.stringify(this.papers));
    localStorage.setItem('confio_reviews', JSON.stringify(this.reviews));
    localStorage.setItem('confio_invitations', JSON.stringify(this.invitations));
    localStorage.setItem('confio_remembered', JSON.stringify(this.rememberedAccounts));
  }

  // Auth & User Management
  getUsers() { return this.users; }
  
  registerUser(userData: Omit<User, 'id' | 'isConfirmed'>) {
    const newUser = { ...userData, id: Date.now(), isConfirmed: false };
    this.users.push(newUser);
    this.save();
    
    // Optional: Sync with backend if available
    fetch(`${this.API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).catch(err => console.debug("Backend sync skipped (running in local mode)"));

    return newUser;
  }

  confirmUserEmail(email: string) {
    const user = this.users.find(u => u.email === email);
    if (user) {
      user.isConfirmed = true;
      this.save();
      return true;
    }
    return false;
  }

  updateUser(userId: number, updates: Partial<User>) {
    this.users = this.users.map(u => u.id === userId ? { ...u, ...updates } : u);
    this.save();
    return this.users.find(u => u.id === userId);
  }

  getRememberedAccounts() {
    return this.users.filter(u => this.rememberedAccounts.includes(u.email));
  }

  rememberAccount(email: string) {
    if (!this.rememberedAccounts.includes(email)) {
      this.rememberedAccounts.push(email);
      this.save();
    }
  }

  forgetAccount(email: string) {
    this.rememberedAccounts = this.rememberedAccounts.filter(e => e !== email);
    this.save();
  }

  // Organization Management
  getOrganizations() { return this.organizations; }
  
  getOrganizationById(id: number) {
    return this.organizations.find(o => o.id === id);
  }

  createOrganization(org: Omit<Organization, 'id'>, caller: User) {
    if (caller.role !== UserRole.ORGANIZER) throw new Error("Unauthorized: Only Organizers can create organizations.");
    const newOrg = { ...org, id: Date.now() };
    this.organizations.push(newOrg);
    this.save();

    fetch(`${this.API_URL}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrg)
    }).catch(() => {});

    return newOrg;
  }

  updateOrganization(orgId: number, updates: Partial<Organization>, caller: User) {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) throw new Error("Organization not found");
    if (org.ownerId !== caller.id && caller.role !== UserRole.ORGANIZER) {
      throw new Error("Unauthorized");
    }
    this.organizations = this.organizations.map(o => o.id === orgId ? { ...o, ...updates } : o);
    this.save();
    return this.organizations.find(o => o.id === orgId);
  }

  deleteOrganization(orgId: number, caller: User) {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) throw new Error("Organization not found");
    if (org.ownerId !== caller.id) throw new Error("Unauthorized");
    this.organizations = this.organizations.filter(o => o.id !== orgId);
    this.conferences = this.conferences.filter(c => c.organization_id !== orgId);
    this.save();
  }

  // Invitation Management
  createInvitation(orgId: number, invitedUserId: number, caller: User) {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) throw new Error("Organization not found");
    if (org.ownerId !== caller.id) throw new Error("Unauthorized: Only owners can invite members.");

    const invitedUser = this.users.find(u => u.id === invitedUserId);
    if (!invitedUser) throw new Error("User not found");

    const newInvite: OrgInvitation = {
      id: Date.now(),
      orgId,
      invitedUserId,
      status: InvitationStatus.PENDING,
      invitedByUserId: caller.id
    };
    this.invitations.push(newInvite);
    this.save();
    return newInvite;
  }

  getInvitationsForUser(userId: number) {
    return this.invitations.filter(i => i.invitedUserId === userId && i.status === InvitationStatus.PENDING);
  }

  respondToInvitation(inviteId: number, status: InvitationStatus.ACCEPTED | InvitationStatus.DECLINED, caller: User) {
    const invite = this.invitations.find(i => i.id === inviteId);
    if (!invite) throw new Error("Invitation not found");
    if (invite.invitedUserId !== caller.id) throw new Error("Unauthorized");

    invite.status = status;
    if (status === InvitationStatus.ACCEPTED) {
      const org = this.organizations.find(o => o.id === invite.orgId);
      if (org && !org.memberIds.includes(caller.id)) {
        org.memberIds.push(caller.id);
      }
    }
    this.save();
  }

  // Conference Management
  getConferences() { return this.conferences; }

  getConferencesByOrg(orgId: number) {
    return this.conferences.filter(c => c.organization_id === orgId);
  }
  
  createConference(conf: Omit<Conference, 'id'>, caller: User) {
    if (caller.role !== UserRole.ORGANIZER) throw new Error("Unauthorized");
    const newConf = { ...conf, id: Date.now(), attendeeIds: conf.attendeeIds || [] };
    this.conferences.push(newConf);
    this.save();

    fetch(`${this.API_URL}/conferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConf)
    }).catch(() => {});

    return newConf;
  }

  updateConference(confId: number, updates: Partial<Conference>, caller: User) {
    const conf = this.conferences.find(c => c.id === confId);
    if (!conf) throw new Error("Meeting not found");
    if (conf.organizer_id !== caller.id) throw new Error("Unauthorized");
    
    this.conferences = this.conferences.map(c => c.id === confId ? { ...c, ...updates } : c);
    this.save();
    return this.conferences.find(c => c.id === confId);
  }

  deleteConference(confId: number, caller: User) {
    const conf = this.conferences.find(c => c.id === confId);
    if (!conf) throw new Error("Meeting not found");
    if (conf.organizer_id !== caller.id) throw new Error("Unauthorized");
    this.conferences = this.conferences.filter(c => c.id !== confId);
    this.save();
  }

  submitPaper(paperData: Omit<Paper, 'id' | 'version' | 'status'>, caller: User) {
    if (caller.role !== UserRole.AUTHOR) throw new Error("Unauthorized");
    const newPaper: Paper = { ...paperData, id: Date.now(), version: 1, status: PaperStatus.SUBMITTED };
    this.papers.push(newPaper);
    this.save();
    return newPaper;
  }

  getPapersByConference(confId: number) {
    return this.papers.filter(p => p.conference_id === confId);
  }
}

export const db = new MockDB();
