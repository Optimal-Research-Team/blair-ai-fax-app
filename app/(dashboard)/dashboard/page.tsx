"use client"

import { useMemo, useState } from "react"
import { useAtomValue } from "jotai"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { faxesAtom } from "@/atoms/inbox"
import { ClassificationStage } from "@/types"
import { simulatedReferralsAtom } from "@/atoms/simulation"
import { orgCategoriesAtom } from "@/atoms/organization"

// ---------------------------------------------------------------------------
// Placeholder data for realistic dashboard
// ---------------------------------------------------------------------------

/** Time bucket labels: Overnight (5 PM prev day → 7 AM), then hourly 7 AM – 5 PM */
const THROUGHPUT_BUCKETS = [
  "Overnight",
  "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
  "12 PM", "1 PM", "2 PM", "3 PM", "4 PM",
] as const

/**
 * Assign a fax timestamp to a bucket index (0 = Overnight, 1 = 7 AM, …, 10 = 4 PM).
 * `dayStart` is midnight of the "day" this bucket set represents.
 * Overnight window: 5 PM of the previous day through 6:59 AM of `dayStart`.
 * Returns -1 if the timestamp falls outside [prev 5 PM … current 5 PM).
 */
function toBucketIndex(ts: number, dayStart: number): number {
  const prevDay5PM = dayStart - 7 * 3600_000 // midnight minus 7 h = previous day 5 PM
  const day7AM = dayStart + 7 * 3600_000
  const day5PM = dayStart + 17 * 3600_000

  if (ts < prevDay5PM || ts >= day5PM) return -1
  if (ts < day7AM) return 0 // overnight

  const hour = new Date(ts).getHours() // 7–16
  return hour - 6 // 7→1, 8→2, …, 16→10
}

const PLACEHOLDER_DOC_TYPES = [
  { type: "Referral", count: 24, percentage: 28.2 },
  { type: "Lab Results", count: 19, percentage: 22.4 },
  { type: "Consultation Report", count: 14, percentage: 16.5 },
  { type: "Discharge Summary", count: 11, percentage: 12.9 },
  { type: "ECG Report", count: 9, percentage: 10.6 },
  { type: "Other", count: 8, percentage: 9.4 },
]

const PLACEHOLDER_STAFF = [
  { staffName: "Sarah Chen", role: "Senior Clerk", faxesProcessed: 42, avgTimePerFaxMinutes: 2.8, slaComplianceRate: 98.5 },
  { staffName: "Mike Johnson", role: "Clerk", faxesProcessed: 35, avgTimePerFaxMinutes: 3.2, slaComplianceRate: 97.1 },
  { staffName: "Emily Davis", role: "Clerk", faxesProcessed: 28, avgTimePerFaxMinutes: 3.5, slaComplianceRate: 96.4 },
  { staffName: "Alex Rivera", role: "Junior Clerk", faxesProcessed: 18, avgTimePerFaxMinutes: 4.1, slaComplianceRate: 94.4 },
]

