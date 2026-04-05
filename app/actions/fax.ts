'use server'

import { ClassificationRow, FailedJobRow, mapClassificationToFax, mapFailedJobToWorklistItem } from '@/lib/supabase/mappers'
import type { LifecycleRow } from '@/lib/supabase/mappers'
import { Fax } from '@/types'
import { WorklistItem } from '@/types/worklist'
import { ActionResult } from '@/lib/action-result'
import { createClient } from '@/utils/supabase/server'

const IS_DEV_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * Convert an s3:// URI to a local proxy URL that avoids CORS issues.
 * The /api/pdf route streams the object from S3 server-side.
 */
function s3UriToProxyUrl(s3Uri: string | null | undefined): string | undefined {
  if (!s3Uri || !s3Uri.startsWith('s3://')) return undefined
  const withoutProtocol = s3Uri.slice(5)
  const slashIndex = withoutProtocol.indexOf('/')
  if (slashIndex === -1) return undefined
  const bucket = withoutProtocol.slice(0, slashIndex)
  const key = withoutProtocol.slice(slashIndex + 1)
  return `/api/pdf?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`
}


const CLASSIFICATION_SELECT = `
  *,
  patient:fax_patients(*),
  document_source:fax_document_sources(*),
  classification_providers:fax_classification_providers(
    provider_id, source, confidence_score,
    provider:fax_providers!fax_classification_providers_provider_id_fkey(id, name, title)
  ),
  job:fax_processing_jobs(
    id,
    submission_id,
    metadata,
    submission:fax_submissions(created_at, file_url)
  )
`

