
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
  id: number | string;
  name: string;
  surname: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
  password_hash?: string;
  isConfirmed: boolean;
}

export interface Organization {
  id: number | string;
  name: string;
  logoUrl?: string;
  ownerId: number | string;
  memberIds: (number | string)[];
}

export interface OrgInvitation {
  id: number | string;
  orgId: number | string;
  invitedUserId: number | string;
  status: InvitationStatus;
  invitedByUserId: number | string;
}

export interface Conference {
  id: number | string;
  title: string;
  description: string;
  organizer_id: number | string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  organization_id?: number | string;
  attendeeIds?: (number | string)[];
  type: ConferenceType;
  meeting_link?: string;
}

export interface Paper {
  id: number | string;
  title: string;
  abstract: string;
  file_url: string;
  version: number;
  status: PaperStatus;
  author_id: number | string;
  conference_id: number | string;
  reviewer_ids?: (number | string)[];
}

export interface Review {
  id: number | string;
  paper_id: number | string;
  reviewer_id: number | string;
  rating?: number;
  comment?: string;
  recommendation?: 'ACCEPT' | 'REJECT' | 'MODIFY';
}
