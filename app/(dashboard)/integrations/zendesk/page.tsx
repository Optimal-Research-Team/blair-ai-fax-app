'use client'

import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { PageHeader } from '@/components/shared/page-header'
import { SearchBar } from '@/components/shared/search-bar'
import { TablePagination } from '@/components/shared/table-pagination'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Ticket,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CircleDot,
  Bot,
  UserPen,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { zendeskTicketsAtom, ZendeskTicketStatus, ZendeskTicket, ZendeskSlaStatus } from '@/atoms/simulation'
import { formatRelativeTime } from '@/lib/format'
import { differenceInMinutes } from 'date-fns'

// Compute SLA status based on slaDueAt
function getSlaStatus(ticket: ZendeskTicket): ZendeskSlaStatus {
  if (ticket.status === 'resolved') return 'on-track'
  const now = new Date()
  const due = new Date(ticket.slaDueAt)
  const diffMins = differenceInMinutes(due, now)
  if (diffMins < 0) return 'overdue'
  if (diffMins <= 30) return 'approaching' // Within 30 minutes of deadline
  return 'on-track'
}

const slaRowClasses: Record<ZendeskSlaStatus, string> = {
  overdue: 'bg-red-50/50 border-l-red-500',
  approaching: 'bg-amber-50/50 border-l-amber-500',
  'on-track': 'border-l-blue-400',
}

const slaBadgeClasses: Record<ZendeskSlaStatus, string> = {
  overdue: 'bg-red-100 text-red-700 border-red-300',
  approaching: 'bg-amber-100 text-amber-700 border-amber-300',
  'on-track': 'bg-blue-50 text-blue-700 border-blue-200',
}

const slaLabels: Record<ZendeskSlaStatus, string> = {
  overdue: 'SLA Overdue',
  approaching: 'SLA Soon',
  'on-track': '',
}

type TabId = 'auto-created' | 'resolved'

const statusLabel: Record<ZendeskTicketStatus, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  resolved: 'Resolved',
}

const statusIcon: Record<ZendeskTicketStatus, React.ReactNode> = {
  open: <CircleDot className="h-3 w-3" />,
  'in-progress': <Clock className="h-3 w-3" />,
  resolved: <CheckCircle2 className="h-3 w-3" />,
}

const statusClasses: Record<ZendeskTicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const urgencyClasses: Record<'STAT' | 'Urgent', string> = {
  STAT: 'bg-red-50 text-red-700 border-red-200',
  Urgent: 'bg-orange-50 text-orange-700 border-orange-200',
}

type StatusFilter = 'all' | 'open' | 'in-progress'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'auto-created', label: 'Auto-Created', icon: Bot },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2 },
]

export default function ZendeskFeedPage() {
  const allTickets = useAtomValue(zendeskTicketsAtom)

  const [activeTab, setActiveTab] = useState<TabId>('auto-created')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const tabTickets = useMemo(() => {
    if (activeTab === 'resolved') {
      return allTickets.filter((t) => t.status === 'resolved')
    }
    // auto-created: not resolved
    return allTickets.filter((t) => t.status !== 'resolved')
  }, [allTickets, activeTab])

  const tabCounts = useMemo(() => {
    const active = allTickets.filter((t) => t.status !== 'resolved')
    const resolved = allTickets.filter((t) => t.status === 'resolved')
    return {
      'auto-created': active.length,
      resolved: resolved.length,
    }
  }, [allTickets])

  const filtered = useMemo(() => {
    let result = tabTickets

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.patientName.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q) ||
          t.referringPhysician.toLowerCase().includes(q)
      )
    }

    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [tabTickets, statusFilter, search])

  // Reset status filter and page when switching tabs
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Resolved tab shows no status filter (all are resolved)
  const showStatusFilter = activeTab !== 'resolved'

  return (
    <div className="space-y-2">
      <PageHeader
        title="Zendesk"
        description="Auto-created tickets from urgent faxes"
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

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const count = tabCounts[tab.id]
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span
                className={cn(
                  'ml-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setCurrentPage(1) }}
          placeholder="Search patient, ticket, or provider..."
        />
        {showStatusFilter && (
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as StatusFilter); setCurrentPage(1) }}
          >
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        )}
        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="rounded-sm border bg-card divide-y divide-border">
        {paginatedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Ticket className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">
              {allTickets.length === 0 ? 'No tickets yet' : 'No tickets found'}
            </p>
            <p className="text-xs">
              {allTickets.length === 0
                ? 'Tickets will appear here when urgent faxes are processed'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          paginatedTickets.map((ticket) => {
            const slaStatus = getSlaStatus(ticket)
            return (
              <div
                key={ticket.id}
                className={cn(
                  'flex items-start justify-between gap-4 px-3 py-2.5 border-l-2',
                  ticket.status === 'resolved' ? 'border-l-emerald-400' : slaRowClasses[slaStatus],
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    {slaStatus === 'overdue' ? (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    ) : slaStatus === 'approaching' ? (
                      <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                    ) : ticket.urgencyLevel === 'STAT' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <Ticket className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">
                        {ticket.ticketNumber}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {ticket.patientName}
                      </span>
                      {slaStatus !== 'on-track' && ticket.status !== 'resolved' && (
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] h-5 gap-0.5', slaBadgeClasses[slaStatus])}
                        >
                          {slaStatus === 'overdue' ? <AlertCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                          {slaLabels[slaStatus]}
                        </Badge>
                      )}
                      {ticket.urgencyLevel && (
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] h-5', urgencyClasses[ticket.urgencyLevel])}
                        >
                          {ticket.urgencyLevel === 'STAT' && <AlertTriangle className="h-2.5 w-2.5" />}
                          {ticket.urgencyLevel}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] h-5 gap-1', statusClasses[ticket.status])}
                      >
                        {statusIcon[ticket.status]}
                        {statusLabel[ticket.status]}
                      </Badge>
                      {activeTab === 'resolved' && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] h-5 gap-0.5',
                            ticket.source === 'auto'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {ticket.source === 'auto' ? <Bot className="h-2.5 w-2.5" /> : <UserPen className="h-2.5 w-2.5" />}
                          {ticket.source === 'auto' ? 'Auto' : 'Manual'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {ticket.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.referringPhysician}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                  <a
                    href="#"
                    className="text-muted-foreground/60 hover:text-foreground transition-colors"
                    title="Open in Zendesk"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )
          })
        )}
      </div>

      <TablePagination
        totalItems={filtered.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />
    </div>
  )
}
