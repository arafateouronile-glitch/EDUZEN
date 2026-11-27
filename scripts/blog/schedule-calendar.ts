/**
 * Programme les articles du calendrier éditorial (content/blog-calendar) :
 * un article par jour, publié à 8 h (Paris).
 *
 *   npx tsx --env-file=.env.local scripts/blog/schedule-calendar.ts                    (rapport seul)
 *   npx tsx --env-file=.env.local scripts/blog/schedule-calendar.ts --apply            (écriture)
 *   … --start 2026-11-28   date du jour 1 (défaut : demain)
 *
 * Les articles sont enregistrés en status='published' avec un published_at
 * futur : le blog, le sitemap et la RLS les masquent jusqu'à cette date. Ils
 * restent modifiables dans le super-admin avant leur parution.
 * Un article déjà présent (même slug) est mis à jour, sauf s'il est déjà paru.
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BLOG_CALENDAR } from '@/content/blog-calendar/calendar'
import { publicationDate, readingTimeMinutes, validateCalendar } from '@/lib/blog/calendar-validation'

const apply = process.argv.includes('--apply')
const startArg = process.argv[process.argv.indexOf('--start') + 1]
const start =
  process.argv.includes('--start') && /^\d{4}-\d{2}-\d{2}$/.test(startArg ?? '')
    ? startArg
    : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

const ARTICLES_DIR = join(process.cwd(), 'content/blog-calendar/articles')
const readHtml = (slug: string) => {
  const file = join(ARTICLES_DIR, `${slug}.html`)
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: posts, error } = await supabase.from('blog_posts').select('id, slug, status, published_at')
  if (error) throw error
  const bySlug = new Map((posts ?? []).map((p) => [p.slug as string, p]))
  const calendarSlugs = new Set(BLOG_CALENDAR.map((a) => a.slug))
  const published = new Set(
    (posts ?? []).filter((p) => p.status === 'published' && !calendarSlugs.has(p.slug)).map((p) => p.slug as string)
  )

  const errors = validateCalendar(BLOG_CALENDAR, readHtml, published)
  if (errors.length) {
    console.error('Calendrier invalide :\n  ' + errors.join('\n  '))
    process.exit(1)
  }

  const { data: categories, error: catErr } = await supabase.from('blog_categories').select('id, slug')
  if (catErr) throw catErr
  const categoryId = new Map((categories ?? []).map((c) => [c.slug as string, c.id as string]))

  const { data: admin, error: adminErr } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('role', 'super_admin')
    .eq('is_active', true)
    .limit(1)
    .single()
  if (adminErr || !admin) throw adminErr ?? new Error('Aucun super-admin actif (auteur des articles)')

  const now = Date.now()
  const rows = BLOG_CALENDAR.map((a) => {
    const content = readHtml(a.slug)!
    const category_id = categoryId.get(a.category)
    if (!category_id) throw new Error(`Catégorie introuvable : ${a.category}`)
    return {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      content,
      meta_title: a.meta_title,
      meta_description: a.meta_description,
      category_id,
      author_id: admin.user_id,
      status: 'published',
      published_at: publicationDate(start, a.day),
      scheduled_for: publicationDate(start, a.day),
      reading_time_minutes: readingTimeMinutes(content),
      is_featured: false,
      allow_comments: true,
      metadata: { calendar_day: a.day, keyword: a.keyword },
    }
  })

  const skipped: string[] = []
  const toWrite = rows.filter((r) => {
    const existing = bySlug.get(r.slug)
    const alreadyLive =
      existing?.status === 'published' && existing.published_at && new Date(existing.published_at).getTime() <= now
    if (alreadyLive) skipped.push(r.slug)
    return !alreadyLive
  })

  console.log(`Jour 1 : ${start} à 8 h (Paris) — ${rows.length} articles`)
  for (const r of rows) {
    const tag = skipped.includes(r.slug) ? 'déjà paru, ignoré' : bySlug.has(r.slug) ? 'mise à jour' : 'nouveau'
    console.log(`  ${r.published_at.slice(0, 10)}  ${r.slug}  (${r.reading_time_minutes} min, ${tag})`)
  }

  if (!apply) {
    console.log('\nRapport seul. Relancer avec --apply pour écrire.')
    return
  }

  for (const r of toWrite) {
    const existing = bySlug.get(r.slug)
    const { error: writeErr } = existing
      ? await supabase.from('blog_posts').update(r).eq('id', existing.id)
      : await supabase.from('blog_posts').insert(r)
    if (writeErr) throw new Error(`${r.slug} : ${writeErr.message}`)
  }
  console.log(`\nÉcrit : ${toWrite.length} article(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
