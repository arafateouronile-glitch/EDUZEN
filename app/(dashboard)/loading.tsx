/**
 * Skeleton affiché immédiatement lors du changement de page dashboard (Server Component).
 * Évite un écran vide pendant le chargement du chunk JS et des données.
 */
export default function DashboardLoading() {
  return (
    <div className="w-full animate-pulse space-y-4" role="status" aria-label="Chargement">
      <div className="h-8 w-48 rounded-lg bg-gray-200/80 dark:bg-gray-700/50" />
      <div className="space-y-3">
        <div className="h-4 w-full max-w-xl rounded bg-gray-200/80 dark:bg-gray-700/50" />
        <div className="h-4 w-3/4 max-w-lg rounded bg-gray-200/80 dark:bg-gray-700/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200/80 dark:bg-gray-700/50" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-gray-200/80 dark:bg-gray-700/50" />
    </div>
  )
}
