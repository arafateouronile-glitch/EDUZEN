/** Skeleton pendant le chargement des pages portail entreprise */
export default function EnterpriseLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4" role="status" aria-label="Chargement">
      <div className="h-8 w-48 rounded-lg bg-gray-200/80 dark:bg-gray-700/50" />
      <div className="h-4 w-full max-w-xl rounded bg-gray-200/80 dark:bg-gray-700/50" />
      <div className="h-64 rounded-xl bg-gray-200/80 dark:bg-gray-700/50" />
    </div>
  )
}
