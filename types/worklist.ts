import { Priority } from "./fax";

export type SlaStatus = "green" | "yellow" | "red" | "breached";

// Item categories (what the item actually is)
export type WorklistItemCategory = "unclassified" | "referral" | "junk" | "filing-error";

// View filters (includes "all" for unified view)
export type WorklistView = "all" | "unclassified" | "referral" | "junk" | "filing-error";

export interface WorklistItem {
  id: string;
  faxId: string;
  category: WorklistItemCategory;
  isUrgent: boolean; // Urgency is now a flag, not a category
  queuePosition: number;
  priorityScore: number;
  priority: Priority;
  slaDeadline: string;
  slaStatus: SlaStatus;
  assignedTo?: string;
  lockedBy?: string;
  lockedAt?: string;
  claimable: boolean;
  // For triage items
  suggestedDocCategory?: string;
  suggestedConfidenceScore?: number;
  // For referral items
  referralId?: string;
  completenessScore?: number;
  pendingCommunications?: number;
  // Claimed/assigned
  claimedBy?: string;
  // Display info
  patientName?: string;
  documentSourceName?: string;
  clinicName?: string;
  documentCategory?: string;
  pageCount: number;
  receivedAt: string;
  description: string;
  /** Pre-signed PDF URL (e.g. for failed jobs that have a submission file) */
  pdfUrl?: string;
}

export interface QueueStats {
  totalItems: number;
  unclassifiedCount: number;
  referralCount: number;
  junkCount: number;
  filingErrorCount: number;
  urgentCount: number; // Count of items with isUrgent=true
  averageWaitMinutes: number;
  slaBreachCount: number;
  itemsProcessedToday: number;
  itemsProcessedThisHour: number;
}
