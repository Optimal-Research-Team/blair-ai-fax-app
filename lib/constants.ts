export const APP_NAME = "Blair MRI";
export const APP_VERSION = "1.0.0-beta";

// ─── Priority (Brutalist) ────────────────────────────────────
export const PRIORITY_COLORS = {
  abnormal: {
    bg: "bg-white",
    text: "text-red-700",
    border: "border-red-600",
    dot: "bg-red-600",
  },
  normal: {
    bg: "bg-white",
    text: "text-emerald-700",
    border: "border-emerald-300",
    dot: "bg-emerald-500",
  },
} as const;

// ─── Classification Stage (DB enum values) ──────────────────
export const STAGE_LABELS = {
  unfiled: "Unfiled",
  filing_in_progress: "Filing",
  auto_filed: "Auto-Filed",
  manually_filed: "Filed",
} as const;

// ─── Classification Status (DB enum values) ─────────────────
export const CLASSIFICATION_STATUS_LABELS = {
  auto_classified: "Auto Classified",
  manually_classified: "Manually Classified",
  needs_review: "Needs Review",
  failed: "Failed",
} as const;

// ─── Fax Status ──────────────────────────────────────────────
export const STATUS_COLORS = {
  classified: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "auto-filed": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "manually-classified": { bg: "bg-white", text: "text-sky-700", border: "border-sky-600" },
  "pending-review": { bg: "bg-white", text: "text-amber-700", border: "border-amber-600" },
  "in-progress": { bg: "bg-white", text: "text-violet-700", border: "border-violet-600" },
  completed: { bg: "bg-white", text: "text-gray-500", border: "border-gray-300" },
  failed: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
} as const;

export const STATUS_LABELS = {
  classified: "Classified",
  "auto-filed": "Auto",
  "manually-classified": "Manually Classified",
  "pending-review": "Needs Review",
  "in-progress": "In Progress",
  completed: "Completed",
  failed: "Failed",
} as const;

// ─── Patient Match ───────────────────────────────────────────
export const MATCH_STATUS_LABELS = {
  matched: "Match Found",
  "not-found": "No Match",
  "multiple-matches": "Multiple Matches",
  pending: "Pending",
} as const;

export const MATCH_STATUS_COLORS = {
  matched: { bg: "bg-white", text: "text-emerald-700" },
  "not-found": { bg: "bg-white", text: "text-red-700" },
  "multiple-matches": { bg: "bg-white", text: "text-amber-700" },
  pending: { bg: "bg-white", text: "text-gray-400" },
} as const;

// ─── SLA Status ──────────────────────────────────────────────
export const SLA_STATUS_COLORS = {
  green: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  yellow: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  breached: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
} as const;

// ─── Confidence Thresholds (from env) ────────────────────────
export const CONFIDENCE_THRESHOLD_HIGH = Number(process.env.NEXT_PUBLIC_CONFIDENCE_THRESHOLD_HIGH) || 90;
export const CONFIDENCE_THRESHOLD_MEDIUM = Number(process.env.NEXT_PUBLIC_CONFIDENCE_THRESHOLD_MEDIUM) || 70;
export const CONFIDENCE_THRESHOLD_LOW = Number(process.env.NEXT_PUBLIC_CONFIDENCE_THRESHOLD_LOW) || 50;

export const CONFIDENCE_COLORS = {
  high: "bg-emerald-500",
  good: "bg-sky-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
} as const;

export function getConfidenceColor(value: number): string {
  if (value >= CONFIDENCE_THRESHOLD_HIGH) return CONFIDENCE_COLORS.high;
  if (value >= CONFIDENCE_THRESHOLD_MEDIUM) return CONFIDENCE_COLORS.good;
  if (value >= CONFIDENCE_THRESHOLD_LOW) return CONFIDENCE_COLORS.medium;
  return CONFIDENCE_COLORS.low;
}

export function getConfidenceTextColor(value: number): string {
  if (value >= CONFIDENCE_THRESHOLD_HIGH) return "text-emerald-600";
  if (value >= CONFIDENCE_THRESHOLD_MEDIUM) return "text-sky-600";
  if (value >= CONFIDENCE_THRESHOLD_LOW) return "text-amber-600";
  return "text-red-600";
}

