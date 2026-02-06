/**
 * Skeleton affiché immédiatement lors du chargement de la page paramètres.
 * Évite un écran blanc pendant le chargement des données.
 */
export default function SettingsLoading() {
  return (
    <div className="w-full animate-pulse space-y-6" role="status" aria-label="Chargement des paramètres">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-10 w-40 rounded-lg bg-gray-200/80" />
        <div className="h-4 w-80 rounded bg-gray-200/80" />
      </div>

      {/* Settings sections */}
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-6 space-y-4">
            <div className="h-6 w-48 rounded bg-gray-200/80" />
            <div className="h-4 w-full max-w-md rounded bg-gray-200/80" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-10 rounded-lg bg-gray-200/80" />
              <div className="h-10 rounded-lg bg-gray-200/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
