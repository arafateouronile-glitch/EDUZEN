/**
 * Skeleton affiché immédiatement lors du chargement de la page étudiants.
 * Évite un écran blanc pendant le chargement des données.
 */
export default function StudentsLoading() {
  return (
    <div className="w-full animate-pulse space-y-6" role="status" aria-label="Chargement des étudiants">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-10 w-48 rounded-lg bg-gray-200/80" />
          <div className="h-4 w-64 rounded bg-gray-200/80" />
        </div>
        <div className="h-12 w-44 rounded-xl bg-gray-200/80" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-200/80" />
        ))}
      </div>

      {/* Search and filters */}
      <div className="h-14 rounded-xl bg-gray-200/80" />

      {/* Table skeleton */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="h-12 bg-gray-100/80" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-16 border-t bg-gray-200/40" />
        ))}
      </div>
    </div>
  )
}
