import { Priority } from "./fax";
import { CompletenessItemStatus, Communication } from "./communication";

export type ReferralStatus =
  | "triage"              // Needs labeling/categorization
  | "incomplete"          // Missing required items
  | "pending-review"      // Ready for human review
  | "routed-to-cerebrum"; // Sent to Cerebrum

// Timeline event for tracking all activity on a referral
export type TimelineEventType =
  | "referral-received"
  | "ai-classified"
  | "status-changed"
  | "communication-sent"
  | "communication-received"
  | "document-added"
  | "item-marked-found"
  | "item-marked-missing"
  | "assigned"
  | "note-added";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  description?: string;
  actor: "ai" | "human";
  actorName?: string;
  metadata?: Record<string, string | number | boolean>;
}

// Grouped fax document attached to a referral
export interface ReferralDocument {
  id: string;
  faxId: string;
  type: "original-referral" | "response" | "additional";
  label: string;           // e.g., "Original Referral", "ECG from Dr. Wong"
  receivedAt: string;
  pageCount: number;
  pages: ReferralDocumentPage[];
  communicationId?: string; // Link to the communication that requested this
  pdfUrl?: string;         // Path to PDF in /public/faxes/
}

export interface ReferralDocumentPage {
  id: string;
  pageNumber: number;
  thumbnailUrl?: string;   // Mock placeholder
  detectedContent?: string; // AI description of what's on the page
}

export interface CompletenessItem {
  id: string;
  label: string;
  required: boolean;
  status: CompletenessItemStatus;
  confidence: number;        // AI confidence (0-100)
  pageNumber?: number;       // Where it was found (within the document)
  documentId?: string;       // Which document contains it
  requestedAt?: string;      // When we requested it
  receivedAt?: string;       // When we got it
}

export interface Referral {
  id: string;
  faxId: string;
  patientId?: string;          // undefined when patient not found in EMR
  patientName: string;
  patientDob?: string;
  patientPhone?: string;
  patientOhip?: string;
  referringPhysicianId: string;
  referringPhysicianName: string;
  referringPhysicianPhone?: string;
  referringPhysicianFax?: string;
  referringPhysicianEmail?: string;
  // Clinic info (for grouping communications)
  clinicName?: string;
  clinicCity?: string;
  receivedDate: string;
  status: ReferralStatus;
  priority: Priority;
  isUrgent: boolean;
  reasonForReferral: string;
  clinicalHistory: string;
  conditions: string[];
  medications: string[];

  // Completeness
  completenessItems: CompletenessItem[];
  completenessScore: number;
  aiConfidence: number;          // Overall AI confidence in assessment

  // Grouped Documents (all faxes related to this referral)
  documents: ReferralDocument[];

  // Routing
  assignedCardiologist?: string;
  assignedCardiologistName?: string;
  routedAt?: string;

  // Outcome
  appointmentDate?: string;
  declineReason?: string;

  // Communications
  communications: Communication[];
  pendingCommunicationsCount: number;

  // Timeline (all events)
  timeline: TimelineEvent[];

  // Tracking
  notes: string[];
  waitListType?: string;
  waitListPosition?: number;
  locationId?: string;
  createdAt: string;
  updatedAt: string;
}
