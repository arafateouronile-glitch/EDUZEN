import { cn } from '@/lib/utils'

/**
 * Composant Skeleton pour les états de chargement
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  )
}

/**
 * Skeleton pour les cartes de statistiques
 */
export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl p-6 border-2 border-gray-200 bg-white">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

/**
 * Skeleton pour les graphiques
 */
export function ChartSkeleton() {
  return (
    <div className="rounded-2xl p-6 border-2 border-gray-200 bg-white">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * Skeleton pour les listes
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * Alias pour ListSkeleton (compatibilité)
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return <ListSkeleton count={count} />
}

/**
 * Skeleton pour les grilles Bento
 */
export function SkeletonBentoGrid({ items = 4 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  )
}
