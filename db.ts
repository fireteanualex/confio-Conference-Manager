
import axios from 'axios';
import { User, UserRole, Conference, Paper, Review, Organization, PaperStatus, OrgInvitation, InvitationStatus } from './types';

// API Base URL
const API_URL = 'http://localhost:3001/api';

// Axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

class DB {
  // localStorage keys for fallback/caching
  private rememberedAccounts: string[] = JSON.parse(localStorage.getItem('confio_remembered') || '[]');

  // Helper to save remembered accounts
  private saveRemembered() {
    localStorage.setItem('confio_remembered', JSON.stringify(this.rememberedAccounts));
  }

  // ==================== AUTH & USER MANAGEMENT ====================

  async getUsers(): Promise<User[]> {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  async getUserById(userId: number | string): Promise<User | undefined> {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return undefined;
    }
  }

  async registerUser(userData: Omit<User, 'id' | 'isConfirmed'> & { password: string }): Promise<User> {
    try {
      const response = await api.post('/register', userData);
      return response.data;
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async loginUser(email: string, password: string): Promise<User> {
    try {
      const response = await api.post('/login', { email, password });
      return response.data;
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  async confirmUserEmail(email: string): Promise<boolean> {
    try {
      const response = await api.post('/confirm-email', { email });
      return response.data.success;
    } catch (error) {
      console.error('Email confirmation failed:', error);
      return false;
    }
  }

  async updateUser(userId: number | string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const response = await api.put(`/users/${userId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  // Remembered accounts (still stored locally for convenience)
  getRememberedAccounts(): User[] {
    const users = JSON.parse(localStorage.getItem('confio_users') || '[]');
    return users.filter((u: User) => this.rememberedAccounts.includes(u.email));
  }

  rememberAccount(email: string) {
    if (!this.rememberedAccounts.includes(email)) {
      this.rememberedAccounts.push(email);
      // Keep only the 3 most recent remembered accounts
      if (this.rememberedAccounts.length > 3) {
        this.rememberedAccounts.shift(); // Remove oldest
      }
      this.saveRemembered();
    }
  }

  forgetAccount(email: string) {
    this.rememberedAccounts = this.rememberedAccounts.filter(e => e !== email);
    this.saveRemembered();
  }

  // ==================== ORGANIZATION MANAGEMENT ====================

  async getOrganizations(): Promise<Organization[]> {
    try {
      const response = await api.get('/organizations');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      throw error;
    }
  }

  async getOrganizationById(id: number | string): Promise<Organization | undefined> {
    try {
      const response = await api.get(`/organizations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      return undefined;
    }
  }

  async createOrganization(org: Omit<Organization, 'id'>, caller: User): Promise<Organization> {
    if (caller.role !== UserRole.ORGANIZER) {
      throw new Error("Unauthorized: Only Organizers can create organizations.");
    }
    try {
      const response = await api.post('/organizations', org);
      return response.data;
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  }

  async updateOrganization(orgId: number | string, updates: Partial<Organization>, caller: User): Promise<Organization | undefined> {
    try {
      const response = await api.put(`/organizations/${orgId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update organization:', error);
      throw error;
    }
  }

  async deleteOrganization(orgId: number | string, caller: User): Promise<void> {
    try {
      await api.delete(`/organizations/${orgId}`);
    } catch (error) {
      console.error('Failed to delete organization:', error);
      throw error;
    }
  }

  // ==================== INVITATION MANAGEMENT ====================

  async createInvitation(orgId: number | string, invitedUserId: number | string, caller: User): Promise<OrgInvitation> {
    try {
      const invitationData = {
        orgId,
        invitedUserId,
        invitedByUserId: caller.id,
        status: InvitationStatus.PENDING
      };
      const response = await api.post('/invitations', invitationData);
      return response.data;
    } catch (error) {
      console.error('Failed to create invitation:', error);
      throw error;
    }
  }

  async getInvitationsForUser(userId: number | string): Promise<OrgInvitation[]> {
    try {
      const response = await api.get(`/invitations/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      return [];
    }
  }

  async respondToInvitation(inviteId: number | string, status: InvitationStatus.ACCEPTED | InvitationStatus.DECLINED, caller: User): Promise<void> {
    try {
      await api.put(`/invitations/${inviteId}`, { status });

      // If accepted, update organization memberIds
      if (status === InvitationStatus.ACCEPTED) {
        const invitations = await api.get('/invitations');
        const invite = invitations.data.find((i: OrgInvitation) => i.id === inviteId);
        if (invite) {
          const org = await this.getOrganizationById(invite.orgId);
          if (org && !org.memberIds.includes(caller.id as number)) {
            org.memberIds.push(caller.id as number);
            await this.updateOrganization(org.id, { memberIds: org.memberIds }, caller);
          }
        }
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      throw error;
    }
  }

  // ==================== CONFERENCE MANAGEMENT ====================

  async getConferences(): Promise<Conference[]> {
    try {
      const response = await api.get('/conferences');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conferences:', error);
      throw error;
    }
  }

  async getConferencesByOrg(orgId: number | string): Promise<Conference[]> {
    try {
      const allConferences = await this.getConferences();
      return allConferences.filter(c => c.organization_id === orgId);
    } catch (error) {
      console.error('Failed to fetch conferences by org:', error);
      return [];
    }
  }

  async createConference(conf: Omit<Conference, 'id'>, caller: User): Promise<Conference> {
    if (caller.role !== UserRole.ORGANIZER) {
      throw new Error("Unauthorized: Only Organizers can create conferences.");
    }
    try {
      const response = await api.post('/conferences', {
        ...conf,
        attendeeIds: conf.attendeeIds || []
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create conference:', error);
      throw error;
    }
  }

  async updateConference(confId: number | string, updates: Partial<Conference>, caller: User): Promise<Conference | undefined> {
    try {
      const response = await api.put(`/conferences/${confId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update conference:', error);
      throw error;
    }
  }

  async deleteConference(confId: number | string, caller: User): Promise<void> {
    try {
      await api.delete(`/conferences/${confId}`);
    } catch (error) {
      console.error('Failed to delete conference:', error);
      throw error;
    }
  }

  // ==================== PAPER MANAGEMENT ====================

  async submitPaper(paperData: Omit<Paper, 'id' | 'version' | 'status'>, caller: User): Promise<Paper> {
    if (caller.role !== UserRole.AUTHOR) {
      throw new Error("Unauthorized: Only Authors can submit papers.");
    }
    try {
      const response = await api.post('/papers', {
        ...paperData,
        version: 1,
        status: PaperStatus.SUBMITTED
      });
      return response.data;
    } catch (error) {
      console.error('Failed to submit paper:', error);
      throw error;
    }
  }

  async getPapersByConference(confId: number | string): Promise<Paper[]> {
    try {
      const response = await api.get(`/papers/conference/${confId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch papers:', error);
      return [];
    }
  }

  async updatePaper(paperId: number | string, updates: Partial<Paper>): Promise<Paper | undefined> {
    try {
      const response = await api.put(`/papers/${paperId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update paper:', error);
      throw error;
    }
  }

  // ==================== REVIEW MANAGEMENT ====================

  async getReviewsByPaper(paperId: number | string): Promise<Review[]> {
    try {
      const response = await api.get(`/reviews/paper/${paperId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return [];
    }
  }

  async createReview(reviewData: Omit<Review, 'id'>, caller: User): Promise<Review> {
    if (caller.role !== UserRole.REVIEWER) {
      throw new Error("Unauthorized: Only Reviewers can create reviews.");
    }
    try {
      const response = await api.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  }

  async updateReview(reviewId: number | string, updates: Partial<Review>): Promise<Review | undefined> {
    try {
      const response = await api.put(`/reviews/${reviewId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update review:', error);
      throw error;
    }
  }
}

export const db = new DB();
