export type FaxStatus = "auto-filed" | "pending-review" | "in-progress" | "completed" | "classified" | "manually-classified" | "failed";
export type Priority = "normal" | "abnormal";
export type PatientMatchStatus = "matched" | "not-found" | "multiple-matches" | "pending";

export type UnsortedReason =
  | "urgent"
  | "multiple-patients"
  | "low-confidence"
  | "medium-confidence"
  | "incomplete-referral"
  | "possible-new-patient"
  | "duplicate";

export interface FaxProvider {
  providerId: string
  providerName: string
  providerTitle?: string
  source: 'ai' | 'manual'
  confidenceScore?: number
}

export interface FaxPage {
  id: string;
  pageNumber: number;
  detectedDocType?: string;
  detectedPatient?: string;
  contentDescription?: string;
}

/** Filing stage: has the fax been filed? */
export enum ClassificationStage {
  Unfiled = "unfiled",
  FilingInProgress = "filing_in_progress",
  AutoFiled = "auto_filed",
  ManuallyFiled = "manually_filed",
}

/** Sorting status: how was the fax classified? */
export enum ClassificationStatus {
  AutoClassified = "auto_classified",
  ManuallyClassified = "manually_classified",
  NeedsReview = "needs_review",
  Failed = "failed",
}

/** Stages of AI processing when a fax first arrives */
export type FaxProcessingState = "receiving" | "classifying" | "matching" | "filing";

export interface Fax {
  id: string;
  /** The fax_classifications row ID (used for server-side save operations) */
  classificationId?: string;
  receivedAt: string;
  pageCount: number;
  pages: FaxPage[];
  priority: Priority;
  senderName: string;
  senderFaxNumber: string;
  documentSourceName?: string;
  faxLineId: string;
  documentCategory: string;
  documentDescription?: string;
  classificationConfidenceScore: number;
  priorityConfidenceScore?: number;
  notes?: string;
  patientId?: string;
  documentSourceId?: string;
  /** Providers for this classification (from junction table) */
  providers: FaxProvider[];
  patientName?: string;
  patientMatchStatus: PatientMatchStatus;
  patientConfidenceScore?: number;
  manuallyEditedFields: string[];
  status: FaxStatus;
  classificationStage: ClassificationStage;
  classificationStatus: ClassificationStatus;
  slaDeadline: string;
  assignedTo?: string;
  lockedBy?: string;
  lockedAt?: string;
  description?: string;
  completedAt?: string;
  /** When the AI classification was created */
  classifiedAt?: string;
  /** When the current classification attempt started */
  processingStartedAt?: string;
  isReferral?: boolean;
  referralId?: string;
  sortedBy?: string;
  forwardedTo?: string;
  unsortedReasons?: UnsortedReason[];
  /** Present only while AI is still processing — absent means fully processed */
  processingState?: FaxProcessingState;
  /** Path to the PDF file in /faxes/ */
  pdfUrl?: string;
  /** Selected provider inbox for Cerebrum routing */
  providerInbox?: string;
  /** Raw AI classification metadata JSON */
  metadata?: Record<string, unknown> | null;
  /** The linked submission ID (from processing job) */
  submissionId?: string;
  /** The linked processing job ID */
  jobId?: string;
  /** RPA filing error message — non-null means filing failed */
  filingError?: string;
  /** Document date extracted by AI (YYYY-MM-DD) */
  documentDate?: string;
  /** Confidence score for document date extraction (0-100) */
  documentDateConfidenceScore?: number;
}
