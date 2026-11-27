/**
 * Image de couverture d'un article : l'image choisie dans le super-admin, ou
 * à défaut une couverture générée (titre + catégorie aux couleurs EduZen,
 * route /blog/cover/[slug]). Sert aux cartes du blog, à Open Graph et au JSON-LD.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.eduzen.io'

export function blogCoverUrl(
  post: { slug?: string | null; featured_image_url?: string | null },
  { absolute = false }: { absolute?: boolean } = {}
): string | null {
  if (post.featured_image_url) return post.featured_image_url
  if (!post.slug) return null
  const path = `/blog/cover/${encodeURIComponent(post.slug)}`
  return absolute ? `${SITE_URL}${path}` : path
}
