import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BLOG_CALENDAR } from '@/content/blog-calendar/calendar'
import { publicationDate, readingTimeMinutes, validateCalendar } from '@/lib/blog/calendar-validation'
import { fixBrokenBlogLinks } from '@/lib/blog/internal-links'

// Articles publiés sur le blog avant le calendrier (cibles autorisées des liens)
const EXISTING_SLUGS = new Set([
  'fin-subrogation-opco-2026-tresorerie-organisme-formation',
  'referentiel-qualiopi-v10-decret-1er-aout-2026',
  'qualiopi-2025-checklist-indicateurs-audit',
  'emargement-numerique-formation-guide-complet-2026',
  'emargement-numerique-formation-obligations-bonnes-pratiques',
  'formation-securite-entreprise-recyclages-sst-habilitations',
  'plan-developpement-competences-2025-guide-pratique-rh',
  'logiciel-pour-organisme-de-formation-guide-complet-2026',
  'logiciel-formation-2026-guide-complet-pour-choisir',
  'facturation-cpf-logiciel-guide-complet-pour-of-2025',
  'automatisation-conformite-qualiopi-guide-complet-2026',
  'logiciel-qualiopi-organisme-formation-guide-complet-2025',
])

const dir = join(process.cwd(), 'content/blog-calendar/articles')
const readHtml = (slug: string) => {
  const f = join(dir, `${slug}.html`)
  return existsSync(f) ? readFileSync(f, 'utf8') : null
}

describe('calendrier éditorial du blog', () => {
  it('contient 30 articles valides (meta, longueur, liens internes)', () => {
    expect(BLOG_CALENDAR).toHaveLength(30)
    expect(validateCalendar(BLOG_CALENDAR, readHtml, EXISTING_SLUGS)).toEqual([])
  })

  it('refuse un lien vers un article du calendrier publié plus tard', () => {
    const [a, b] = BLOG_CALENDAR
    const errors = validateCalendar([a, b], (slug) =>
      slug === a.slug ? `${readHtml(a.slug)}<a href="https://www.eduzen.io/blog/${b.slug}">x</a>` : readHtml(slug),
      EXISTING_SLUGS
    )
    expect(errors.some((e) => e.includes('publié après lui'))).toBe(true)
  })

  it('refuse un lien interne vers une page inexistante', () => {
    const [a] = BLOG_CALENDAR
    const errors = validateCalendar([a], () => `${readHtml(a.slug)}<a href="/blog/nexiste-pas">x</a>`, EXISTING_SLUGS)
    expect(errors.some((e) => e.includes('lien interne cassé'))).toBe(true)
  })

  it('publie un article par jour à 07:00 UTC', () => {
    expect(publicationDate('2026-11-28', 1)).toBe('2026-11-28T07:00:00.000Z')
    expect(publicationDate('2026-11-28', 30)).toBe('2026-12-27T07:00:00.000Z')
    expect(readingTimeMinutes('<p>' + 'mot '.repeat(1000) + '</p>')).toBe(5)
  })
})

describe('correction des liens internes cassés', () => {
  const existing = new Set(['emargement-numerique-formation-guide-complet-2026', 'logiciel-qualiopi-organisme-formation-guide-complet-2025', 'automatisation-conformite-qualiopi-guide-complet-2026'])

  it('redirige un ancien slug vers l’article actuel', () => {
    const html = '<a href="https://www.eduzen.io/blog/emargement-numerique-formation-le-guide-complet-pour-passer-au-zero-papier-en-toute-conformite">x</a>'
    const res = fixBrokenBlogLinks(html, existing)
    expect(res.html).toContain('/blog/emargement-numerique-formation-guide-complet-2026')
    expect(res.unresolved).toEqual([])
  })

  it('évite de faire pointer un article vers lui-même', () => {
    const html = '<a href="https://www.eduzen.io/blog/logiciel-qualiopi-pour-organisme-de-formation-le-guide-complet-pour-simplifier-votre-conformite">x</a>'
    const res = fixBrokenBlogLinks(html, existing, 'logiciel-qualiopi-organisme-formation-guide-complet-2025')
    expect(res.html).toContain('/blog/automatisation-conformite-qualiopi-guide-complet-2026')
  })

  it('signale un lien cassé sans correspondance sans le modifier', () => {
    const html = '<a href="/blog/inconnu">x</a> <a href="https://exemple.fr">y</a> <a href="/outils/reglement-interieur">z</a>'
    const res = fixBrokenBlogLinks(html, existing)
    expect(res.html).toBe(html)
    expect(res.unresolved).toEqual(['/blog/inconnu'])
  })
})
