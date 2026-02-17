
export enum SchoolStatus {
  PROSPECT = 'Prospect',
  CLIENT = 'Client',
  PARTNER = 'Partner'
}

export enum AppMode {
  INTERNAL = 'Internal',
  PUBLIC = 'Public/Client'
}

export interface InternalSchoolData {
  id: string;
  name: string;
  strategicNotes: string;
  status: SchoolStatus;
  successMakerStatus: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  enrollmentGoals?: string;
  marketingProgress?: string;
  campaignStatus?: string;
  successTracker?: string;
  lastActionDate?: string;
  contactName?: string;
  campusImage?: string;
}

export interface GoogleMapsEnrichment {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  website?: string;
  rating?: number;
  phone?: string;
}

export interface AIIntelligenceReport {
  summary: string;
  marketPosition: string;
  recentNews: string[];
  strategicAdvice: string;
  partnershipProposal?: string;
  storyBrandProposal?: string;
  sources: { title: string; uri: string }[];
}

export type School = InternalSchoolData & {
  enriched?: GoogleMapsEnrichment;
  aiReport?: AIIntelligenceReport;
  isExternal?: boolean; // Flag for schools found via global search
};

export interface MapPosition {
  lat: number;
  lng: number;
  zoom: number;
}
