/**
 * Certains navigateurs (Brave Shields, Safari ITP...) bloquent silencieusement
 * les <iframe> pointant vers un domaine tiers comme *.supabase.co, même quand
 * une navigation directe vers ce même lien fonctionne. On fait donc transiter
 * les fichiers Storage publics par notre propre domaine via /api/elearning/file-proxy
 * pour que l'iframe reste same-origin.
 */
export function toProxiedFileUrl(url: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  if (!url || !supabaseUrl) return url
  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/`
  if (!url.startsWith(prefix)) return url
  return `/api/elearning/file-proxy?url=${encodeURIComponent(url)}`
}
