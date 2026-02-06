/**
 * Skeleton affiché immédiatement lors du chargement de la page sessions.
 * Évite un écran blanc pendant le chargement des données.
 */
export default function SessionsLoading() {
  return (
    <div className="w-full animate-pulse space-y-6" role="status" aria-label="Chargement des sessions">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-10 w-40 rounded-lg bg-gray-200/80" />
          <div className="h-4 w-72 rounded bg-gray-200/80" />
        </div>
        <div className="h-12 w-40 rounded-xl bg-gray-200/80" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-200/80" />
        ))}
      </div>

      {/* Search and filters */}
      <div className="h-16 rounded-xl bg-gray-200/80" />

      {/* Session cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-80 rounded-2xl bg-gray-200/80" />
        ))}
      </div>
    </div>
  )
}
