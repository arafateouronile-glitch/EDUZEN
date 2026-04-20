'use client'

/**
 * Wrapper pour Recharts avec lazy loading
 * Permet de charger recharts uniquement quand nécessaire
 */

import dynamic from 'next/dynamic'
import type React from 'react'
import type {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  Line,
  Bar,
  Pie,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load tous les composants recharts avec types exacts
export const RechartsLineChart = dynamic<React.ComponentProps<typeof LineChart>>(
  () => import('recharts').then((mod) => ({ default: mod.LineChart as unknown as React.ComponentType<React.ComponentProps<typeof LineChart>> })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

export const RechartsLine = dynamic<React.ComponentProps<typeof Line>>(
  () => import('recharts').then((mod) => ({ default: mod.Line as unknown as React.ComponentType<React.ComponentProps<typeof Line>> })),
  { ssr: false }
)

export const RechartsBarChart = dynamic<React.ComponentProps<typeof BarChart>>(
  () => import('recharts').then((mod) => ({ default: mod.BarChart as unknown as React.ComponentType<React.ComponentProps<typeof BarChart>> })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

export const RechartsBar = dynamic<React.ComponentProps<typeof Bar>>(
  () => import('recharts').then((mod) => ({ default: mod.Bar as unknown as React.ComponentType<React.ComponentProps<typeof Bar>> })),
  { ssr: false }
)

export const RechartsPieChart = dynamic<React.ComponentProps<typeof PieChart>>(
  () => import('recharts').then((mod) => ({ default: mod.PieChart as unknown as React.ComponentType<React.ComponentProps<typeof PieChart>> })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

export const RechartsPie = dynamic<React.ComponentProps<typeof Pie>>(
  () => import('recharts').then((mod) => ({ default: mod.Pie as unknown as React.ComponentType<React.ComponentProps<typeof Pie>> })),
  { ssr: false }
)

export const RechartsCell = dynamic<React.ComponentProps<typeof Cell>>(
  () => import('recharts').then((mod) => ({ default: mod.Cell as unknown as React.ComponentType<React.ComponentProps<typeof Cell>> })),
  { ssr: false }
)

export const RechartsXAxis = dynamic<React.ComponentProps<typeof XAxis>>(
  () => import('recharts').then((mod) => ({ default: mod.XAxis as unknown as React.ComponentType<React.ComponentProps<typeof XAxis>> })),
  { ssr: false }
)

export const RechartsYAxis = dynamic<React.ComponentProps<typeof YAxis>>(
  () => import('recharts').then((mod) => ({ default: mod.YAxis as unknown as React.ComponentType<React.ComponentProps<typeof YAxis>> })),
  { ssr: false }
)

export const RechartsCartesianGrid = dynamic<React.ComponentProps<typeof CartesianGrid>>(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid as unknown as React.ComponentType<React.ComponentProps<typeof CartesianGrid>> })),
  { ssr: false }
)

export const RechartsTooltip = dynamic<React.ComponentProps<typeof Tooltip>>(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip as unknown as React.ComponentType<React.ComponentProps<typeof Tooltip>> })),
  { ssr: false }
)

export const RechartsLegend = dynamic<React.ComponentProps<typeof Legend>>(
  () => import('recharts').then((mod) => ({ default: mod.Legend as unknown as React.ComponentType<React.ComponentProps<typeof Legend>> })),
  { ssr: false }
)

export const RechartsResponsiveContainer = dynamic<React.ComponentProps<typeof ResponsiveContainer>>(
  () => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer as unknown as React.ComponentType<React.ComponentProps<typeof ResponsiveContainer>> })),
  { ssr: false }
)

export const RechartsArea = dynamic<React.ComponentProps<typeof Area>>(
  () => import('recharts').then((mod) => ({ default: mod.Area as unknown as React.ComponentType<React.ComponentProps<typeof Area>> })),
  { ssr: false }
)

export const RechartsAreaChart = dynamic<React.ComponentProps<typeof AreaChart>>(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart as unknown as React.ComponentType<React.ComponentProps<typeof AreaChart>> })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

export const RechartsSector = dynamic<React.ComponentProps<typeof Sector>>(
  () => import('recharts').then((mod) => ({ default: mod.Sector as unknown as React.ComponentType<React.ComponentProps<typeof Sector>> })),
  { ssr: false }
)
