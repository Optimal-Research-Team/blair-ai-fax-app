import { ClassificationStage, ClassificationStatus, Fax, FaxProvider, FaxStatus, Priority } from '@/types'
import { WorklistItem, SlaStatus } from '@/types/worklist'
import { addMinutes } from 'date-fns'

// SLA minutes per priority tier
const SLA_MINUTES: Record<Priority, number> = {
  abnormal: 120,
  normal: 480,
}

/** Shape returned by the Supabase join query */
export interface ClassificationRow {
  id: string
  job_id: string
  document_category: string | null
  priority: string | null
  classification_confidence_score: number | null
  document_description: string | null
  is_referral: boolean | null
  notes: string | null
  page_count: number | null
  metadata: Record<string, unknown> | null
  model_version: string
  classification_status: string
  classification_stage: ClassificationStage
  classified_at: string | null
  patient_id: string | null
  document_source_id: string | null
  priority_confidence_score: number | null
  created_at: string
  updated_at: string
  patient_confidence_score: number | null
  manually_edited_fields: string[]
  document_date: string | null
  document_date_confidence_score: number | null
  filing_error: string | null
  patient: {
    id: string
    name: string
    date_of_birth: string | null
    health_card_number: string | null
    health_card_version: string | null
  } | null
  document_source: {
    id: string
    name: string
    title: string | null
    clinic_name: string | null
    fax_number: string | null
  } | null
  classification_providers: Array<{
    provider_id: string
    source: string
    confidence_score: number | null
    provider: { id: string; name: string; title: string | null }
  }>
  job: {
    id: string
    submission_id: string
    metadata: Record<string, unknown> | null
    submission: {
      created_at: string
      file_url: string | null
    } | null
  } | null
}

/**
 * Format health card: version "AB" + number "1234567890" → "AB-123-456-7890"
 */
export function formatHealthCard(
  version: string | null | undefined,
  number: string | null | undefined
): string | null {
  if (!number) return null
  const digits = number.replace(/\D/g, '')
  if (digits.length < 10) return version ? `${version}-${digits}` : digits
  const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  return version ? `${version}-${formatted}` : formatted
}

/**
 * Format "WORTHINGTON, WILLIAM" or "WILLIAM WORTHINGTON" → "William Worthington"
 */
export function formatPatientName(name: string | null | undefined): string {
  if (!name) return 'Unknown Patient'
  // Handle "LAST, FIRST" format
  if (name.includes(',')) {
    const [last, first] = name.split(',').map((s) => s.trim())
    return `${toTitleCase(first)} ${toTitleCase(last)}`
  }
  return toTitleCase(name)
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')
}

/**
 * Map DB classification_status to the UI FaxStatus type.
 */
function mapClassificationStatusToFaxStatus(classificationStatus: string): FaxStatus {
  switch (classificationStatus) {
    case ClassificationStatus.AutoClassified:
      return 'classified'
    case ClassificationStatus.ManuallyClassified:
      return 'manually-classified'
    case ClassificationStatus.Failed:
      return 'failed'
    case ClassificationStatus.NeedsReview:
    default:
      return 'pending-review'
  }
}

/**
 * Map DB priority to the UI Priority type.
 * DB values: "normal", "abnormal" (new) or legacy "stat", "urgent", "routine".
 */
function mapPriority(dbPriority: string | null): Priority {
  if (!dbPriority) return 'normal'
  if (dbPriority === 'abnormal') return 'abnormal'
  // Legacy values: treat old urgent/stat as abnormal
  if (dbPriority === 'urgent' || dbPriority === 'stat') return 'abnormal'
  return 'normal'
}

/**
 * Map a joined fax_classifications row to the frontend Fax interface.
 */
