/**
 * Contrôles du calendrier éditorial (content/blog-calendar) avant import :
 * meta dans les limites, contenu suffisant, et liens internes qui mènent à
 * une page existante au moment de la publication de l'article.
 */

import type { CalendarArticle } from '@/content/blog-calendar/calendar'
import { blogSlugOf, extractInternalLinks, isValidInternalPath } from './internal-links'

export const META_TITLE_MAX = 70
export const META_DESCRIPTION_MIN = 120
export const META_DESCRIPTION_MAX = 160
export const MIN_WORDS = 800

export function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
}

/** Temps de lecture affiché sur l'article (200 mots par minute) */
export function readingTimeMinutes(html: string): number {
  return Math.max(1, Math.round(wordCount(html) / 200))
}

/** Date de publication du jour `day` : 8 h à Paris (07:00 UTC en hiver) */
export function publicationDate(start: string, day: number): string {
  const d = new Date(`${start}T07:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + day - 1)
  return d.toISOString()
}

/**
 * Renvoie la liste des problèmes (vide si tout va bien).
 * `existingSlugs` : articles déjà publiés sur le blog. Un article du calendrier
 * ne peut pointer que vers un article existant ou publié un jour avant lui.
 */
export function validateCalendar(
  calendar: CalendarArticle[],
  readHtml: (slug: string) => string | null,
  existingSlugs: Set<string>
): string[] {
  const errors: string[] = []
  const days = new Set<number>()
  const slugs = new Set<string>()
  const dayBySlug = new Map(calendar.map((a) => [a.slug, a.day]))

  for (const a of calendar) {
    const where = `J${a.day} ${a.slug}`
    if (days.has(a.day)) errors.push(`${where} : jour en double`)
    days.add(a.day)
    if (slugs.has(a.slug)) errors.push(`${where} : slug en double`)
    slugs.add(a.slug)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) errors.push(`${where} : slug invalide`)
    if (a.meta_title.length > META_TITLE_MAX) errors.push(`${where} : meta_title ${a.meta_title.length} > ${META_TITLE_MAX}`)
    const md = a.meta_description.length
    if (md < META_DESCRIPTION_MIN || md > META_DESCRIPTION_MAX) {
      errors.push(`${where} : meta_description ${md} hors [${META_DESCRIPTION_MIN}-${META_DESCRIPTION_MAX}]`)
    }
    if (a.title.length > 255) errors.push(`${where} : titre trop long`)

    const html = readHtml(a.slug)
    if (html === null) {
      errors.push(`${where} : fichier HTML manquant`)
      continue
    }
    const words = wordCount(html)
    if (words < MIN_WORDS) errors.push(`${where} : ${words} mots < ${MIN_WORDS}`)
    if (/<h1[\s>]/i.test(html)) errors.push(`${where} : h1 dans le corps (le titre est déjà affiché)`)

    for (const link of extractInternalLinks(html)) {
      const target = blogSlugOf(link.path)
      if (target && dayBySlug.has(target)) {
        if (dayBySlug.get(target)! >= a.day) errors.push(`${where} : lien vers ${target}, publié après lui`)
        continue
      }
      if (!isValidInternalPath(link.path, existingSlugs)) errors.push(`${where} : lien interne cassé ${link.href}`)
    }
  }

  const expected = calendar.length
  for (let d = 1; d <= expected; d++) if (!days.has(d)) errors.push(`jour ${d} manquant`)
  return errors
}
