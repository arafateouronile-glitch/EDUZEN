/**
 * Corrige les liens internes cassés des articles de blog (liens /blog/<slug>
 * vers des articles qui n'existent plus).
 *
 *   npx tsx --env-file=.env.local scripts/blog/fix-broken-links.ts          (rapport seul)
 *   npx tsx --env-file=.env.local scripts/blog/fix-broken-links.ts --apply  (écriture)
 *
 * Avec --apply, le contenu d'origine des articles modifiés est sauvegardé en
 * JSON (chemin affiché) avant toute écriture.
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fixBrokenBlogLinks } from '@/lib/blog/internal-links'

const apply = process.argv.includes('--apply')

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase.from('blog_posts').select('id, slug, title, status, content')
  if (error) throw error
  const posts = (data ?? []) as Array<{ id: string; slug: string; title: string; status: string; content: string }>

  // Les articles archivés ne sont pas affichés : un lien vers eux est cassé
  const existing = new Set(posts.filter((p) => p.status === 'published').map((p) => p.slug))
  const changes: Array<{ id: string; slug: string; before: string; after: string }> = []

  for (const post of posts) {
    const { html, fixed, unresolved } = fixBrokenBlogLinks(post.content ?? '', existing, post.slug)
    if (fixed.length === 0 && unresolved.length === 0) continue
    console.log(`\n${post.slug} (${post.status})`)
    for (const f of fixed) console.log(`  corrigé : ${f.from}\n         → ${f.to}`)
    for (const u of unresolved) console.log(`  CASSÉ, sans correspondance : ${u}`)
    if (fixed.length > 0) changes.push({ id: post.id, slug: post.slug, before: post.content, after: html })
  }

  console.log(`\nArticles à corriger : ${changes.length}`)
  if (!apply) {
    console.log('Rapport seul. Relancer avec --apply pour écrire.')
    return
  }
  if (changes.length === 0) return

  const backup = join(tmpdir(), `blog-links-backup-${Date.now()}.json`)
  writeFileSync(backup, JSON.stringify(changes.map(({ id, slug, before }) => ({ id, slug, content: before })), null, 2))
  console.log(`Sauvegarde : ${backup}`)

  for (const c of changes) {
    const { error: upErr } = await supabase.from('blog_posts').update({ content: c.after }).eq('id', c.id)
    if (upErr) throw upErr
    console.log(`  écrit : ${c.slug}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
