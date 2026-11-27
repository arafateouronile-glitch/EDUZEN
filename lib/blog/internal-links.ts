/**
 * Liens internes des articles de blog : repérage des liens /blog/<slug>
 * vers des articles qui n'existent pas, et réécriture vers l'article actuel.
 */

/** Chemins du site (hors /blog) vers lesquels un article peut pointer */
export const ALLOWED_SITE_PATHS = [
  /^\/$/,
  /^\/outils(\/[a-z0-9-]+)?$/,
  /^\/pour\/[a-z0-9-]+$/,
  /^\/comparatif\/[a-z0-9-]+$/,
  /^\/demo$/,
  /^\/pricing$/,
  /^\/blog$/,
]

/**
 * Anciens slugs (articles renommés ou supprimés) → articles actuels les plus
 * proches, par ordre de préférence (le 2e sert si le 1er est l'article lui-même).
 */
export const BLOG_SLUG_REDIRECTS: Record<string, string[]> = {
  'emargement-numerique-formation-le-guide-complet-pour-passer-au-zero-papier-en-toute-conformite': [
    'emargement-numerique-formation-guide-complet-2026',
    'emargement-numerique-formation-obligations-bonnes-pratiques',
  ],
  'logiciel-qualiopi-pour-organisme-de-formation-le-guide-complet-pour-choisir-et-reussir-votre-conformite': [
    'logiciel-qualiopi-organisme-formation-guide-complet-2025',
    'automatisation-conformite-qualiopi-guide-complet-2026',
  ],
  'logiciel-qualiopi-pour-organisme-de-formation-le-guide-complet-pour-simplifier-votre-conformite': [
    'logiciel-qualiopi-organisme-formation-guide-complet-2025',
    'automatisation-conformite-qualiopi-guide-complet-2026',
  ],
  'automatisation-conformite-qualiopi-le-guide-complet-pour-les-organismes-de-formation': [
    'automatisation-conformite-qualiopi-guide-complet-2026',
    'logiciel-qualiopi-organisme-formation-guide-complet-2025',
  ],
  'facturation-cpf-logiciel-le-guide-complet-pour-les-organismes-de-formation': [
    'facturation-cpf-logiciel-guide-complet-pour-of-2025',
  ],
  'logiciel-pour-organisme-de-formation-le-guide-complet-pour-choisir-en-2026': [
    'logiciel-pour-organisme-de-formation-guide-complet-2026',
    'logiciel-formation-2026-guide-complet-pour-choisir',
  ],
  'logiciel-gestion-organisme-de-formation': [
    'logiciel-de-gestion-des-organismes-de-formation-le-guide-complet-pour-optimiser-votre-structure',
  ],
  'logiciel-formation-conformite-marches-publics-2026': [
    'logiciel-formation-2026-guide-complet-pour-choisir',
  ],
  'fonctionnalites-indispensables-dun-logiciel-de-gestion-de-formation-professionnelle': [
    'logiciel-pour-organisme-de-formation-guide-complet-2026',
    'logiciel-formation-2026-guide-complet-pour-choisir',
  ],
  'meilleur-logiciel-de-gestion-pour-organisme-de-formation-le-comparatif-complet-2026': [
    'meilleur-logiciel-centre-de-formation-2025-2026',
    'logiciel-formation-2026-guide-complet-pour-choisir',
  ],
  'meilleur-logiciel-centre-de-formation-le-comparatif-complet-pour-choisir-en-2025-2026': [
    'meilleur-logiciel-centre-de-formation-2025-2026',
    'logiciel-pour-organisme-de-formation-guide-complet-2026',
  ],
  // Articles fusionnés dans le guide principal (même mot-clé, ils se concurrençaient)
  'logiciel-formation-2026-guide-complet-pour-choisir': ['logiciel-pour-organisme-de-formation-guide-complet-2026'],
  'logiciel-de-gestion-des-organismes-de-formation-le-guide-complet-pour-optimiser-votre-structure': [
    'logiciel-pour-organisme-de-formation-guide-complet-2026',
  ],
}

/** Articles archivés parce que fusionnés : leur URL redirige vers l'article principal */
export const MERGED_BLOG_SLUGS = [
  'logiciel-formation-2026-guide-complet-pour-choisir',
  'logiciel-de-gestion-des-organismes-de-formation-le-guide-complet-pour-optimiser-votre-structure',
]

/** Article vers lequel rediriger une URL de blog qui n'existe plus (ou null) */
export function blogRedirectTarget(slug: string): string | null {
  let target: string | null = null
  let current = slug
  // Suit les chaînes (ancien slug → article lui-même fusionné → article principal)
  for (let i = 0; i < 5; i++) {
    const next = BLOG_SLUG_REDIRECTS[current]?.[0]
    if (!next || next === slug) break
    target = next
    current = next
  }
  return target
}

const SITE_HOST = /^https?:\/\/(www\.)?eduzen\.io/i

export type InternalLink = { href: string; path: string }

/** Liens d'un HTML qui pointent vers le site EduZen (absolus eduzen.io ou relatifs) */
export function extractInternalLinks(html: string): InternalLink[] {
  const links: InternalLink[] = []
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1]
    let path: string | null = null
    if (SITE_HOST.test(href)) path = href.replace(SITE_HOST, '') || '/'
    else if (href.startsWith('/')) path = href
    if (path === null) continue
    path = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
    links.push({ href, path })
  }
  return links
}

export function blogSlugOf(path: string): string | null {
  const m = path.match(/^\/blog\/([^/]+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

/** true si le lien mène à une page existante */
export function isValidInternalPath(path: string, existingSlugs: Set<string>): boolean {
  const slug = blogSlugOf(path)
  if (slug) return existingSlugs.has(slug)
  return ALLOWED_SITE_PATHS.some((re) => re.test(path))
}

/**
 * Réécrit les liens /blog/<ancien-slug> vers l'article actuel.
 * Renvoie le HTML corrigé, les liens corrigés et ceux qui restent cassés.
 */
export function fixBrokenBlogLinks(html: string, existingSlugs: Set<string>, currentSlug?: string) {
  const fixed: Array<{ from: string; to: string }> = []
  const unresolved: string[] = []
  const out = html.replace(/href="([^"]+)"/g, (whole, href: string) => {
    const [link] = extractInternalLinks(`href="${href}"`)
    if (!link) return whole
    const slug = blogSlugOf(link.path)
    if (!slug || existingSlugs.has(slug)) {
      if (!slug && !isValidInternalPath(link.path, existingSlugs)) unresolved.push(href)
      return whole
    }
    const target = (BLOG_SLUG_REDIRECTS[slug] ?? []).find((t) => t !== currentSlug && existingSlugs.has(t))
    if (target) {
      const to = `https://www.eduzen.io/blog/${target}`
      fixed.push({ from: href, to })
      return `href="${to}"`
    }
    unresolved.push(href)
    return whole
  })
  return { html: out, fixed, unresolved }
}