export async function fetchClassifications(): Promise<ActionResult<Fax[]>> {
  if (IS_DEV_MODE) {
    const { MOCK_FAXES } = await import('@/data/mock-fax-data')
    return { success: true, data: MOCK_FAXES }
  }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('fax_classifications')
    .select(CLASSIFICATION_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch classifications:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  const faxes = (data as unknown as ClassificationRow[]).map(mapClassificationToFax)

  // Resolve S3 URIs to local proxy URLs (avoids CORS)
  for (let i = 0; i < faxes.length; i++) {
    const raw = (data as unknown as ClassificationRow[])[i]
    const fileUrl = raw.job?.submission?.file_url
    if (fileUrl) {
      faxes[i].pdfUrl = s3UriToProxyUrl(fileUrl)
    }
  }

  return { success: true, data: faxes }
}

const FAILED_JOB_SELECT = `
  id,
  job_status,
  error_code,
  error_message,
  attempt_count,
  max_attempts,
  created_at,
  metadata,
  submission:fax_submissions(id, created_at, file_url, filename)
`

export async function fetchFailedJobs(): Promise<ActionResult<WorklistItem[]>> {
  if (IS_DEV_MODE) return { success: true, data: [] }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('fax_processing_jobs')
    .select(FAILED_JOB_SELECT)
    .eq('job_status', 'failed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch failed jobs:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  const items = (data as unknown as FailedJobRow[]).map(mapFailedJobToWorklistItem)

  // Resolve S3 URIs to local proxy URLs (avoids CORS)
  for (let i = 0; i < items.length; i++) {
    const raw = (data as unknown as FailedJobRow[])[i]
    const fileUrl = raw.submission?.file_url
    if (fileUrl) {
      items[i].pdfUrl = s3UriToProxyUrl(fileUrl)
    }
  }

  return { success: true, data: items }
}

export async function saveClassification(
  classificationId: string,
  updates: { classification_stage?: string; classification_status?: string },
): Promise<ActionResult<null>> {
  if (IS_DEV_MODE) return { success: true, data: null }
  const supabase = await createClient()

  const { error, status } = await supabase
    .from('fax_classifications')
    .update(updates)
    .eq('id', classificationId)

  if (error) {
    console.error('Failed to save classification:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  return { success: true, data: null }
}

export async function saveClassificationReview(
  classificationId: string,
  updates: {
    priority?: string
    document_category?: string
    notes?: string
    patient_id?: string | null
    description?: string
    document_date?: string
  }
): Promise<ActionResult<{ changed_fields: string[] }>> {
  const url = process.env.ORCHESTRATOR_URL
  if (!url) {
    return { success: false, error: 'ORCHESTRATOR_URL not configured', isClientError: false }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch(`${url}/classifications/${classificationId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, actor_id: user?.id ?? 'unknown' }),
    })

    if (!res.ok) {
      const body = await res.json()
      return { success: false, error: body.error || `Server error ${res.status}`, isClientError: res.status >= 400 && res.status < 500 }
    }

    const data = await res.json()
    return { success: true, data: { changed_fields: data.changed_fields ?? [] } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save review'
    console.error('saveClassificationReview failed:', message)
    return { success: false, error: message, isClientError: false }
  }
}

export async function saveClassificationProviders(
  classificationId: string,
  providerIds: string[]
): Promise<ActionResult<null>> {
  const url = process.env.ORCHESTRATOR_URL
  if (!url) {
    return { success: false, error: 'ORCHESTRATOR_URL not configured', isClientError: false }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch(`${url}/classifications/${classificationId}/providers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classificationId, providerIds, actor_id: user?.id ?? 'unknown' }),
    })

    if (!res.ok) {
      const body = await res.json()
      return { success: false, error: body.error || `Server error ${res.status}`, isClientError: res.status >= 400 && res.status < 500 }
    }

    return { success: true, data: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save classification providers'
    console.error('saveClassificationProviders failed:', message)
    return { success: false, error: message, isClientError: false }
  }
}

export async function requestFiling(
  classificationId: string,
  submissionId: string,
  source: 'system' | 'human' = 'human'
): Promise<ActionResult<null>> {
  const url = process.env.ORCHESTRATOR_URL
  if (!url) {
    return { success: false, error: 'ORCHESTRATOR_URL not configured', isClientError: false }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch(`${url}/rpa/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, classificationId, actor_id: user?.id ?? 'system', source }),
    })

    if (!res.ok) {
      const body = await res.json()
      return { success: false, error: body.error || `Server error ${res.status}`, isClientError: res.status >= 400 && res.status < 500 }
    }

    return { success: true, data: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to request filing'
    console.error('requestFiling failed:', message)
    return { success: false, error: message, isClientError: false }
  }
}

/**
 * Auto-file a classification by ID. Looks up the submission via the job chain
 * and triggers the RPA filing endpoint. Used by the demo auto-file hook.
 */
export async function autoFileById(
  classificationId: string
): Promise<ActionResult<null>> {
  const url = process.env.ORCHESTRATOR_URL
  if (!url) {
    return { success: false, error: 'ORCHESTRATOR_URL not configured', isClientError: false }
  }

  try {
    const supabase = await createClient()

    // Look up submission_id through the job chain
    const { data: classification, error: classError } = await supabase
      .from('fax_classifications')
      .select('id, job_id, job:fax_processing_jobs(submission_id)')
      .eq('id', classificationId)
      .single()

    if (classError || !classification) {
      return { success: false, error: `Classification not found: ${classError?.message}`, isClientError: true }
    }

    const submissionId = (classification.job as any)?.submission_id
    if (!submissionId) {
      return { success: false, error: 'No submission linked to classification', isClientError: true }
    }

    return requestFiling(classificationId, submissionId, 'system')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auto-file failed'
    console.error('autoFileById failed:', message)
    return { success: false, error: message, isClientError: false }
  }
}

export type JobRerunResult = {
  accepted: boolean
  jobId: string
  attemptCount: number
  maxAttempts: number
  message: string
}

export async function rerunJob(
  jobId: string
): Promise<ActionResult<JobRerunResult>> {
  const url = process.env.ORCHESTRATOR_URL
  if (!url) {
    return { success: false, error: 'ORCHESTRATOR_URL not configured', isClientError: false }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch(`${url}/jobs/${jobId}/rerun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_id: user?.id ?? 'unknown' }),
    })

    if (!res.ok) {
      const body = await res.json()
      return {
        success: false,
        error: body.error || `Server error ${res.status}`,
        isClientError: res.status >= 400 && res.status < 500,
      }
    }

    const data = await res.json()
    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rerun job'
    console.error('rerunJob failed:', message)
    return { success: false, error: message, isClientError: false }
  }
}

export type OrganizationRow = {
  id: string
  name: string
}