export function mapClassificationToFax(row: ClassificationRow): Fax {
  const priority = mapPriority(row.priority)
  const receivedAt = row.job?.submission?.created_at ?? row.created_at
  const slaDeadline = addMinutes(new Date(receivedAt), SLA_MINUTES[priority]).toISOString()
  const hasPatient = !!row.patient_id && !!row.patient

  const providers: FaxProvider[] = (row.classification_providers ?? []).map((cp) => ({
    providerId: cp.provider_id,
    providerName: cp.provider.name,
    providerTitle: cp.provider.title ?? undefined,
    source: cp.source as 'ai' | 'manual',
    confidenceScore: cp.confidence_score ?? undefined,
  }))

  return {
    id: row.id,
    classificationId: row.id,
    receivedAt,
    pageCount: row.page_count ?? 0,
    pages: [],
    priority,
    senderName: row.document_source?.name ?? 'Unknown',
    senderFaxNumber: row.document_source?.fax_number ?? '',
    documentSourceName: row.document_source?.name ?? undefined,
    documentSourceId: row.document_source_id ?? undefined,
    faxLineId: 'line-1',
    documentCategory: row.document_category ?? '',
    documentDescription: row.document_description ?? undefined,
    classificationConfidenceScore: row.classification_confidence_score ?? 0,
    priorityConfidenceScore: row.priority_confidence_score ?? undefined,
    notes: row.notes ?? undefined,
    patientId: row.patient_id ?? undefined,
    providers,
    patientName: hasPatient ? formatPatientName(row.patient!.name) : undefined,
    patientMatchStatus: hasPatient ? 'matched' : 'not-found',
    patientConfidenceScore: row.patient_confidence_score ?? undefined,
    manuallyEditedFields: row.manually_edited_fields ?? [],
    status: mapClassificationStatusToFaxStatus(row.classification_status),
    classificationStage: row.classification_stage,
    classificationStatus: row.classification_status as ClassificationStatus,
    slaDeadline,
    isReferral: row.is_referral ?? false,
    classifiedAt: row.classified_at ?? undefined,
    processingStartedAt:
      (row.job?.metadata?.processing_started_at as string | undefined) ??
      undefined,
    description: row.document_description ?? undefined,
    metadata: row.metadata ?? undefined,
    submissionId: row.job?.submission_id ?? undefined,
    jobId: row.job?.id ?? undefined,
    filingError: row.filing_error ?? undefined,
    documentDate: row.document_date ?? undefined,
    documentDateConfidenceScore: row.document_date_confidence_score ?? undefined,
    processingState: row.classification_stage === 'filing_in_progress' ? 'filing' : undefined,
  }
}

// ---------------------------------------------------------------------------
// Failed processing jobs → WorklistItem
// ---------------------------------------------------------------------------

/** Shape returned by the failed-jobs Supabase query */
export interface FailedJobRow {
  id: string
  job_status: string
  error_code: string | null
  error_message: string | null
  attempt_count: number
  max_attempts: number
  created_at: string
  metadata: Record<string, unknown> | null
  submission: {
    id: string
    created_at: string
    file_url: string | null
    filename: string | null
  } | null
}

/** Shape returned by the lifecycle Supabase query */
export interface LifecycleRow {
  id: string
  job_id: string
  submission_id: string
  organization_id: string
  status: string
  created_at: string
}

/**
 * Map a lifecycle row (receiving/classifying) to a stub Fax for display
 * as a shimmer row in the inbox. ID prefixed with `lifecycle-` to avoid
 * collisions with real classification IDs.
 */
export function mapLifecycleToFax(row: LifecycleRow): Fax {
  return {
    id: `lifecycle-${row.job_id}`,
    jobId: row.job_id,
    receivedAt: row.created_at,
    pageCount: 0,
    pages: [],
    priority: 'normal',
    senderName: '',
    senderFaxNumber: '',
    faxLineId: '',
    documentCategory: '',
    classificationConfidenceScore: 0,
    manuallyEditedFields: [],
    providers: [],
    status: 'pending-review',
    classificationStage: ClassificationStage.Unfiled,
    classificationStatus: ClassificationStatus.NeedsReview,
    slaDeadline: '',
    patientMatchStatus: 'pending',
    processingState: row.status === 'receiving' ? 'receiving' : 'classifying',
  }
}

/**
 * Map a failed fax_processing_jobs row to a WorklistItem for the
 * "unclassified" needs-review queue.
 */
export function mapFailedJobToWorklistItem(row: FailedJobRow): WorklistItem {
  const receivedAt = row.submission?.created_at ?? row.created_at
  const slaDeadline = addMinutes(new Date(receivedAt), SLA_MINUTES.normal).toISOString()

  // Determine SLA status based on current time
  const now = Date.now()
  const deadlineMs = new Date(slaDeadline).getTime()
  const remaining = deadlineMs - now
  const slaStatus: SlaStatus =
    remaining <= 0 ? 'breached' : remaining < 30 * 60_000 ? 'red' : remaining < 60 * 60_000 ? 'yellow' : 'green'

  const filename = row.submission?.filename ?? (row.metadata?.filename as string | undefined) ?? undefined
  const description = row.error_code
    ? `Processing failed: ${row.error_code}`
    : 'Processing failed'

  return {
    id: `wl-failed-${row.id}`,
    faxId: row.id,
    category: 'unclassified',
    isUrgent: false,
    queuePosition: 0,
    priorityScore: 30,
    priority: 'normal',
    slaDeadline,
    slaStatus,
    claimable: true,
    pageCount: 0,
    receivedAt,
    description,
    clinicName: filename ?? undefined,
  }
}
