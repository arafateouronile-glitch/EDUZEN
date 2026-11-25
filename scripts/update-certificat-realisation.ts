/**
 * Remplace le certificat de réalisation des organismes qui ne l'ont pas
 * personnalisé par le modèle officiel du Ministère du Travail.
 *
 *   npx tsx --env-file=.env.local scripts/update-certificat-realisation.ts          (rapport seul)
 *   npx tsx --env-file=.env.local scripts/update-certificat-realisation.ts --apply  (écriture)
 */

import { createClient } from '@supabase/supabase-js'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { bodyHash, isUncustomizedCertificat } from '@/lib/utils/certificat-realisation-migration'

const apply = process.argv.includes('--apply')

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const official = getDefaultTemplateContent('certificat_realisation')
  if (!official) throw new Error('Modèle par défaut introuvable')

  const { data, error } = await supabase
    .from('document_templates')
    .select('id, organization_id, name, content, created_at, updated_at, organizations(name)')
    .eq('type', 'certificat_realisation')
  if (error) throw error

  const rows = (data ?? []) as any[]
  const officialHash = bodyHash(official.bodyContent)
  const toReplace = rows.filter((r) => isUncustomizedCertificat(r) && bodyHash(r.content?.html ?? '') !== officialHash)
  const kept = rows.filter((r) => !isUncustomizedCertificat(r))

  console.log(`Modèles certificat_realisation : ${rows.length}`)
  console.log(`  à remplacer (non personnalisés) : ${toReplace.length}`)
  console.log(`  gardés (personnalisés)          : ${kept.length}`)
  for (const r of kept) console.log(`    - ${r.organizations?.name ?? r.organization_id} — « ${r.name} »`)

  if (!apply) {
    console.log('\nRapport seul. Relancer avec --apply pour écrire.')
    return
  }

  let done = 0
  for (const r of toReplace) {
    const { error: updateError } = await supabase
      .from('document_templates')
      .update({ name: official.name, content: { ...(r.content ?? {}), html: official.bodyContent } })
      .eq('id', r.id)
    if (updateError) console.error(`Échec ${r.id} : ${updateError.message}`)
    else done++
  }
  console.log(`\n${done} modèle(s) remplacé(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
