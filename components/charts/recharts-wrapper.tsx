'use client'

/**
 * Wrapper pour Recharts avec lazy loading
 * Permet de charger recharts uniquement quand nécessaire
 */

import dynamic from 'next/dynamic'
import type React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load tous les composants recharts
// Utilisation de 'any' pour les props car recharts a ses propres types complexes
export const RechartsLineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart as any })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

export const RechartsLine = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line as any })),
  { ssr: false }
)

export const RechartsBarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart as any })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

export const RechartsBar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar as any })),
  { ssr: false }
)

export const RechartsPieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart as any })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
) as React.ComponentType<{ children: React.ReactNode; className?: string }>

export const RechartsPie = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Pie as any })),
  { ssr: false }
)

export const RechartsCell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell as any })),
  { ssr: false }
)

export const RechartsXAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis as any })),
  { ssr: false }
)

export const RechartsYAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis as any })),
  { ssr: false }
)

export const RechartsCartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid as any })),
  { ssr: false }
)

export const RechartsTooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip as any })),
  { ssr: false }
)

export const RechartsLegend = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Legend as any })),
  { ssr: false }
)

export const RechartsResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer as any })),
  { ssr: false }
) as React.ComponentType<{ children: React.ReactNode; width: string | number; height: string | number; className?: string }>

export const RechartsArea = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Area as any })),
  { ssr: false }
)

export const RechartsAreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart as any })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

export const RechartsSector = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Sector as any })),
  { ssr: false }
)
