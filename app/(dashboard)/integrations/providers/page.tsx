'use client'

import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { PageHeader } from '@/components/shared/page-header'
import { TablePagination } from '@/components/shared/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/shared/search-bar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { simulatedReferralsAtom } from '@/atoms/simulation'
import { Referral } from '@/types/referral'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format'
import {
  Stethoscope,
  CheckCircle2,
  ExternalLink,
  Eye,
  AlertTriangle,
  FileText,
  Clock,
  Building2,
  Users,
  ChevronRight,
} from 'lucide-react'

// --- Data layer: derive provider and clinic metrics from referrals ---

interface ProviderMetrics {
  id: string
  name: string
  clinic: string
  city: string
  specialty: string
  totalReferrals: number
  completenessScore: number
  missingInfoRate: number
  avgDocumentsPerReferral: number
  lastReferralDate: string
  providerScore: number
  referralIds: string[]
}

interface ClinicMetrics {
  id: string
  name: string
  city: string
  providers: ProviderMetrics[]
  totalReferrals: number
  avgProviderScore: number
  avgCompleteness: number
  missingInfoRate: number
  lastReferralDate: string
}

type ScoreTier = 'excellent' | 'good' | 'fair' | 'poor'

function getScoreTier(score: number): ScoreTier {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

const SCORE_CONFIG: Record<
  ScoreTier,
  { label: string; className: string }
> = {
  excellent: {
    label: 'Excellent',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  good: {
    label: 'Good',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  fair: {
    label: 'Fair',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  poor: {
    label: 'Poor',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

// Infer specialty from clinic name / conditions when not explicit
function inferSpecialty(ref: Referral): string {
  const clinic = (ref.clinicName ?? '').toLowerCase()
  if (clinic.includes('ed') || clinic.includes('emergency'))
    return 'Emergency Medicine'
  if (clinic.includes('internal')) return 'Internal Medicine'
  return 'Family Medicine'
}

function buildClinicMetrics(referrals: Referral[]): ClinicMetrics[] {
  // First build provider metrics
  const providerMap = new Map<
    string,
    {
      name: string
      clinic: string
      city: string
      specialty: string
      referrals: Referral[]
    }
  >()

  for (const ref of referrals) {
    const key = ref.referringPhysicianId
    if (!providerMap.has(key)) {
      providerMap.set(key, {
        name: ref.referringPhysicianName,
        clinic: ref.clinicName ?? '',
        city: ref.clinicCity ?? '',
        specialty: inferSpecialty(ref),
        referrals: [],
      })
    }
    providerMap.get(key)!.referrals.push(ref)
  }

  const providers: ProviderMetrics[] = []

  for (const [id, data] of providerMap) {
    const { referrals } = data
    const totalReferrals = referrals.length

    const avgCompleteness =
      referrals.reduce((sum, r) => sum + r.completenessScore, 0) /
      totalReferrals

    const withMissingItems = referrals.filter(
      (r) => r.completenessItems.some((ci) => ci.required && ci.status === 'missing')
    ).length
    const missingInfoRate = (withMissingItems / totalReferrals) * 100

    const avgDocs =
      referrals.reduce((sum, r) => sum + r.documents.length, 0) /
      totalReferrals

    const lastDate = referrals.reduce((latest, r) => {
      const d = new Date(r.receivedDate).getTime()
      return d > latest ? d : latest
    }, 0)

    const completenessComponent = avgCompleteness * 0.5
    const missingComponent = (100 - missingInfoRate) * 0.3
    const volumeBonus = Math.min(totalReferrals * 10, 20)
    const providerScore = Math.round(
      Math.min(
        100,
        completenessComponent + missingComponent + volumeBonus
      )
    )

    providers.push({
      id,
      name: data.name,
      clinic: data.clinic,
      city: data.city,
      specialty: data.specialty,
      totalReferrals,
      completenessScore: Math.round(avgCompleteness),
      missingInfoRate: Math.round(missingInfoRate),
      avgDocumentsPerReferral: Math.round(avgDocs * 10) / 10,
      lastReferralDate: new Date(lastDate).toISOString(),
      providerScore,
      referralIds: referrals.map((r) => r.id),
    })
  }

  // Group providers by clinic
  const clinicMap = new Map<string, ProviderMetrics[]>()
  for (const provider of providers) {
    const clinicKey = provider.clinic || 'Unknown Clinic'
    if (!clinicMap.has(clinicKey)) {
      clinicMap.set(clinicKey, [])
    }
    clinicMap.get(clinicKey)!.push(provider)
  }

  // Build clinic metrics
  const clinics: ClinicMetrics[] = []
  for (const [clinicName, clinicProviders] of clinicMap) {
    // Sort providers within clinic by score descending
    clinicProviders.sort((a, b) => b.providerScore - a.providerScore)

    const totalReferrals = clinicProviders.reduce((s, p) => s + p.totalReferrals, 0)
    const avgProviderScore = Math.round(
      clinicProviders.reduce((s, p) => s + p.providerScore, 0) / clinicProviders.length
    )
    const avgCompleteness = Math.round(
      clinicProviders.reduce((s, p) => s + p.completenessScore, 0) / clinicProviders.length
    )

    // Calculate missing info rate at clinic level
    const providersWithMissing = clinicProviders.filter(p => p.missingInfoRate > 0).length
    const missingInfoRate = Math.round((providersWithMissing / clinicProviders.length) * 100)

    const lastReferralDate = clinicProviders.reduce((latest, p) => {
      const d = new Date(p.lastReferralDate).getTime()
      return d > latest ? d : latest
    }, 0)

    clinics.push({
      id: clinicName.toLowerCase().replace(/\s+/g, '-'),
      name: clinicName,
      city: clinicProviders[0]?.city || '',
      providers: clinicProviders,
      totalReferrals,
      avgProviderScore,
      avgCompleteness,
      missingInfoRate,
      lastReferralDate: new Date(lastReferralDate).toISOString(),
    })
  }

  // Sort clinics by average score descending
  clinics.sort((a, b) => b.avgProviderScore - a.avgProviderScore)
  return clinics
}

// --- Filters ---

type ScoreFilter = 'all' | ScoreTier
type SpecialtyFilter = 'all' | string
type ViewMode = 'clinics' | 'providers'

export default function ProvidersFeedPage() {
  const referrals = useAtomValue(simulatedReferralsAtom)
  const allClinics = useMemo(() => buildClinicMetrics(referrals), [referrals])

  const [viewMode, setViewMode] = useState<ViewMode>('clinics')
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all')
  const [specialtyFilter, setSpecialtyFilter] =
    useState<SpecialtyFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderMetrics | null>(null)
  const [expandedClinics, setExpandedClinics] = useState<string[]>([])

  // All providers flattened (for specialty filter options)
  const allProviders = useMemo(() =>
    allClinics.flatMap(c => c.providers),
    [allClinics]
  )

  // Unique specialties
  const specialties = useMemo(() => {
    const set = new Set(allProviders.map((p) => p.specialty))
    return Array.from(set).sort()
  }, [allProviders])

  // KPIs
  const kpis = useMemo(() => {
    const totalClinics = allClinics.length
    const totalProviders = allProviders.length
    const avgScore =
      totalProviders > 0
        ? Math.round(
            allProviders.reduce((s, p) => s + p.providerScore, 0) / totalProviders
          )
        : 0
    const needsAttention = allProviders.filter(
      (p) => p.providerScore < 70
    ).length
    const totalReferrals = allProviders.reduce(
      (s, p) => s + p.totalReferrals,
      0
    )
    return { totalClinics, totalProviders, avgScore, needsAttention, totalReferrals }
  }, [allClinics, allProviders])

  // Filtered clinics (filter both clinic names and provider names)
  const filtered = useMemo(() => {
    let clinics = allClinics

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      clinics = clinics.map(clinic => {
        // Filter providers within clinic
        const matchingProviders = clinic.providers.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.clinic.toLowerCase().includes(q) ||
            p.city.toLowerCase().includes(q)
        )
        // Include clinic if name matches or any provider matches
        const clinicMatches = clinic.name.toLowerCase().includes(q) ||
          clinic.city.toLowerCase().includes(q)

        if (clinicMatches) return clinic
        if (matchingProviders.length > 0) {
          return { ...clinic, providers: matchingProviders }
        }
        return null
      }).filter((c): c is ClinicMetrics => c !== null)
    }

    if (scoreFilter !== 'all') {
      clinics = clinics.map(clinic => {
        const matchingProviders = clinic.providers.filter(
          (p) => getScoreTier(p.providerScore) === scoreFilter
        )
        if (matchingProviders.length > 0) {
          return { ...clinic, providers: matchingProviders }
        }
        return null
      }).filter((c): c is ClinicMetrics => c !== null)
    }

    if (specialtyFilter !== 'all') {
      clinics = clinics.map(clinic => {
        const matchingProviders = clinic.providers.filter(
          (p) => p.specialty === specialtyFilter
        )
        if (matchingProviders.length > 0) {
          return { ...clinic, providers: matchingProviders }
        }
        return null
      }).filter((c): c is ClinicMetrics => c !== null)
    }

    return clinics
  }, [allClinics, searchQuery, scoreFilter, specialtyFilter])

  const resetPage = () => setCurrentPage(1)

  // Paginate clinics
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Count total filtered providers
  const totalFilteredProviders = useMemo(() =>
    filtered.reduce((s, c) => s + c.providers.length, 0),
    [filtered]
  )

  // Flat filtered providers list (for providers view mode)
  const filteredProviders = useMemo(() => {
    return filtered.flatMap(c => c.providers)
  }, [filtered])

  // Paginate providers (for providers view mode)
  const paginatedProviders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProviders.slice(start, start + pageSize)
  }, [filteredProviders, currentPage, pageSize])

  return (
    <div className="space-y-2">
      <PageHeader
        title="Providers (Salesforce)"
        description="Referring physician CRM — data quality scores from referral history"
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
            Clinics
          </p>
          <p className="font-mono text-lg font-bold tabular-nums leading-tight">
            {kpis.totalClinics}
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Providers
          </p>
          <p className="font-mono text-lg font-bold tabular-nums leading-tight">
            {kpis.totalProviders}
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Avg Score
          </p>
          <p
            className={cn(
              'font-mono text-lg font-bold tabular-nums leading-tight',
              kpis.avgScore >= 70
                ? 'text-emerald-700'
                : 'text-amber-700'
            )}
          >
            {kpis.avgScore}
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Needs Attention
          </p>
          <p
            className={cn(
              'font-mono text-lg font-bold tabular-nums leading-tight',
              kpis.needsAttention > 0
                ? 'text-amber-700'
                : 'text-foreground'
            )}
          >
            {kpis.needsAttention}
          </p>
        </div>
        <div className="bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Total Referrals
          </p>
          <p className="font-mono text-lg font-bold tabular-nums leading-tight">
            {kpis.totalReferrals}
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-sm p-0.5">
          <Button
            variant={viewMode === 'clinics' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setViewMode('clinics'); resetPage() }}
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <Building2 className="h-3 w-3" />
            Clinics
          </Button>
          <Button
            variant={viewMode === 'providers' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setViewMode('providers'); resetPage() }}
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <Stethoscope className="h-3 w-3" />
            Providers
          </Button>
        </div>

        <SearchBar
          value={searchQuery}
          onChange={(v) => {
            setSearchQuery(v)
            resetPage()
          }}
          placeholder="Search clinic, provider, city..."
          aria-label="Search providers"
        />

        <Select
          value={scoreFilter}
          onValueChange={(v) => {
            setScoreFilter(v as ScoreFilter)
            resetPage()
          }}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="excellent">Excellent</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={specialtyFilter}
          onValueChange={(v) => {
            setSpecialtyFilter(v as SpecialtyFilter)
            resetPage()
          }}
        >
          <SelectTrigger className="w-[170px] h-8 text-xs">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {viewMode === 'clinics'
            ? `${filtered.length} clinic${filtered.length !== 1 ? 's' : ''}`
            : `${totalFilteredProviders} provider${totalFilteredProviders !== 1 ? 's' : ''}`
          }
        </span>
      </div>

      {/* Main Content - Clinics or Providers view */}
      <div className="border rounded-sm">
        {viewMode === 'clinics' ? (
          // Clinic Accordions
          paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">
                {allClinics.length === 0 ? 'No clinic data yet' : 'No clinics match your filters'}
              </p>
              <p className="text-xs">
                {allClinics.length === 0 ? 'Clinic data will appear as referrals are processed' : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={expandedClinics}
              onValueChange={setExpandedClinics}
              className="divide-y"
            >
              {paginated.map((clinic) => {
                const clinicTier = getScoreTier(clinic.avgProviderScore)
                const clinicScoreCfg = SCORE_CONFIG[clinicTier]

                return (
                  <AccordionItem
                    key={clinic.id}
                    value={clinic.id}
                    className="border-0"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline [&[data-state=open]]:bg-muted/30">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Clinic icon */}
                        <div className="h-9 w-9 rounded-sm bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {/* Clinic name & city */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">
                            {clinic.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {clinic.city || 'Unknown City'}
                          </p>
                        </div>

                        {/* Provider count */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-mono tabular-nums">
                            {clinic.providers.length}
                          </span>
                          <span className="hidden sm:inline">
                            provider{clinic.providers.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Referral count */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="font-mono tabular-nums">
                            {clinic.totalReferrals}
                          </span>
                          <span className="hidden sm:inline">referrals</span>
                        </div>

                        {/* Avg score badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] h-5 shrink-0',
                            clinicScoreCfg.className
                          )}
                        >
                          {clinic.avgProviderScore}
                          <span className="ml-1 font-normal hidden sm:inline">
                            {clinicScoreCfg.label}
                          </span>
                        </Badge>

                        {/* Missing info indicator */}
                        {clinic.missingInfoRate > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 shrink-0"
                          >
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            {clinic.missingInfoRate}%
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-0">
                      <div className="divide-y border-t bg-muted/20">
                        {clinic.providers.map((provider) => {
                          const tier = getScoreTier(provider.providerScore)
                          const scoreCfg = SCORE_CONFIG[tier]

                          return (
                            <div
                              key={provider.id}
                              className="flex items-center gap-4 px-4 py-2.5 pl-[68px] hover:bg-muted/50 cursor-pointer group"
                              onClick={() => setSelectedProvider(provider)}
                            >
                              {/* Provider icon */}
                              <div className="h-7 w-7 rounded-full bg-background border flex items-center justify-center shrink-0">
                                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>

                              {/* Provider name & specialty */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {provider.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {provider.specialty}
                                </p>
                              </div>

                              {/* Referral count */}
                              <div className="text-xs text-muted-foreground shrink-0">
                                <span className="font-mono tabular-nums">
                                  {provider.totalReferrals}
                                </span>
                                <span className="ml-1 hidden sm:inline">referrals</span>
                              </div>

                              {/* Completeness */}
                              <div className="text-xs text-muted-foreground shrink-0 hidden md:block">
                                <span className="font-mono tabular-nums">
                                  {provider.completenessScore}%
                                </span>
                                <span className="ml-1">complete</span>
                              </div>

                              {/* Score badge */}
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] h-5 shrink-0',
                                  scoreCfg.className
                                )}
                              >
                                {provider.providerScore}
                                <span className="ml-1 font-normal hidden sm:inline">
                                  {scoreCfg.label}
                                </span>
                              </Badge>

                              {/* Missing info */}
                              {provider.missingInfoRate > 0 && (
                                <span className="text-xs font-mono tabular-nums text-amber-700 shrink-0">
                                  {provider.missingInfoRate}% missing
                                </span>
                              )}

                              {/* Last referral */}
                              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 hidden lg:block">
                                {formatRelativeTime(provider.lastReferralDate)}
                              </span>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedProvider(provider)
                                  }}
                                  title="View details"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  asChild
                                  title="Open in Salesforce"
                                >
                                  <a
                                    href={`https://salesforce.example.com/provider/${provider.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )
        ) : (
          // Flat Providers List
          paginatedProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Stethoscope className="h-8 w-8 opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">
                {allProviders.length === 0 ? 'No provider data yet' : 'No providers match your filters'}
              </p>
              <p className="text-xs">
                {allProviders.length === 0 ? 'Provider data will appear as referrals are processed' : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedProviders.map((provider) => {
                const tier = getScoreTier(provider.providerScore)
                const scoreCfg = SCORE_CONFIG[tier]

                return (
                  <div
                    key={provider.id}
                    className="flex items-center gap-4 px-4 py-2.5 hover:bg-muted/50 cursor-pointer group"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    {/* Provider icon */}
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Provider name & clinic */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {provider.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {provider.clinic} · {provider.specialty}
                      </p>
                    </div>

                    {/* Referral count */}
                    <div className="text-xs text-muted-foreground shrink-0">
                      <span className="font-mono tabular-nums">
                        {provider.totalReferrals}
                      </span>
                      <span className="ml-1 hidden sm:inline">referrals</span>
                    </div>

                    {/* Completeness */}
                    <div className="text-xs text-muted-foreground shrink-0 hidden md:block">
                      <span className="font-mono tabular-nums">
                        {provider.completenessScore}%
                      </span>
                      <span className="ml-1">complete</span>
                    </div>

                    {/* Score badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] h-5 shrink-0',
                        scoreCfg.className
                      )}
                    >
                      {provider.providerScore}
                      <span className="ml-1 font-normal hidden sm:inline">
                        {scoreCfg.label}
                      </span>
                    </Badge>

                    {/* Missing info */}
                    {provider.missingInfoRate > 0 && (
                      <span className="text-xs font-mono tabular-nums text-amber-700 shrink-0">
                        {provider.missingInfoRate}% missing
                      </span>
                    )}

                    {/* Last referral */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 hidden lg:block">
                      {formatRelativeTime(provider.lastReferralDate)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedProvider(provider)
                        }}
                        title="View details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        asChild
                        title="Open in Salesforce"
                      >
                        <a
                          href={`https://salesforce.example.com/provider/${provider.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      <TablePagination
        totalItems={viewMode === 'clinics' ? filtered.length : filteredProviders.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          resetPage()
        }}
      />

      {/* Provider Detail Dialog */}
      <ProviderDetailDialog
        provider={selectedProvider}
        open={selectedProvider !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProvider(null)
        }}
        allReferrals={referrals}
      />
    </div>
  )
}

// --- Provider Detail Dialog ---

function ProviderDetailDialog({
  provider,
  open,
  onOpenChange,
  allReferrals,
}: {
  provider: ProviderMetrics | null
  open: boolean
  onOpenChange: (open: boolean) => void
  allReferrals: Referral[]
}) {
  if (!provider) return null

  const tier = getScoreTier(provider.providerScore)
  const scoreCfg = SCORE_CONFIG[tier]

  // Get the actual referrals for this provider
  const referrals = allReferrals.filter((r) =>
    provider.referralIds.includes(r.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            {provider.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Provider Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Clinic
              </p>
              <p className="text-sm">{provider.clinic}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                City
              </p>
              <p className="text-sm">{provider.city}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Specialty
              </p>
              <p className="text-sm">{provider.specialty}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Provider Score
              </p>
              <Badge
                variant="outline"
                className={cn('text-[10px] h-5', scoreCfg.className)}
              >
                {provider.providerScore} {scoreCfg.label}
              </Badge>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-px bg-border border rounded-sm overflow-hidden">
            <div className="bg-card px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Referrals
              </p>
              <p className="font-mono text-sm font-bold tabular-nums">
                {provider.totalReferrals}
              </p>
            </div>
            <div className="bg-card px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Completeness
              </p>
              <p className="font-mono text-sm font-bold tabular-nums">
                {provider.completenessScore}%
              </p>
            </div>
            <div className="bg-card px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Missing Info
              </p>
              <p
                className={cn(
                  'font-mono text-sm font-bold tabular-nums',
                  provider.missingInfoRate > 0
                    ? 'text-amber-700'
                    : 'text-foreground'
                )}
              >
                {provider.missingInfoRate}%
              </p>
            </div>
            <div className="bg-card px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Avg Docs
              </p>
              <p className="font-mono text-sm font-bold tabular-nums">
                {provider.avgDocumentsPerReferral}
              </p>
            </div>
          </div>

          {/* Referral List */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Referral History
            </p>
            <div className="rounded-sm border divide-y max-h-[240px] overflow-y-auto">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ref.patientName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {ref.documents.length} doc
                        {ref.documents.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(ref.receivedDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ref.completenessItems.some((ci) => ci.required && ci.status === 'missing') && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Missing Items
                      </Badge>
                    )}
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {ref.completenessScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
