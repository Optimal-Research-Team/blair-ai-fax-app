export type CommunicationType =
  | "referral-received"
  | "missing-items"
  | "decline"
  | "appointment-confirmation"
  | "follow-up-reminder"
  | "custom";

export type CommunicationChannel = "fax" | "voice" | "email";

export type CommunicationStatus =
  | "scheduled"      // Will send at specified time
  | "sent"           // Fax transmitted / call placed
  | "awaiting"       // Waiting on external party
  | "received"       // Got what we needed
  | "escalated"      // Auto-escalated (fax → voice)
  | "failed"         // Delivery failed, needs retry
  | "closed";        // Manually closed, found elsewhere

export type CommunicationInitiator = "ai" | "human";

export type EscalationStrategy =
  | "none"                    // Single attempt only
  | "fax-then-voice"          // Fax now, call if no response
  | "voice-then-fax"          // Call first, fax if unreachable
  | "multi-fax";              // Multiple fax attempts

export interface VoiceCallDetails {
  callId: string;
  duration?: number;           // seconds
  outcome?: "confirmed" | "voicemail" | "no-answer" | "busy" | "failed";
  recordingUrl?: string;
  transcriptUrl?: string;
  transcript?: string;
  callScript: string;
}

export interface Communication {
  id: string;
  referralId?: string;
  faxId?: string;
  type: CommunicationType;
  channel: CommunicationChannel;
  status: CommunicationStatus;
  initiator: CommunicationInitiator;

  // Recipient
  recipientName: string;
  recipientFax?: string;
  recipientPhone?: string;
  recipientEmail?: string;

  // Content
  subject: string;
  body: string;
  missingItems?: string[];     // What we're requesting

  // Timing
  scheduledAt?: string;
  sentAt?: string;
  responseReceivedAt?: string;

  // Escalation
  escalationStrategy: EscalationStrategy;
  escalationDelayDays?: number;
  escalatedAt?: string;
  parentCommunicationId?: string;  // Links escalation to original

  // Voice call specific
  voiceCallDetails?: VoiceCallDetails;

  // Tracking
  remindersSent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: CommunicationType;
  channel: CommunicationChannel;
  subject: string;
  body: string;
  voiceScript?: string;        // For voice agent calls
  triggerEvent?: string;
  isActive: boolean;
  variables: string[];
}

// For the completeness checker
export type CompletenessItemStatus = "found" | "missing" | "uncertain";

export interface MissingItemSuggestion {
  itemId: string;
  itemLabel: string;
  confidence: number;          // AI confidence it's missing
  recommended: boolean;        // Pre-checked for request
  commonlyRequired: boolean;   // Is this typically required
}