const PLACEHOLDER_FUNNEL = [
  { stage: "Triage", count: 24, percentage: 100 },
  { stage: "Incomplete", count: 18, percentage: 75 },
  { stage: "Pending Review", count: 12, percentage: 50 },
  { stage: "Routed to Cerebrum", count: 8, percentage: 33.3 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Semantic KPI color: only color things that need attention */
function kpiColor(label: string, raw: number): string {
  switch (label) {
    case "Queue Depth":
      return raw > 20 ? "text-red-700" : "text-foreground"
    case "Auto-File Rate":
      return raw >= 90
        ? "text-emerald-700"
        : raw >= 75
          ? "text-foreground"
          : "text-red-700"
    case "SLA Compliance":
      return raw >= 97
        ? "text-emerald-700"
        : raw >= 90
          ? "text-amber-700"
          : "text-red-700"
    case "Avg Processing":
      return raw > 5 ? "text-red-700" : "text-foreground"
    default:
      return "text-foreground"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const allFaxes = useAtomValue(faxesAtom)
  const allReferrals = useAtomValue(simulatedReferralsAtom)
  const orgCategories = useAtomValue(orgCategoriesAtom)
  const [docCatsExpanded, setDocCatsExpanded] = useState(false)

  // ---- Derived KPIs (use real data when available, otherwise placeholder) ----
  const metrics = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayCutoff = startOfToday.getTime()

    // Queue depth: unfiled faxes needing human review
    const queueDepth = allFaxes.filter(
      (f) =>
        f.classificationStage === "unfiled" &&
        f.classificationStatus === "needs_review"
    ).length

    // Auto-file rate: filed entries / total entries
    const filedCount = allFaxes.filter(
      (f) =>
        f.classificationStage === ClassificationStage.AutoFiled ||
        f.classificationStage === ClassificationStage.ManuallyFiled
    ).length
    const totalCount = allFaxes.length
    const autoFileRate = totalCount > 0
      ? Math.round((filedCount / totalCount) * 1000) / 10
      : 0

    // Processed faxes (completed or auto-filed)
    const processed = allFaxes.filter(
      (f) => f.status === "completed" || f.status === "auto-filed"
    )
    const processedCount = processed.length
    const hasRealData = processedCount > 5

    // SLA compliance
    const slaCompliant = processed.filter((f) => {
      if (!f.completedAt || !f.slaDeadline) return false
      return new Date(f.completedAt).getTime() <= new Date(f.slaDeadline).getTime()
    }).length
    const slaComplianceRate = hasRealData
      ? Math.round((slaCompliant / processedCount) * 1000) / 10
      : 96.8

    // Average processing time: (classifiedAt - processingStartedAt) across all classified faxes
    const processingDiffs = allFaxes
      .filter((f) => f.classifiedAt && (f.processingStartedAt || f.receivedAt))
      .map(
        (f) =>
          (
            new Date(f.classifiedAt!).getTime() -
            new Date(f.processingStartedAt ?? f.receivedAt).getTime()
          ) /
          60_000
      )
      .filter((diff) => diff >= 0)
    const avgProcessingTimeMinutes = processingDiffs.length > 0
      ? Math.round(
          (processingDiffs.reduce((a, b) => a + b, 0) / processingDiffs.length) * 10
        ) / 10
      : 0

    // Classifications created today (since 12 AM)
    const classifiedToday = allFaxes.filter((f) => {
      const ts = f.classifiedAt ?? f.receivedAt
      return new Date(ts).getTime() >= todayCutoff
    }).length

    // Referrals created today (since 12 AM)
    const referralsToday = allFaxes.filter((f) => {
      if (!f.isReferral) return false
      const ts = f.classifiedAt ?? f.receivedAt
      return new Date(ts).getTime() >= todayCutoff
    }).length

    return {
      queueDepth,
      autoFileRate,
      slaComplianceRate,
      avgProcessingTimeMinutes,
      faxesProcessedToday: classifiedToday,
      referralsReceivedToday: referralsToday,
    }
  }, [allFaxes])

  // ---- Throughput chart: today vs yesterday, real data ----
  const throughputData = useMemo(() => {
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayMidnight = todayMidnight - 86_400_000

    const todayCounts = new Array(THROUGHPUT_BUCKETS.length).fill(0)
    const yesterdayCounts = new Array(THROUGHPUT_BUCKETS.length).fill(0)

    for (const fax of allFaxes) {
      const ts = new Date(fax.classifiedAt ?? fax.receivedAt).getTime()

      const ti = toBucketIndex(ts, todayMidnight)
      if (ti >= 0) { todayCounts[ti]++; continue }

      const yi = toBucketIndex(ts, yesterdayMidnight)
      if (yi >= 0) yesterdayCounts[yi]++
    }

    return THROUGHPUT_BUCKETS.map((label, i) => ({
      time: label,
      today: todayCounts[i],
      yesterday: yesterdayCounts[i],
    }))
  }, [allFaxes])

  const kpis = [
    {
      label: "Queue Depth",
      value: metrics.queueDepth.toString(),
      raw: metrics.queueDepth,
      tooltip: "Unfiled faxes that need manual review",
    },
    {
      label: "Auto-File Rate",
      value: `${metrics.autoFileRate}%`,
      raw: metrics.autoFileRate,
      tooltip: "Filed faxes / total faxes",
    },
    {
      label: "SLA Compliance",
      value: `${metrics.slaComplianceRate}%`,
      raw: metrics.slaComplianceRate,
      tooltip: "Completed faxes filed within SLA deadline",
    },
    {
      label: "Avg Processing",
      value: `${metrics.avgProcessingTimeMinutes}m`,
      raw: metrics.avgProcessingTimeMinutes,
      tooltip: "Average time from receipt to classification",
    },
    {
      label: "Processed Today",
      value: metrics.faxesProcessedToday.toString(),
      raw: metrics.faxesProcessedToday,
      tooltip: "Faxes classified since midnight",
    },
    {
      label: "Referrals Today",
      value: metrics.referralsReceivedToday.toString(),
      raw: metrics.referralsReceivedToday,
      tooltip: "Referral faxes received since midnight",
    },
  ]

  // ---- Document type breakdown (real counts against org categories) ----
  const docTypeBreakdown = useMemo(() => {
    if (orgCategories.length === 0 || allFaxes.length === 0)
      return PLACEHOLDER_DOC_TYPES

    // Count faxes per document category
    const typeMap = new Map<string, number>()
    for (const fax of allFaxes) {
      const t = fax.documentCategory || "Unknown"
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1)
    }

    const total = allFaxes.length
    const orgCatSet = new Set(orgCategories)

    // Build entries for every org category (including 0-count ones)
    const entries: { type: string; count: number; percentage: number }[] = []
    for (const cat of orgCategories) {
      const count = typeMap.get(cat) ?? 0
      entries.push({
        type: cat,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      })
    }

    // Collect faxes with categories not in the org's valid list
    let uncategorizedCount = 0
    for (const [cat, count] of typeMap) {
      if (!orgCatSet.has(cat)) {
        uncategorizedCount += count
      }
    }
    if (uncategorizedCount > 0) {
      entries.push({
        type: "Uncategorized",
        count: uncategorizedCount,
        percentage: Math.round((uncategorizedCount / total) * 1000) / 10,
      })
    }

    // Sort by count descending
    return entries.sort((a, b) => b.count - a.count)
  }, [allFaxes, orgCategories])

  // ---- Referral funnel (real or placeholder) ----
  const referralFunnel = useMemo(() => {
    if (allReferrals.length < 3) return PLACEHOLDER_FUNNEL

    const total = allReferrals.length
    const triage = allReferrals.length
    const incomplete = allReferrals.filter(
      (r) =>
        r.status === "incomplete" ||
        r.status === "pending-review" ||
        r.status === "routed-to-cerebrum"
    ).length
    const pendingReview = allReferrals.filter(
      (r) => r.status === "pending-review" || r.status === "routed-to-cerebrum"
    ).length
    const routed = allReferrals.filter(
      (r) => r.status === "routed-to-cerebrum"
    ).length

    return [
      { stage: "Triage", count: triage, percentage: 100 },
      { stage: "Incomplete", count: incomplete, percentage: total > 0 ? Math.round((incomplete / total) * 1000) / 10 : 0 },
      { stage: "Pending Review", count: pendingReview, percentage: total > 0 ? Math.round((pendingReview / total) * 1000) / 10 : 0 },
      { stage: "Routed to Cerebrum", count: routed, percentage: total > 0 ? Math.round((routed / total) * 1000) / 10 : 0 },
    ]
  }, [allReferrals])

  // Always show charts with placeholder data to demonstrate the dashboard
  return (
    <div className="space-y-2">
      <PageHeader title="Dashboard" />

      {/* KPIs */}
      <TooltipProvider delayDuration={0}>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-border border rounded-sm overflow-hidden">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card px-3 py-2 relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 text-muted-foreground/40 hover:text-muted-foreground cursor-help transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{kpi.tooltip}</TooltipContent>
              </Tooltip>
              <p
                className={cn(
                  "font-mono text-xl font-bold tabular-nums leading-none",
                  kpiColor(kpi.label, kpi.raw)
                )}
              >
                {kpi.value}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                {kpi.label}
              </p>
            </div>
          ))}
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {/* Throughput -- line chart with today + yesterday */}
        <Card className="border">
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Fax Throughput
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={throughputData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="time"
                  tick={{
                    fontSize: 10,
                    fontFamily: "var(--font-roboto-mono)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fontFamily: "var(--font-roboto-mono)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  className="text-muted-foreground"
                />
                <RechartsTooltip
                  contentStyle={{
                    fontSize: 12,
                    fontFamily: "var(--font-roboto-mono)",
                    border: "1px solid var(--border)",
                    borderRadius: 0,
                    boxShadow: "none",
                    padding: "6px 10px",
                  }}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Line
                  type="monotone"
                  dataKey="today"
                  name="Today"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--foreground)" }}
                />
                <Line
                  type="monotone"
                  dataKey="yesterday"
                  name="Yesterday"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 3, fill: "var(--muted-foreground)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Document type breakdown — all org categories with real counts */}
        <Card className="border">
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Document Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-0.5">
            {(docCatsExpanded ? docTypeBreakdown : docTypeBreakdown.slice(0, 6)).map((item) => (
              <div
                key={item.type}
                className={cn(
                  "relative h-5 border border-border overflow-hidden",
                  item.count > 0 ? "bg-muted/50" : "bg-muted/20"
                )}
              >
                {item.count > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-foreground/10"
                    style={{ width: `${item.percentage}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between h-full px-2">
                  <span className={cn(
                    "text-[10px] truncate",
                    item.count === 0 && "text-muted-foreground"
                  )}>
                    {item.type}
                  </span>
                  <span className={cn(
                    "font-mono text-[10px] font-bold tabular-nums ml-2",
                    item.count === 0 && "text-muted-foreground"
                  )}>
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
            {docTypeBreakdown.length > 6 && (
              <button
                onClick={() => setDocCatsExpanded((v) => !v)}
                className="w-full text-[10px] text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                {docCatsExpanded
                  ? `Show less`
                  : `+${docTypeBreakdown.length - 6} more`}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Referral funnel */}
        <Card className="border">
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Referral Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-1.5">
              {referralFunnel.map((stage, index) => {
                const conversionRate =
                  index > 0 && referralFunnel[index - 1].count > 0
                    ? Math.round(
                        (stage.count / referralFunnel[index - 1].count) * 100
                      )
                    : 100

                const convColor =
                  conversionRate < 75
                    ? "text-red-700"
                    : conversionRate < 90
                      ? "text-amber-700"
                      : "text-muted-foreground"

                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tabular-nums">
                          {stage.count}
                        </span>
                        {index > 0 && (
                          <span
                            className={cn(
                              "font-mono text-[10px] tabular-nums",
                              convColor
                            )}
                          >
                            {conversionRate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-4 bg-muted/50 border border-border overflow-hidden">
                      <div
                        className="h-full bg-foreground/8 border-l-2 border-foreground flex items-center px-2"
                        style={{ width: `${stage.percentage}%` }}
                      >
                        <span className="font-mono text-[9px] font-bold tabular-nums">
                          {stage.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Staff productivity (always shows placeholder) */}
        <Card className="border">
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Staff Productivity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div>
              <div className="grid grid-cols-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1.5 border-b border-border">
                <span className="col-span-2">Staff</span>
                <span className="text-right">Processed</span>
                <span className="text-right">Avg</span>
                <span className="text-right">SLA</span>
              </div>
              {PLACEHOLDER_STAFF.map((staff) => (
                <div
                  key={staff.staffName}
                  className="grid grid-cols-5 text-xs py-1.5 border-b border-border last:border-0"
                >
                  <div className="col-span-2">
                    <p className="font-medium truncate">{staff.staffName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {staff.role}
                    </p>
                  </div>
                  <span className="text-right font-mono font-bold tabular-nums self-center">
                    {staff.faxesProcessed}
                  </span>
                  <span
                    className={cn(
                      "text-right font-mono tabular-nums self-center",
                      staff.avgTimePerFaxMinutes > 4
                        ? "text-amber-700"
                        : "text-muted-foreground"
                    )}
                  >
                    {staff.avgTimePerFaxMinutes}m
                  </span>
                  <span
                    className={cn(
                      "text-right font-mono font-bold tabular-nums self-center",
                      staff.slaComplianceRate >= 97
                        ? "text-emerald-700"
                        : staff.slaComplianceRate >= 95
                          ? "text-amber-700"
                          : "text-red-700"
                    )}
                  >
                    {staff.slaComplianceRate}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
