'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Premium shimmer animation component
 */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    </div>
  )
}

/**
 * Skeleton loader générique premium pour les sections
 */
export function SkeletonLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Premium Header Skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 via-white to-slate-50 border border-slate-100 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-7 w-2/3 bg-slate-200/80 rounded-xl animate-pulse">
              <Shimmer className="h-full w-full" />
            </div>
            <div className="h-4 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-brand-blue/20 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-6 w-16 bg-slate-200/80 rounded-lg animate-pulse">
                  <Shimmer className="h-full w-full" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-blue via-brand-cyan to-brand-blue" />

        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-slate-200/80 rounded-lg animate-pulse">
                <Shimmer className="h-full w-full" />
              </div>
              <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="h-11 w-full bg-slate-50 rounded-xl border border-slate-100 animate-pulse" />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-slate-200/80 rounded animate-pulse" />
                      <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </div>

      {/* Secondary Card Skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-cyan to-brand-purple" />

        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-cyan/10 rounded-xl animate-pulse" />
            <div className="h-5 w-36 bg-slate-200/80 rounded-lg animate-pulse" />
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${100 - i * 15}%` }} />
            ))}
          </div>
        </CardContent>
      </div>
    </motion.div>
  )
}

/**
 * Skeleton loader premium pour les listes d'items
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-slate-200/80 rounded-lg animate-pulse">
              <Shimmer className="h-full w-full" />
            </div>
            <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader premium pour les tableaux
 */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
      {/* Header */}
      <div
        className="grid gap-4 px-4 py-3 bg-slate-50/80 border-b border-slate-100"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, index) => (
          <div key={index} className="h-4 bg-slate-200/60 rounded animate-pulse" style={{ width: '75%' }} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: rowIndex * 0.05 }}
          className="grid gap-4 px-4 py-4 border-b border-slate-50 last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-slate-100 rounded animate-pulse"
              style={{ width: `${70 + Math.random() * 30}%` }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader premium pour les statistiques (cards)
 */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="relative overflow-hidden border-slate-100">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-xl -mr-10 -mt-10" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-8 w-20 bg-slate-200/80 rounded-lg mb-2 animate-pulse">
                <Shimmer className="h-full w-full" />
              </div>
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader premium pour les formulaires
 */
export function SkeletonForm() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="relative overflow-hidden border-slate-100">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-blue to-brand-cyan" />

        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl animate-pulse" />
            <div className="h-6 w-48 bg-slate-200/80 rounded-lg animate-pulse">
              <Shimmer className="h-full w-full" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              key={index}
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
              <div className="h-11 w-full bg-slate-50 rounded-xl border border-slate-100 animate-pulse" />
            </motion.div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-brand-blue/20 rounded-xl animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
