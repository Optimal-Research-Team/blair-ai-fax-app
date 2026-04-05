'use client'

import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { PageHeader } from '@/components/shared/page-header'
import { SearchBar } from '@/components/shared/search-bar'
import { TablePagination } from '@/components/shared/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Bell,
  Hash,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wand2,
  UserPlus,
  AlertCircle,
  Clock,
  Info,
} from 'lucide-react'
import { slackAlertsAtom, SlackAlertSeverity } from '@/atoms/simulation'
import { faxesAtom } from '@/atoms/inbox'
import { formatRelativeTime } from '@/lib/format'
import { isToday, isThisWeek } from 'date-fns'
import { cn } from '@/lib/utils'

// Severity-based styling (critical = overdue, warning = approaching, info = normal)
const severityRowClasses: Record<SlackAlertSeverity, string> = {
  critical: 'bg-red-50/50 border-l-red-500',
  warning: 'bg-amber-50/50 border-l-amber-500',
  info: 'border-l-blue-400',
}

const severityBadgeClasses: Record<SlackAlertSeverity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
}

const severityLabels: Record<SlackAlertSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

const severityIcons: Record<SlackAlertSeverity, React.ReactNode> = {
  critical: <AlertCircle className="h-3 w-3" />,
  warning: <Clock className="h-3 w-3" />,
  info: <Info className="h-3 w-3" />,
}

export default function SlackBotLogPage() {
  const allAlerts = useAtomValue(slackAlertsAtom)
  const allFaxes = useAtomValue(faxesAtom)

  const [activeTab, setActiveTab] = useState<'urgent' | 'digests'>('urgent')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // --- Urgent alerts ---
  const filteredAlerts = useMemo(() => {
    if (!search.trim()) return allAlerts
    const q = search.toLowerCase()
    return allAlerts.filter(
      (a) =>
        a.message.toLowerCase().includes(q) ||
        a.channel.toLowerCase().includes(q) ||
        (a.patientName && a.patientName.toLowerCase().includes(q))
    )
  }, [allAlerts, search])

  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAlerts.slice(start, start + pageSize)
  }, [filteredAlerts, currentPage, pageSize])

  // --- Digests ---
  const digests = useMemo(() => {
    const completedToday = allFaxes.filter(
      (f) =>
        (f.status === 'completed' || f.status === 'auto-filed') &&
        f.completedAt &&
        isToday(new Date(f.completedAt))
    )
    const completedThisWeek = allFaxes.filter(
      (f) =>
        (f.status === 'completed' || f.status === 'auto-filed') &&
        f.completedAt &&
        isThisWeek(new Date(f.completedAt))
    )
    const autoFiledToday = completedToday.filter((f) => f.status === 'auto-filed')
    const pendingReview = allFaxes.filter((f) => f.status === 'pending-review')
    const newPatientsToday = allFaxes.filter(
      (f) => f.patientMatchStatus === 'matched' && f.completedAt && isToday(new Date(f.completedAt))
    )

    const items: { id: string; icon: React.ReactNode; message: string; channel: string }[] = []

    if (completedToday.length > 0) {
      items.push({
        id: 'digest-processed-today',
        icon: <FileText className="h-3.5 w-3.5 text-emerald-600" />,
        message: `${completedToday.length} fax${completedToday.length !== 1 ? 'es' : ''} processed today (${autoFiledToday.length} auto-filed, ${completedToday.length - autoFiledToday.length} manual).`,
        channel: '#fax-digest',
      })
    }

    if (completedThisWeek.length > completedToday.length) {
      items.push({
        id: 'digest-processed-week',
        icon: <FileText className="h-3.5 w-3.5 text-sky-600" />,
        message: `${completedThisWeek.length} fax${completedThisWeek.length !== 1 ? 'es' : ''} processed this week.`,
        channel: '#fax-digest',
      })
    }

    if (autoFiledToday.length > 0) {
      const rate = completedToday.length > 0
        ? Math.round((autoFiledToday.length / completedToday.length) * 100)
        : 0
      items.push({
        id: 'digest-autofile-rate',
        icon: <Wand2 className="h-3.5 w-3.5 text-amber-600" />,
        message: `Auto-file rate today: ${rate}% (${autoFiledToday.length} of ${completedToday.length}).`,
        channel: '#fax-digest',
      })
    }

    if (pendingReview.length > 0) {
      items.push({
        id: 'digest-pending',
        icon: <Bell className="h-3.5 w-3.5 text-amber-600" />,
        message: `${pendingReview.length} fax${pendingReview.length !== 1 ? 'es' : ''} pending review.`,
        channel: '#fax-digest',
      })
    }

    if (newPatientsToday.length > 0) {
      items.push({
        id: 'digest-patients',
        icon: <UserPlus className="h-3.5 w-3.5 text-violet-600" />,
        message: `${newPatientsToday.length} patient${newPatientsToday.length !== 1 ? 's' : ''} matched from faxes today.`,
        channel: '#fax-digest',
      })
    }

    return items
  }, [allFaxes])

  return (
    <div className="space-y-2">
      <PageHeader
        title="Slack"
        description="Urgent alerts and activity digests from fax processing"
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList variant="line">
          <TabsTrigger value="urgent" className="gap-2">
            Urgent Alerts
            {allAlerts.length > 0 && (
              <span className="font-mono text-[11px] text-red-600 tabular-nums bg-red-50 px-1.5 py-0.5 rounded-sm">
                {allAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="digests" className="gap-2">
            Activity Digests
            {digests.length > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {digests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="urgent" className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v)
                setCurrentPage(1)
              }}
              placeholder="Search alerts..."
            />
            <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
              {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="rounded-sm border bg-card divide-y divide-border">
            {paginatedAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-6 w-6 mb-2 opacity-40" />
                <p className="text-sm font-medium">
                  {allAlerts.length === 0 ? 'No urgent alerts' : 'No alerts match your search'}
                </p>
                <p className="text-xs">Urgent fax alerts will appear here</p>
              </div>
            ) : (
              paginatedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 px-3 py-2.5 border-l-2',
                    severityRowClasses[alert.severity]
                  )}
                >
                  <Hash className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">
                        {alert.channel}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] h-5 gap-1', severityBadgeClasses[alert.severity])}
                      >
                        {severityIcons[alert.severity]}
                        {severityLabels[alert.severity]}
                      </Badge>
                      {alert.patientName && (
                        <span className="text-xs text-muted-foreground">
                          {alert.patientName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5">{alert.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                    {formatRelativeTime(alert.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>

          {filteredAlerts.length > pageSize && (
            <TablePagination
              totalItems={filteredAlerts.length}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="digests" className="space-y-2">
          <div className="rounded-sm border bg-card divide-y divide-border">
            {digests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-6 w-6 mb-2 opacity-40" />
                <p className="text-sm font-medium">No activity yet</p>
                <p className="text-xs">Digests will appear as faxes are processed</p>
              </div>
            ) : (
              digests.map((digest) => (
                <div
                  key={digest.id}
                  className="flex items-start gap-3 px-3 py-2.5 border-l-2 border-l-blue-400"
                >
                  <div className="shrink-0 mt-0.5">{digest.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {digest.channel}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 gap-1 bg-blue-50 text-blue-700 border-blue-200"
                      >
                        Digest
                      </Badge>
                    </div>
                    <p className="text-sm mt-0.5">{digest.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
