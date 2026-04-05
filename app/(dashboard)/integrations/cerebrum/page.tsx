"use client"

import { useState, useMemo } from "react"
import { useAtomValue } from "jotai"
import { PageHeader } from "@/components/shared/page-header"
import { FaxViewerDialog } from "@/components/fax-viewer/fax-viewer-dialog"
import { TablePagination } from "@/components/shared/table-pagination"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "@/components/shared/search-bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { simulatedReferralsAtom, simulatedPatientsAtom } from "@/atoms/simulation"
import { faxesAtom } from "@/atoms/inbox"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"
import {
  Brain,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Zap,
  FolderOpen,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from "lucide-react"
import { Patient } from "@/types"

// Cerebrum folder types
const CEREBRUM_FOLDERS = [
  "Referrals",
  "Lab Results",
  "Imaging",
  "ECG / Holter",
  "Correspondence",
  "Consult Reports",
  "Discharge Summaries",
  "Procedures",
] as const

type CerebrumFolder = (typeof CEREBRUM_FOLDERS)[number]

type EMRFeedStatus = "exported" | "pending" | "failed"

interface EMRFeedRow {
  id: string
  referralId?: string
  faxId?: string
  pageNumber?: number
  totalPages?: number
  patientName: string
  patientId?: string
  documentType: string
  folder: CerebrumFolder
  providerInbox: string
  originProvider: string
  routedAt: string
  routedBy: "AI" | string
  status: EMRFeedStatus
}

// Map document type/label to a Cerebrum folder
function suggestFolder(docType: string, label: string): CerebrumFolder {
  const lower = `${docType} ${label}`.toLowerCase()
  if (lower.includes("referral")) return "Referrals"
  if (
    lower.includes("lab") ||
    lower.includes("bnp") ||
    lower.includes("troponin") ||
    lower.includes("bloodwork") ||
    lower.includes("inr")
  )
    return "Lab Results"
  if (
    lower.includes("echo") ||
    lower.includes("ct") ||
    lower.includes("mri") ||
    lower.includes("angio") ||
    lower.includes("nuclear") ||
    lower.includes("stress") ||
    lower.includes("x-ray") ||
    lower.includes("chest")
  )
    return "Imaging"
  if (lower.includes("ecg") || lower.includes("holter")) return "ECG / Holter"
  if (lower.includes("consult")) return "Consult Reports"
  if (lower.includes("discharge")) return "Discharge Summaries"
  if (
    lower.includes("procedure") ||
    lower.includes("cath") ||
    lower.includes("pci") ||
    lower.includes("device") ||
    lower.includes("ablation")
  )
    return "Procedures"
  return "Correspondence"
}

// Deterministic human names for manual routing
const STAFF_NAMES = ["Sarah Mitchell", "Emily Park", "Michael Torres"]

const STATUS_CONFIG: Record<
  EMRFeedStatus,
  { label: string; className: string }
> = {
  exported: {
    label: "Exported",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  },
}

// Uniform gray folder badges with folder icon
const FOLDER_BADGE_STYLE = "bg-muted text-muted-foreground border-border"

type RoutedByFilter = "all" | "ai" | "manual"
type StatusFilter = "all" | EMRFeedStatus
type FolderFilter = "all" | CerebrumFolder
type ProviderInboxFilter = "all" | string

export default function CerebrumFeedPage() {
  const referrals = useAtomValue(simulatedReferralsAtom)
  const faxes = useAtomValue(faxesAtom)
  const patients = useAtomValue(simulatedPatientsAtom)

  // Build the EMR feed from ALL sources: referrals + non-referral faxes
  // Each PAGE is sent to Cerebrum independently
  const allRows = useMemo(() => {
    const rows: EMRFeedRow[] = []
    const coveredFaxIds = new Set<string>()

    // 1. Build rows from referral documents - one row per PAGE
    for (const ref of referrals) {
      // Check if linked fax has a custom provider inbox set
      const linkedFax = faxes.find((f) => f.id === ref.faxId)
      const providerInbox =
        linkedFax?.providerInbox || ref.assignedCardiologistName || "Dr. Anika Patel"

      // Track the fax ID so we don't duplicate it below
      coveredFaxIds.add(ref.faxId)

      for (let i = 0; i < ref.documents.length; i++) {
        const doc = ref.documents[i]
        const totalPages = doc.pages.length || doc.pageCount || 1

        // Create one row per page in this document
        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          const page = doc.pages[pageIdx]
          const pageNumber = pageIdx + 1

          // Determine document type from page content if available
          let documentType = page?.detectedContent || doc.label
          const pageContentLower = (page?.detectedContent || "").toLowerCase()

          if (pageContentLower.includes("ecg") || pageContentLower.includes("delta")) {
            documentType = "ECG"
          } else if (pageContentLower.includes("echo")) {
            documentType = "Echocardiogram Report"
          } else if (pageContentLower.includes("holter")) {
            documentType = "Holter Monitor Report"
          } else if (pageContentLower.includes("lab") || pageContentLower.includes("bloodwork")) {
            documentType = "Lab Results"
          } else if (pageContentLower.includes("referral")) {
            documentType = "Referral Letter"
          } else if (pageContentLower.includes("medication") || pageContentLower.includes("rx")) {
            documentType = "Medication List"
          } else if (pageContentLower.includes("history") || pageContentLower.includes("clinical")) {
            documentType = "Clinical History"
          }

          const folder = suggestFolder(documentType, doc.label)

          // Determine routing method: use a hash-based approach for consistency
          const hashSeed = (doc.id + pageIdx).charCodeAt((doc.id + pageIdx).length - 1)
          const isAIRouted = hashSeed % 3 !== 0 // ~67% AI-routed

          // Determine status based on referral state
          let status: EMRFeedStatus = "exported"
          if (ref.status === "incomplete" || ref.status === "triage") {
            status = "pending"
          } else if (ref.status === "pending-review") {
            // Some pending-review items are exported, some pending
            status = pageIdx === 0 ? "pending" : "exported"
          }

          // Rare failures: use hash for deterministic assignment
          if (hashSeed % 17 === 0 && status === "exported") {
            status = "failed"
          }

          // Routing timestamp: offset from document received time, stagger by page
          const receivedTime = new Date(doc.receivedAt).getTime()
          const routingDelay =
            status === "exported"
              ? (hashSeed % 5) * 60 * 1000 + 30000 + (pageIdx * 5000) // 0.5-5 min + 5s per page
              : 0
          const routedAt = new Date(receivedTime + routingDelay).toISOString()

          rows.push({
            id: `emr-${doc.id}-p${pageNumber}`,
            referralId: ref.id,
            faxId: ref.faxId,
            pageNumber,
            totalPages,
            patientName: ref.patientName,
            patientId: ref.patientId,
            documentType,
            folder,
            providerInbox,
            originProvider: ref.referringPhysicianName,
            routedAt,
            routedBy: isAIRouted
              ? "AI"
              : STAFF_NAMES[hashSeed % STAFF_NAMES.length],
            status,
          })
        }
      }
    }

    // 2. Build rows from non-referral faxes - one row per PAGE
    for (const fax of faxes) {
      // Skip faxes already covered by referrals
      if (coveredFaxIds.has(fax.id)) continue

      // Only include completed or auto-filed faxes
      if (fax.status !== "completed" && fax.status !== "auto-filed") continue

      // Skip faxes still processing
      if (fax.processingState) continue

      const isAutoFiled = fax.status === "auto-filed"
      const totalPages = fax.pages?.length || fax.pageCount || 1

      // Create one row per page in this fax
      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const page = fax.pages?.[pageIdx]
        const pageNumber = pageIdx + 1

        // Determine document type from page content if available
        let documentType = page?.detectedDocType || fax.documentCategory
        const pageContentLower = (page?.detectedDocType || "").toLowerCase()

        if (pageContentLower.includes("ecg") || pageContentLower.includes("delta")) {
          documentType = "ECG"
        } else if (pageContentLower.includes("echo")) {
          documentType = "Echocardiogram Report"
        } else if (pageContentLower.includes("holter")) {
          documentType = "Holter Monitor Report"
        } else if (pageContentLower.includes("lab") || pageContentLower.includes("bloodwork")) {
          documentType = "Lab Results"
        }

        const folder = suggestFolder(documentType, fax.description || "")

        // Stagger routing time by page
        const routedAtBase = fax.completedAt || fax.receivedAt
        const routedAt = new Date(new Date(routedAtBase).getTime() + (pageIdx * 5000)).toISOString()

        // Determine routing method
        const hashSeed = (fax.id + pageIdx).charCodeAt((fax.id + pageIdx).length - 1)

        rows.push({
          id: `emr-fax-${fax.id}-p${pageNumber}`,
          faxId: fax.id,
          pageNumber,
          totalPages,
          patientName: fax.patientName || "Unknown Patient",
          patientId: fax.patientId,
          documentType,
          folder,
          providerInbox: fax.providerInbox || "Dr. Anika Patel",
          originProvider: fax.senderName || "Unknown",
          routedAt,
          routedBy: isAutoFiled ? "AI" : STAFF_NAMES[hashSeed % STAFF_NAMES.length],
          status: isAutoFiled ? "exported" : "pending",
        })
      }
    }

    // Sort by most recent first, pending items prioritized
    rows.sort((a, b) => {
      const statusOrder: Record<EMRFeedStatus, number> = {
        pending: 0,
        failed: 1,
        exported: 2,
      }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return new Date(b.routedAt).getTime() - new Date(a.routedAt).getTime()
    })

    return rows
  }, [referrals, faxes])

  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null)
  const [selectedFaxId, setSelectedFaxId] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [routedByFilter, setRoutedByFilter] = useState<RoutedByFilter>("all")
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all")
  const [providerInboxFilter, setProviderInboxFilter] =
    useState<ProviderInboxFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Unique provider inboxes for the filter
  const providerInboxes = useMemo(() => {
    const set = new Set(allRows.map((r) => r.providerInbox))
    return Array.from(set).sort()
  }, [allRows])

  // KPI computations
  const kpis = useMemo(() => {
    const total = allRows.length
    const exported = allRows.filter((r) => r.status === "exported").length
    const pending = allRows.filter((r) => r.status === "pending").length
    const failed = allRows.filter((r) => r.status === "failed").length
    const aiRouted = allRows.filter((r) => r.routedBy === "AI").length
    const autoRoutedPct = total > 0 ? Math.round((aiRouted / total) * 100) : 0

    return { total, exported, pending, failed, autoRoutedPct }
  }, [allRows])

  // Filtered rows
  const filteredRows = useMemo(() => {
    let items = allRows

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.documentType.toLowerCase().includes(q) ||
          r.originProvider.toLowerCase().includes(q) ||
          r.providerInbox.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== "all") {
      items = items.filter((r) => r.status === statusFilter)
    }

    if (routedByFilter === "ai") {
      items = items.filter((r) => r.routedBy === "AI")
    } else if (routedByFilter === "manual") {
      items = items.filter((r) => r.routedBy !== "AI")
    }

    if (folderFilter !== "all") {
      items = items.filter((r) => r.folder === folderFilter)
    }

    if (providerInboxFilter !== "all") {
      items = items.filter((r) => r.providerInbox === providerInboxFilter)
    }

    return items
  }, [
    allRows,
    searchQuery,
    statusFilter,
    routedByFilter,
    folderFilter,
    providerInboxFilter,
  ])

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  return (
    <div className="space-y-2">
      <PageHeader
        title="Cerebrum EMR Feed"
        description="Document routing activity to Cerebrum patient charts"
        action={
          <Badge
            variant="secondary"
            className="text-[10px] bg-emerald-50 text-emerald-700"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border rounded-sm overflow-hidden">
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Total Routed
          </p>
          <p className="font-mono text-lg font-bold tabular-nums leading-tight">
            {kpis.total}
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Auto-Routed
          </p>
          <p
            className={cn(
              "font-mono text-lg font-bold tabular-nums leading-tight",
              kpis.autoRoutedPct >= 60
                ? "text-emerald-700"
                : "text-foreground"
            )}
          >
            {kpis.autoRoutedPct}%
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Exported
          </p>
          <p className="font-mono text-lg font-bold tabular-nums leading-tight text-emerald-700">
            {kpis.exported}
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Pending
          </p>
          <p
            className={cn(
              "font-mono text-lg font-bold tabular-nums leading-tight",
              kpis.pending > 0 ? "text-amber-700" : "text-foreground"
            )}
          >
            {kpis.pending}
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Failed
          </p>
          <p
            className={cn(
              "font-mono text-lg font-bold tabular-nums leading-tight",
              kpis.failed > 0 ? "text-red-700" : "text-foreground"
            )}
          >
            {kpis.failed}
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); resetPage() }}
          placeholder="Search patient, document, provider..."
          aria-label="Search EMR feed"
        />

        <Select
          value={routedByFilter}
          onValueChange={(v) => { setRoutedByFilter(v as RoutedByFilter); resetPage() }}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Routed By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="ai">AI Only</SelectItem>
            <SelectItem value="manual">Manual Only</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as StatusFilter); resetPage() }}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={folderFilter}
          onValueChange={(v) => { setFolderFilter(v as FolderFilter); resetPage() }}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Folders</SelectItem>
            {CEREBRUM_FOLDERS.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={providerInboxFilter}
          onValueChange={(v) => { setProviderInboxFilter(v as ProviderInboxFilter); resetPage() }}
        >
          <SelectTrigger className="w-[170px] h-8 text-xs">
            <SelectValue placeholder="Provider Inbox" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Inboxes</SelectItem>
            {providerInboxes.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {filteredRows.length} result{filteredRows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Data Table */}
      <div className="border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Patient
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Document Type
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Folder
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Provider Inbox
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Origin Provider
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Routed At
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Routed By
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Brain
                      className="h-8 w-8 opacity-40"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium">
                      {allRows.length === 0 ? "No EMR feed entries yet" : "No documents match your filters"}
                    </p>
                    <p className="text-xs">
                      {allRows.length === 0 ? "Documents will appear here as faxes are processed and routed" : "Try adjusting your search or filters"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => {
                const statusCfg = STATUS_CONFIG[row.status]
                return (
                  <TableRow
                    key={row.id}
                    className="group"
                  >
                    <TableCell className="py-2 px-3">
                      <button
                        onClick={() => {
                          if (row.patientId) {
                            const patient = patients.find(p => p.id === row.patientId)
                            if (patient) {
                              setSelectedPatient(patient)
                            }
                          }
                        }}
                        className={cn(
                          "text-sm font-medium text-left",
                          row.patientId && "hover:text-primary hover:underline cursor-pointer"
                        )}
                      >
                        {row.patientName}
                      </button>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <button
                        onClick={() => {
                          if (row.referralId) {
                            setSelectedReferralId(row.referralId)
                            setSelectedFaxId(null)
                          } else {
                            setSelectedFaxId(row.faxId || null)
                            setSelectedReferralId(null)
                          }
                        }}
                        className="flex items-center gap-1.5 hover:text-primary cursor-pointer text-left group/doctype"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover/doctype:text-primary shrink-0" />
                        <span className="text-xs hover:underline">
                          {row.documentType}
                          {row.pageNumber && row.totalPages && row.totalPages > 1 && (
                            <span className="text-muted-foreground ml-1">
                              (p{row.pageNumber}/{row.totalPages})
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] text-muted-foreground opacity-0 group-hover/doctype:opacity-100 transition-opacity">
                          View
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5 font-medium gap-1", FOLDER_BADGE_STYLE)}
                      >
                        <FolderOpen className="h-3 w-3" />
                        {row.folder}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <span className="text-xs">{row.providerInbox}</span>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <span className="text-xs text-muted-foreground">
                        {row.originProvider}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(row.routedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      {row.routedBy === "AI" ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 bg-emerald-50 text-emerald-700 gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          Auto
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {row.routedBy}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5", statusCfg.className)}
                      >
                        {row.status === "exported" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {row.status === "pending" && (
                          <Clock className="h-3 w-3" />
                        )}
                        {row.status === "failed" && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        totalItems={filteredRows.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); resetPage() }}
      />

      <FaxViewerDialog
        faxId={selectedFaxId}
        referralId={selectedReferralId}
        open={selectedReferralId !== null || selectedFaxId !== null}
        onOpenChange={(open) => { if (!open) { setSelectedReferralId(null); setSelectedFaxId(null) } }}
      />

      {/* Patient Detail Dialog */}
      <Dialog open={selectedPatient !== null} onOpenChange={(open) => { if (!open) setSelectedPatient(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                  {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                </div>
                <div>
                  <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedPatient.phn || "No PHN"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Date of Birth</p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedPatient.dateOfBirth || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Gender</p>
                  <p>{selectedPatient.gender === "F" ? "Female" : selectedPatient.gender === "M" ? "Male" : "Other"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Phone</p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedPatient.phone || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Email</p>
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {selectedPatient.email || "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Address</p>
                <p className="text-sm flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span>
                    {selectedPatient.address.street && `${selectedPatient.address.street}, `}
                    {selectedPatient.address.city}, {selectedPatient.address.province} {selectedPatient.address.postalCode}
                  </span>
                </p>
              </div>

              {selectedPatient.conditions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPatient.conditions.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px] h-5 font-normal">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedPatient.medications.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Medications</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPatient.medications.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px] h-5 font-normal">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
