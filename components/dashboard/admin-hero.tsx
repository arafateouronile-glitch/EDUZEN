'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import {
  LayoutDashboard,
  Plus,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Euro,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminHeroKPI {
  label: string
  value: string | number
  /** Positive/negative movement vs previous period */
  trend?: 'up' | 'down' | 'neutral'
  /** Short label shown next to trend arrow, e.g. "+8%" */
  trendValue?: string
  icon: React.ReactNode
  /** Tailwind text-color class for the icon accent (e.g. "text-indigo-500") */
  accent?: string
  /** CSS color value for the bottom hover line (e.g. "#6366f1") */
  accentColor?: string
  /** Optional "tag" badge displayed alongside the label */
  badge?: string
  /** Makes the entire cell a clickable link */
  href?: string
  loading?: boolean
}

export interface AdminHeroProps {
  /** Authenticated user's full name */
  userName?: string
  /** Organisation name shown in breadcrumb */
  orgName?: string
  /** 4 KPI cells rendered in the stat bar */
  kpis?: AdminHeroKPI[]
  /** Replaces the whole KPI bar with skeletons */
  loadingKPIs?: boolean
  className?: string
}

// ─── Default / placeholder KPIs ───────────────────────────────────────────────

const PLACEHOLDER_KPIS: AdminHeroKPI[] = [
  {
    label: 'CA du mois',
    value: '—',
    icon: <Euro className="h-4 w-4" />,
    accent: 'text-indigo-500',
    accentColor: '#6366f1',
    href: '/dashboard/financial-reports',
  },
  {
    label: 'Apprenants actifs',
    value: '—',
    icon: <Users className="h-4 w-4" />,
    accent: 'text-emerald-500',
    accentColor: '#10b981',
    href: '/dashboard/students',
  },
  {
    label: 'Conformité Qualiopi',
    value: '—',
    icon: <CheckCircle2 className="h-4 w-4" />,
    accent: 'text-sky-500',
    accentColor: '#0ea5e9',
    badge: 'Qualiopi',
  },
  {
    label: 'Dossiers en attente',
    value: '—',
    icon: <AlertCircle className="h-4 w-4" />,
    accent: 'text-amber-500',
    accentColor: '#f59e0b',
  },
]

// ─── AdminHero ────────────────────────────────────────────────────────────────

export function AdminHero({
  userName,
  orgName,
  kpis = PLACEHOLDER_KPIS,
  loadingKPIs = false,
  className,
}: AdminHeroProps) {
  const [dateLabel, setDateLabel] = useState<string>('')

  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    )
  }, [])

  const firstName = userName?.split(' ')[0] || 'Admin'

  return (
    <div className={cn('space-y-0', className)}>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-3 pb-5 border-b border-slate-200"
      >
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/dashboard"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <LayoutDashboard className="h-3 w-3" />
                {orgName ?? 'Mon centre'}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-medium text-slate-600">
                Dashboard
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left – title + greeting */}
          <div className="min-w-0">
            <h1 className="text-[1.6rem] font-semibold tracking-tight text-slate-900 leading-none">
              Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 leading-snug">
              Bonjour{' '}
              <span className="font-medium text-slate-800">{firstName}</span>,
              voici l'état de votre centre
              {dateLabel && (
                <>
                  {' '}
                  <span className="capitalize text-slate-600">{dateLabel}</span>
                </>
              )}
              .
            </p>
          </div>

          {/* Right – CTA buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-sm border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors rounded-lg"
              asChild
            >
              <Link href="/dashboard/documents/generate">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Générer un document</span>
                <span className="sm:hidden">Document</span>
              </Link>
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-sm bg-brand-blue hover:bg-brand-blue-dark text-white shadow-sm shadow-brand-blue/25 transition-all rounded-lg"
              asChild
            >
              <Link href="/dashboard/programs">
                <Plus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Créer une formation</span>
                <span className="sm:hidden">Créer</span>
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Bar ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
      >
        {loadingKPIs
          ? Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} index={i} />)
          : kpis.slice(0, 4).map((kpi, i) => <KPICell key={i} kpi={kpi} index={i} />)}
      </motion.div>
    </div>
  )
}

// ─── KPI Cell ─────────────────────────────────────────────────────────────────

// Grid dividers: replicate a table border without broken divide-* on grid
// Mobile = 2-col  |  Desktop lg = 4-col single row
const CELL_BORDERS = [
  'border-r border-b border-slate-200 lg:border-b-0',           // 0
  'border-b border-slate-200 lg:border-b-0 lg:border-r lg:border-slate-200', // 1
  'border-r border-slate-200',                                    // 2
  '',                                                              // 3
] as const

function KPICell({ kpi, index }: { kpi: AdminHeroKPI; index: number }) {
  const inner = (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative flex flex-col gap-2.5 p-4',
        CELL_BORDERS[index] ?? '',
        kpi.href && 'cursor-pointer'
      )}
    >
      {/* Row: icon + label + badge/arrow */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              'shrink-0 opacity-60 group-hover:opacity-100 transition-opacity',
              kpi.accent ?? 'text-slate-400'
            )}
          >
            {kpi.icon}
          </span>
          <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors truncate">
            {kpi.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {kpi.badge && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 border-slate-200 text-slate-400 font-normal"
            >
              {kpi.badge}
            </Badge>
          )}
          {kpi.href && (
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Row: value + trend pill */}
      <div className="flex items-end gap-2">
        <span
          className={cn(
            'text-xl font-bold tracking-tight leading-none',
            kpi.value === '—' ? 'text-slate-300' : 'text-slate-900'
          )}
        >
          {kpi.value}
        </span>

        {kpi.trendValue && kpi.trend && kpi.trend !== 'neutral' && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-1.5 py-0.5 mb-0.5',
              kpi.trend === 'up' && 'text-emerald-700 bg-emerald-50',
              kpi.trend === 'down' && 'text-red-600 bg-red-50'
            )}
          >
            {kpi.trend === 'up' ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5" />
            )}
            {kpi.trendValue}
          </span>
        )}
      </div>

      {/* Hover accent line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: kpi.accentColor ?? '#6366f1' }}
      />
    </motion.div>
  )

  if (kpi.href) {
    return (
      <Link href={kpi.href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset">
        {inner}
      </Link>
    )
  }

  return inner
}

// ─── KPI Skeleton ─────────────────────────────────────────────────────────────

function KPISkeleton({ index }: { index: number }) {
  return (
    <div className={cn('flex flex-col gap-2.5 p-4', CELL_BORDERS[index] ?? '')}>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  )
}
