
export enum UserRole {
  ORGANIZER = 'ORGANIZER',
  AUTHOR = 'AUTHOR',
  REVIEWER = 'REVIEWER'
}

export enum PaperStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED'
}

export type ConferenceType = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
  password_hash?: string;
  isConfirmed: boolean;
}

export interface Organization {
  id: number;
  name: string;
  logoUrl?: string;
  ownerId: number;
  memberIds: number[];
}

export interface OrgInvitation {
  id: number;
  orgId: number;
  invitedUserId: number;
  status: InvitationStatus;
  invitedByUserId: number;
}

export interface Conference {
  id: number;
  title: string;
  description: string;
  organizer_id: number;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  organization_id?: number;
  attendeeIds?: number[];
  type: ConferenceType;
  meeting_link?: string;
}

export interface Paper {
  id: number;
  title: string;
  abstract: string;
  file_url: string;
  version: number;
  status: PaperStatus;
  author_id: number;
  conference_id: number;
}

export interface Review {
  id: number;
  paper_id: number;
  reviewer_id: number;
  rating?: number;
  comment?: string;
  recommendation?: 'ACCEPT' | 'REJECT' | 'MODIFY';
}
