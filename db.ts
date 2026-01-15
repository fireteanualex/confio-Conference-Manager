
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
      return allConferences.filter(c => String(c.organization_id) === String(orgId));
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

  async assignReviewerToPaper(paperId: number | string, reviewerId: number | string, caller: User): Promise<Paper | undefined> {
    if (caller.role !== UserRole.ORGANIZER) {
      throw new Error("Unauthorized: Only Organizers can assign reviewers.");
    }
    try {
      // Get current paper and conference
      const papers = await api.get('/papers');
      const paper = papers.data.find((p: Paper) => String(p.id) === String(paperId));
      if (!paper) {
        throw new Error("Paper not found");
      }

      const conferences = await this.getConferences();
      const conference = conferences.find((c: Conference) => String(c.id) === String(paper.conference_id));
      if (!conference || !conference.organization_id) {
        throw new Error("Conference or organization not found");
      }

      // Verify reviewer is in the same organization
      const reviewer = await this.getUserById(reviewerId);
      if (!reviewer || reviewer.role !== UserRole.REVIEWER) {
        throw new Error("Reviewer not found or invalid role");
      }

      const org = await this.getOrganizationById(conference.organization_id);
      // Compare as strings to handle both numeric and ObjectId formats
      const isMember = org && org.memberIds.some(memberId => String(memberId) === String(reviewerId));
      if (!org || !isMember) {
        throw new Error("Reviewer is not a member of the conference organization");
      }

      // Add reviewer to the paper's reviewer list
      const currentReviewers = paper.reviewer_ids || [];
      if (currentReviewers.some((id: number) => String(id) === String(reviewerId))) {
        throw new Error("Reviewer already assigned to this paper");
      }

      const updatedReviewers = [...currentReviewers, reviewerId];
      return await this.updatePaper(paperId, {
        reviewer_ids: updatedReviewers,
        status: PaperStatus.UNDER_REVIEW
      });
    } catch (error: any) {
      console.error('Failed to assign reviewer:', error);
      throw new Error(error.message || 'Failed to assign reviewer');
    }
  }

  async removeReviewerFromPaper(paperId: number | string, reviewerId: number | string, caller: User): Promise<Paper | undefined> {
    if (caller.role !== UserRole.ORGANIZER) {
      throw new Error("Unauthorized: Only Organizers can remove reviewers.");
    }
    try {
      const papers = await api.get('/papers');
      const paper = papers.data.find((p: Paper) => String(p.id) === String(paperId));
      if (!paper) {
        throw new Error("Paper not found");
      }

      const updatedReviewers = (paper.reviewer_ids || []).filter(
        (id: number) => String(id) !== String(reviewerId)
      );

      return await this.updatePaper(paperId, { reviewer_ids: updatedReviewers });
    } catch (error: any) {
      console.error('Failed to remove reviewer:', error);
      throw new Error(error.message || 'Failed to remove reviewer');
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

  async updateReview(reviewId: number | string, updates: Partial<Review>, caller?: User): Promise<Review | undefined> {
    try {
      // If caller is provided, verify they are a reviewer and own this review
      if (caller) {
        if (caller.role !== UserRole.REVIEWER) {
          throw new Error("Unauthorized: Only Reviewers can update reviews.");
        }
        // Fetch the review to verify ownership
        const reviews = await api.get('/reviews');
        const review = reviews.data.find((r: Review) => String(r.id) === String(reviewId));
        if (review && String(review.reviewer_id) !== String(caller.id)) {
          throw new Error("Unauthorized: You can only edit your own reviews.");
        }
      }
      const response = await api.put(`/reviews/${reviewId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update review:', error);
      throw new Error(error.message || 'Failed to update review');
    }
  }

  async getPapersAssignedToReviewer(reviewerId: number | string): Promise<Paper[]> {
    try {
      const papers = await api.get('/papers');
      return papers.data.filter((p: Paper) =>
        p.reviewer_ids && p.reviewer_ids.some(id => String(id) === String(reviewerId))
      );
    } catch (error) {
      console.error('Failed to fetch assigned papers:', error);
      return [];
    }
  }
}

export const db = new DB();
