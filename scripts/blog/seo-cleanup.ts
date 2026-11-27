/**
 * Nettoyage SEO des articles de blog publiés :
 *  - titres et meta sans année (« 2025 », « 2026 » vieillissent vite) ;
 *  - meta description manquante complétée ;
 *  - h1 en tête de contenu retiré (la page affiche déjà le titre en h1) ;
 *  - temps de lecture calculé ;
 *  - articles en doublon sur « logiciel organisme de formation » archivés :
 *    leur URL redirige vers l'article principal (BLOG_SLUG_REDIRECTS).
 *
 *   npx tsx --env-file=.env.local scripts/blog/seo-cleanup.ts          (rapport seul)
 *   npx tsx --env-file=.env.local scripts/blog/seo-cleanup.ts --apply  (écriture, avec sauvegarde)
 *   … --no-merge  sans archiver les articles fusionnés
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readingTimeMinutes } from '@/lib/blog/calendar-validation'
import { MERGED_BLOG_SLUGS } from '@/lib/blog/internal-links'

const apply = process.argv.includes('--apply')
// --no-merge : ne pas archiver les articles fusionnés (à faire une fois la redirection déployée)
const merge = !process.argv.includes('--no-merge')

type Meta = { title?: string; meta_title?: string; meta_description?: string }

const META: Record<string, Meta> = {
  'logiciel-gestion-auto-ecole-comment-choisir-2025': {
    title: 'Logiciel de gestion auto-école : comment bien le choisir ?',
    meta_title: 'Logiciel de gestion auto-école : comment le choisir | EduZen',
    meta_description:
      "Comparez les logiciels de gestion auto-école : planning des moniteurs, flotte, livret d'apprentissage et CPF. Le guide complet pour bien choisir.",
  },
  'qualiopi-2025-checklist-indicateurs-audit': {
    title: "Qualiopi : checklist complète des indicateurs pour passer l'audit",
    meta_title: "Qualiopi : checklist des indicateurs pour réussir l'audit | EduZen",
    meta_description:
      "Préparez votre audit Qualiopi : les indicateurs détaillés, les preuves à fournir et les erreurs à éviter. La checklist complète pour OF et CFA.",
  },
  'logiciel-qualiopi-organisme-formation-guide-complet-2025': {
    title: 'Logiciel Qualiopi pour organisme de formation : le guide complet',
    meta_title: 'Logiciel Qualiopi pour organisme de formation : guide complet',
    meta_description:
      'Logiciel Qualiopi : fonctionnalités indispensables, critères de choix et méthode pour centraliser vos preuves et sécuriser votre certification.',
  },
  'facturation-cpf-logiciel-guide-complet-pour-of-2025': {
    title: 'Facturation CPF : le guide complet pour les organismes de formation',
    meta_title: 'Facturation CPF : le guide complet pour organismes de formation',
    meta_description:
      'Facturation des formations CPF : étapes sur EDOF, délais de paiement, erreurs fréquentes et outils pour automatiser la facturation de vos sessions.',
  },
  'plan-developpement-competences-2025-guide-pratique-rh': {
    title: 'Plan de développement des compétences : guide pratique pour les RH',
    meta_title: 'Plan de développement des compétences : guide RH | EduZen',
    meta_description:
      'Construisez votre plan de développement des compétences : obligations légales, OPCO, budget et suivi des formations. Guide pratique pour les RH.',
  },
  'emargement-numerique-formation-obligations-bonnes-pratiques': {
    title: 'Émargement numérique en formation : obligations légales et bonnes pratiques',
    meta_title: 'Émargement numérique : obligations et bonnes pratiques | EduZen',
    meta_description:
      'Émargement numérique en formation professionnelle : obligations légales, exigences Qualiopi, fonctionnement hors ligne. Le guide des bonnes pratiques.',
  },
  'meilleur-logiciel-centre-de-formation-2025-2026': {
    title: 'Meilleur logiciel de centre de formation : le comparatif',
    meta_title: 'Meilleur logiciel de centre de formation : le comparatif',
    meta_description:
      'Comparatif des logiciels de gestion pour centre de formation : fonctionnalités, Qualiopi, tarifs et critères pour choisir la solution adaptée.',
  },
  'emargement-numerique-formation-guide-complet-2026': {
    title: 'Émargement numérique en formation : le guide complet',
    meta_title: 'Émargement numérique en formation : le guide complet',
  },
  'automatisation-conformite-qualiopi-guide-complet-2026': {
    title: 'Automatisation de la conformité Qualiopi : le guide complet',
    meta_title: 'Automatisation de la conformité Qualiopi : le guide complet',
  },
  'logiciel-pour-organisme-de-formation-guide-complet-2026': {
    title: 'Logiciel pour organisme de formation : le guide complet pour choisir',
    meta_title: 'Logiciel pour organisme de formation : le guide pour choisir',
  },
}

/** Retire le premier <h1> s'il ouvre le contenu (titre déjà affiché par la page) */
export function stripLeadingH1(html: string): string {
  // Tolère les paragraphes vides laissés par l'éditeur avant le titre
  return html.replace(
    /^(\s*<article[^>]*>)?(?:\s*<p>\s*<\/p>)*\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i,
    (_m, article) => article ?? ''
  )
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, status, title, meta_title, meta_description, content, reading_time_minutes, published_at')
    .eq('status', 'published')
  if (error) throw error

  const backup: unknown[] = []
  const updates: Array<{ id: string; slug: string; patch: Record<string, unknown> }> = []

  for (const p of data ?? []) {
    const patch: Record<string, unknown> = {}
    const meta = META[p.slug] ?? {}
    for (const key of ['title', 'meta_title', 'meta_description'] as const) {
      if (meta[key] && meta[key] !== p[key]) patch[key] = meta[key]
    }
    for (const [key, max] of [['meta_title', 70], ['meta_description', 160]] as const) {
      const v = (patch[key] ?? p[key]) as string | null
      if (v && v.length > max) throw new Error(`${p.slug} : ${key} trop long (${v.length})`)
    }
    const content = stripLeadingH1(p.content ?? '')
    if (content !== p.content) patch.content = content
    const rt = readingTimeMinutes(content)
    if (rt !== p.reading_time_minutes) patch.reading_time_minutes = rt
    if (merge && MERGED_BLOG_SLUGS.includes(p.slug)) patch.status = 'archived'

    if (Object.keys(patch).length === 0) continue
    backup.push(p)
    updates.push({ id: p.id, slug: p.slug, patch })
    const parts = Object.keys(patch).map((k) => (k === 'content' ? 'h1 retiré' : k === 'status' ? 'ARCHIVÉ (fusionné)' : k))
    console.log(`${p.slug}\n  ${parts.join(', ')}${patch.title ? `\n  titre : ${patch.title}` : ''}`)
  }

  console.log(`\nArticles modifiés : ${updates.length}`)
  if (!apply) {
    console.log('Rapport seul. Relancer avec --apply pour écrire.')
    return
  }
  const file = join(tmpdir(), `blog-seo-backup-${Date.now()}.json`)
  writeFileSync(file, JSON.stringify(backup, null, 2))
  console.log(`Sauvegarde : ${file}`)
  for (const u of updates) {
    const { error: upErr } = await supabase.from('blog_posts').update(u.patch).eq('id', u.id)
    if (upErr) throw new Error(`${u.slug} : ${upErr.message}`)
  }
  console.log('Écrit.')
}

if (process.argv[1]?.endsWith('seo-cleanup.ts')) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