export async function fetchOrganizations(): Promise<ActionResult<OrganizationRow[]>> {
  if (IS_DEV_MODE) return { success: true, data: [{ id: 'org-kmh', name: 'KMH Cardiology' }] }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('organizations')
    .select('id, name')
    .order('name')

  if (error) {
    console.error('Failed to fetch organizations:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  return { success: true, data: data ?? [] }
}

export type OrganizationWithCategories = {
  id: string
  name: string
  categories: string[]
}

export async function fetchOrganizationsWithCategories(): Promise<ActionResult<OrganizationWithCategories[]>> {
  if (IS_DEV_MODE) {
    return {
      success: true,
      data: [{
        id: 'org-kmh',
        name: 'KMH Cardiology',
        categories: ['Cardiology Referral', 'Lab Results', 'ECG Report', 'Echo Report', 'Discharge Summary', 'Stress Test', 'Holter Report', 'MRI Report', 'MRI Requisition', 'CT Scan Report', 'Nuclear Imaging', 'Consultation Report', 'Insurance / Admin', 'Medication List', 'BNP Results', 'Troponin Results', 'Angiography Report', 'Device Interrogation'],
      }],
    }
  }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('organizations')
    .select('id, name, emr_systems(valid_categories)')
    .order('name')

  if (error) {
    console.error('Failed to fetch organizations with categories:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  const orgs: OrganizationWithCategories[] = (data ?? []).map((row: Record<string, unknown>) => {
    const emr = row.emr_systems as { valid_categories: string[] } | null
    return {
      id: row.id as string,
      name: row.name as string,
      categories: emr?.valid_categories ?? [],
    }
  })

  return { success: true, data: orgs }
}

export type PatientRow = {
  id: string
  name: string
  date_of_birth: string | null
  health_card_number: string | null
  health_card_version: string | null
}

export async function fetchPatients(): Promise<ActionResult<PatientRow[]>> {
  if (IS_DEV_MODE) {
    return {
      success: true,
      data: [
        { id: 'pat-001', name: 'Robert Anderson', date_of_birth: '1958-03-15', health_card_number: '1234-567-890', health_card_version: 'AB' },
        { id: 'pat-002', name: 'Maria Gonzalez', date_of_birth: '1972-07-22', health_card_number: '2345-678-901', health_card_version: 'CD' },
        { id: 'pat-003', name: 'James Wilson', date_of_birth: '1965-11-08', health_card_number: '3456-789-012', health_card_version: 'EF' },
        { id: 'pat-004', name: 'Patricia Lee', date_of_birth: '1980-01-30', health_card_number: '4567-890-123', health_card_version: 'GH' },
        { id: 'pat-005', name: 'David Thompson', date_of_birth: '1953-09-12', health_card_number: '5678-901-234', health_card_version: 'IJ' },
        { id: 'pat-006', name: 'Susan Miller', date_of_birth: '1968-04-05', health_card_number: '6789-012-345', health_card_version: 'KL' },
        { id: 'pat-007', name: 'William Brown', date_of_birth: '1960-12-20', health_card_number: '7890-123-456', health_card_version: 'MN' },
        { id: 'pat-008', name: 'Elizabeth Taylor', date_of_birth: '1975-06-18', health_card_number: '8901-234-567', health_card_version: 'OP' },
        { id: 'pat-009', name: 'Margaret White', date_of_birth: '1948-08-25', health_card_number: '9012-345-678', health_card_version: 'QR' },
        { id: 'pat-010', name: 'Thomas Clark', date_of_birth: '1970-02-14', health_card_number: '0123-456-789', health_card_version: 'ST' },
        { id: 'pat-011', name: 'Jennifer Adams', date_of_birth: '1985-10-03', health_card_number: '1234-567-890', health_card_version: 'UV' },
        { id: 'pat-012', name: 'Richard Davis', date_of_birth: '1955-05-28', health_card_number: '2345-678-901', health_card_version: 'WX' },
        { id: 'pat-014', name: 'Helen Martinez', date_of_birth: '1962-07-10', health_card_number: '3456-789-012', health_card_version: 'YZ' },
        { id: 'pat-015', name: 'George Robinson', date_of_birth: '1957-01-19', health_card_number: '4567-890-123', health_card_version: 'AA' },
      ],
    }
  }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('fax_patients')
    .select('id, name, date_of_birth, health_card_number, health_card_version')
    .order('name')

  if (error) {
    console.error('Failed to fetch patients:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  return { success: true, data: data ?? [] }
}

export type ProviderRow = {
  id: string
  name: string
  title: string | null
}

export async function fetchProviders(): Promise<ActionResult<ProviderRow[]>> {
  if (IS_DEV_MODE) {
    return {
      success: true,
      data: [
        { id: 'prov-001', name: 'Dr. Sarah Chen', title: 'MD, CCFP' },
        { id: 'prov-002', name: 'Dr. Michael Patel', title: 'MD, FRCPC' },
        { id: 'prov-003', name: 'Dr. Anita Sharma', title: 'MD' },
        { id: 'prov-004', name: 'Dr. John Kim', title: 'MD, FRCPC' },
        { id: 'prov-005', name: 'Dr. Lisa Wang', title: 'MD, FRCPC' },
        { id: 'prov-006', name: 'Dr. Raj Kapoor', title: 'MD, CCFP' },
        { id: 'prov-007', name: 'Dr. Emma Foster', title: 'MD, FRCPC' },
        { id: 'prov-008', name: 'Dr. Amanda Ross', title: 'MD, FRCPC' },
        { id: 'prov-009', name: 'Dr. Fiona Campbell', title: 'MD' },
      ],
    }
  }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('fax_providers')
    .select('id, name, title')
    .order('name')

  if (error) {
    console.error('Failed to fetch providers:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  return { success: true, data: data ?? [] }
}

// --- Patient Sync ---

export async function triggerPatientRefresh(): Promise<ActionResult<null>> {
  const url = process.env.ORCHESTRATOR_URL
  if (!url) {
    return { success: false, error: 'ORCHESTRATOR_URL not configured', isClientError: false }
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: 'Not authenticated',
        isClientError: true,
      }
    }

    const { data: orgRpcData, error: orgError } = await supabase.rpc('get_user_organization_id')
    const orgIdFromRpc = normalizeOrganizationId(orgRpcData)

    let organizationId = orgIdFromRpc

    if (!organizationId) {
      const { data: userRow, error: userRowError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single()

      if (userRowError) {
        console.error('Failed to resolve user organization:', orgError, userRowError)
      }

      organizationId = normalizeOrganizationId(userRow?.organization_id)
    }

    if (!organizationId) {
      console.error('Could not resolve a valid organization UUID for user', {
        authUserId: user.id,
        orgRpcData,
        orgError,
      })
      return {
        success: false,
        error: 'Could not resolve your organization',
        isClientError: true,
      }
    }

    const res = await fetch(`${url}/patients/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const errorMessage =
        Array.isArray(body.message) && body.message.length > 0
          ? body.message.join(', ')
          : body.error || `Server error ${res.status}`
      return {
        success: false,
        error: errorMessage,
        isClientError: res.status >= 400 && res.status < 500,
      }
    }

    return { success: true, data: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to trigger patient refresh'
    console.error('triggerPatientRefresh failed:', message)
    return { success: false, error: message, isClientError: false }
  }
}

function normalizeOrganizationId(value: unknown): string | null {
  const maybeUuid = extractOrganizationIdValue(value)
  return isUuid(maybeUuid) ? maybeUuid : null
}

function extractOrganizationIdValue(value: unknown): string | null {
  if (typeof value === 'string') return value

  if (Array.isArray(value) && value.length > 0) {
    return extractOrganizationIdValue(value[0])
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.organization_id === 'string') return record.organization_id
    if (typeof record.get_user_organization_id === 'string') {
      return record.get_user_organization_id
    }
  }

  return null
}

function isUuid(value: string | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

// --- Calibration Report ---

export type CalibrationBucket = {
  bucket: number
  total: number
  category_correct: number
  category_accuracy_pct: number
  patient_correct: number
  patient_accuracy_pct: number
}

export type WeightSimulation = {
  w_logprob: number
  w_ocr: number
  score_distribution: { bucket: number; count: number }[]
}

export type CalibrationReport = {
  id: string
  created_at: string
  total_reviewed: number
  overall_category_accuracy: number
  overall_patient_accuracy: number
  current_w_logprob: number
  current_w_ocr: number
  buckets: CalibrationBucket[]
  weight_simulations: WeightSimulation[] | null
}

export async function fetchCalibrationReport(): Promise<ActionResult<CalibrationReport | null>> {
  if (IS_DEV_MODE) return { success: true, data: null }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('calibration_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch calibration report:', error)
    return {
      success: false,
      error: error.message,
      isClientError: status >= 400 && status < 500,
    }
  }

  return { success: true, data: data as CalibrationReport | null }
}

// --- Lifecycle (in-progress pipeline items) ---

export async function fetchLifecycleItems(): Promise<ActionResult<LifecycleRow[]>> {
  if (IS_DEV_MODE) return { success: true, data: [] }
  const supabase = await createClient()

  const { data, error, status } = await supabase
    .from('fax_lifecycle')
    .select('id, job_id, submission_id, organization_id, status, created_at')
    .in('status', ['receiving', 'classifying'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch lifecycle items:', error)
    return { success: false, error: error.message, isClientError: status >= 400 && status < 500 }
  }

  const rows = (data ?? []) as LifecycleRow[]
  const deduped = Array.from(
    rows.reduce((byJobId, row) => {
      const existing = byJobId.get(row.job_id)
      if (!existing) {
        byJobId.set(row.job_id, row)
        return byJobId
      }

      if (new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
        byJobId.set(row.job_id, row)
      }

      return byJobId
    }, new Map<string, LifecycleRow>()).values()
  )

  return { success: true, data: deduped }
}