// ─── Lock Status ─────────────────────────────────────────────
export const LOCK_COLORS = {
  self: "text-emerald-600",
  other: "text-amber-600",
  avatar: { bg: "bg-amber-100", text: "text-amber-700" },
} as const;

// ─── Communication Channels ─────────────────────────────────
export const CHANNEL_COLORS = {
  fax: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-600" },
  voice: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600" },
  email: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-600" },
} as const;

// ─── Communication Status ────────────────────────────────────
export const COMM_STATUS_COLORS = {
  scheduled: "text-muted-foreground",
  sent: "text-sky-500",
  awaiting: "text-amber-500",
  received: "text-emerald-500",
  escalated: "text-orange-500",
  failed: "text-red-500",
  closed: "text-muted-foreground",
} as const;

// ─── Completeness ────────────────────────────────────────────
export const COMPLETENESS_COLORS = {
  found: { bg: "bg-emerald-50/50", icon: "text-emerald-500", text: "text-emerald-600" },
  missing: { bg: "bg-red-50/50", border: "border-red-200", icon: "text-red-500", text: "text-red-600", badge: "border-red-300 text-red-700" },
  uncertain: { bg: "bg-amber-50/50", border: "border-amber-200", icon: "text-amber-500", text: "text-amber-600", badge: "border-amber-300" },
} as const;

// ─── AI Feature Callouts ─────────────────────────────────────
export const AI_COLORS = {
  info: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-600", heading: "text-sky-800", body: "text-sky-700" },
  agent: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", heading: "text-purple-900", body: "text-purple-700" },
} as const;

// ─── Alert / Warning Callouts ────────────────────────────────
export const CALLOUT_COLORS = {
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", heading: "text-amber-800", body: "text-amber-700" },
  error: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", heading: "text-red-800", body: "text-red-700" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", heading: "text-emerald-700", body: "text-emerald-700" },
  info: { bg: "bg-sky-50", border: "border-sky-200", icon: "text-sky-600", heading: "text-sky-800", body: "text-sky-700" },
} as const;

// ─── Availability ────────────────────────────────────────────
export const AVAILABILITY_COLORS = {
  available: "bg-emerald-50 text-emerald-700",
  busy: "bg-amber-50 text-amber-700",
  unavailable: "bg-red-50 text-red-700",
} as const;

// ─── Stat Cards ──────────────────────────────────────────────
export const STAT_CARD_COLORS = {
  sky: { iconColor: "text-sky-600", bg: "bg-sky-50" },
  emerald: { iconColor: "text-emerald-600", bg: "bg-emerald-50" },
  amber: { iconColor: "text-amber-600", bg: "bg-amber-50" },
  red: { iconColor: "text-red-600", bg: "bg-red-50" },
  slate: { iconColor: "text-slate-500", bg: "bg-slate-50" },
  neutral: { iconColor: "text-muted-foreground", bg: "bg-muted" },
} as const;

// ─── Unsorted Reasons ───────────────────────────────────────
export const UNSORTED_REASON_LABELS = {
  urgent: "Urgent",
  "multiple-patients": "Multiple Patients",
  "low-confidence": "Low Confidence",
  "medium-confidence": "Medium Confidence",
  "incomplete-referral": "Incomplete Referral",
  "possible-new-patient": "Possible New Patient",
  duplicate: "Duplicate",
} as const;

export const UNSORTED_REASON_COLORS = {
  urgent: { bg: "bg-white", text: "text-red-700", border: "border-red-400" },
  "multiple-patients": { bg: "bg-white", text: "text-amber-700", border: "border-amber-400" },
  "low-confidence": { bg: "bg-white", text: "text-red-600", border: "border-red-300" },
  "medium-confidence": { bg: "bg-white", text: "text-amber-600", border: "border-amber-300" },
  "incomplete-referral": { bg: "bg-white", text: "text-violet-700", border: "border-violet-400" },
  "possible-new-patient": { bg: "bg-white", text: "text-sky-700", border: "border-sky-400" },
  duplicate: { bg: "bg-white", text: "text-slate-700", border: "border-slate-400" },
} as const;

// ─── Document Simulation (fax viewer placeholders) ───────────
export const DOC_SIM_COLORS = {
  pageBg: "bg-muted",
  heading: "bg-muted-foreground/20",
  subheading: "bg-muted-foreground/15",
  bodyLine: "bg-muted-foreground/8",
  label: "text-muted-foreground",
} as const;
