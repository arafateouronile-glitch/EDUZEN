/**
 * POST /api/qualiopi/sync-evidence
 * Remonte automatiquement les preuves pour les indicateurs Qualiopi :
 * - Programmes publiés : Ind. 1 (prestations), 1.2 (taux réussite/satisfaction/complétion), 1.3 (durée/délais), 6 (contenu/modalités), 29 (recueil satisfaction)
 * - Accessibilité : Ind. 16
 * - Conventions/contrats signés : Ind. 10
 * - Convocations : Ind. 9 (conditions déroulement), Ind. 10 (information stagiaires)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const inserted: string[] = []

    // 1) Supprimer les preuves auto précédentes (catalogue, accessibilité, documents) pour éviter doublons
    await supabase
      .from('compliance_evidence_automated')
      .delete()
      .eq('organization_id', orgId)
      .eq('source', 'system')
      .in('entity_type', ['program', 'accessibility', 'document'])

    // 2) Catalogue – programmes publiés (is_public ou published_online) et actifs
    const { data: programs } = await supabase
      .from('programs')
      .select(
        'id, name, success_rate, satisfaction_rate, completion_rate, duration_days, duration_unit, pedagogical_objectives, training_content, description'
      )
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .or('is_public.eq.true,published_online.eq.true')

    if (programs?.length) {
      for (const p of programs) {
        const name = p.name ?? 'Programme'

        // Ind. 1 – Information sur les prestations (programme publié au catalogue)
        await supabase.from('compliance_evidence_automated').insert({
          organization_id: orgId,
          indicator_number: 1,
          evidence_type: 'document',
          source: 'system',
          entity_type: 'program',
          entity_id: p.id,
          entity_name: name,
          title: `Publication programme - ${name}`,
          description: 'Programme de formation publié au catalogue',
          status: 'valid',
          confidence_score: 100,
          event_date: now,
        })
        inserted.push(`program:${p.id}:1`)

        // Ind. 1.2 – Indicateurs de résultats (taux de réussite, satisfaction, complétion publiés)
        const hasResults =
          p.success_rate != null || p.satisfaction_rate != null || p.completion_rate != null
        if (hasResults) {
          const parts: string[] = []
          if (p.success_rate != null) parts.push(`réussite ${p.success_rate}%`)
          if (p.satisfaction_rate != null) parts.push(`satisfaction ${p.satisfaction_rate}/5`)
          if (p.completion_rate != null) parts.push(`complétion ${p.completion_rate}%`)
          await supabase.from('compliance_evidence_automated').insert({
            organization_id: orgId,
            indicator_number: 2,
            evidence_type: 'data_point',
            source: 'system',
            entity_type: 'program',
            entity_id: p.id,
            entity_name: name,
            title: `Indicateurs de résultats - ${name}`,
            description: parts.join(', '),
            status: 'valid',
            confidence_score: 100,
            event_date: now,
          })
          inserted.push(`program:${p.id}:1.2`)
        }

        // Ind. 1.3 – Délais d'accès / information sur la durée (durée publiée)
        const hasDuration = p.duration_days != null || p.duration_unit != null
        if (hasDuration) {
          const durationDesc =
            p.duration_days != null
              ? `${p.duration_days} jour(s)${p.duration_unit ? ` (${p.duration_unit})` : ''}`
              : p.duration_unit ?? 'Durée renseignée'
          await supabase.from('compliance_evidence_automated').insert({
            organization_id: orgId,
            indicator_number: 3,
            evidence_type: 'document',
            source: 'system',
            entity_type: 'program',
            entity_id: p.id,
            entity_name: name,
            title: `Délais et durée - ${name}`,
            description: durationDesc,
            status: 'valid',
            confidence_score: 100,
            event_date: now,
          })
          inserted.push(`program:${p.id}:1.3`)
        }

        // Ind. 6 – Contenu et modalités (objectifs pédagogiques / contenu renseignés)
        const hasContent =
          (p.pedagogical_objectives && String(p.pedagogical_objectives).trim() !== '') ||
          (p.training_content && String(p.training_content).trim() !== '') ||
          (p.description && String(p.description).trim() !== '')
        if (hasContent) {
          await supabase.from('compliance_evidence_automated').insert({
            organization_id: orgId,
            indicator_number: 6,
            evidence_type: 'document',
            source: 'system',
            entity_type: 'program',
            entity_id: p.id,
            entity_name: name,
            title: `Contenu et modalités - ${name}`,
            description: 'Contenu, objectifs pédagogiques et modalités renseignés sur le programme',
            status: 'valid',
            confidence_score: 100,
            event_date: now,
          })
          inserted.push(`program:${p.id}:6`)
        }

        // Ind. 29 – Modalités de recueil (satisfaction renseignée = recueil des appréciations)
        if (p.satisfaction_rate != null) {
          await supabase.from('compliance_evidence_automated').insert({
            organization_id: orgId,
            indicator_number: 29,
            evidence_type: 'feedback',
            source: 'system',
            entity_type: 'program',
            entity_id: p.id,
            entity_name: name,
            title: `Recueil satisfaction - ${name}`,
            description: `Note de satisfaction publiée : ${p.satisfaction_rate}/5`,
            status: 'valid',
            confidence_score: 100,
            event_date: now,
          })
          inserted.push(`program:${p.id}:29`)
        }
      }
    }

    // 3) Accessibilité (indicateur 16 – Accessibilité handicap)
    const { data: accessibility } = await supabase
      .from('accessibility_configurations')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (accessibility) {
      await supabase.from('compliance_evidence_automated').insert({
        organization_id: orgId,
        indicator_number: 16,
        evidence_type: 'document',
        source: 'system',
        entity_type: 'document',
        entity_id: accessibility.id,
        entity_name: 'Configuration accessibilité',
        title: 'Accessibilité configurée',
        description: 'Référent handicap et politique d\'accessibilité renseignés',
        status: 'valid',
        confidence_score: 100,
        event_date: now,
      })
      inserted.push('accessibility')
    }

    // 4) Conventions / contrats signés (indicateur 10)
    const { data: conventionDocs } = await supabase
      .from('documents')
      .select('id, title')
      .eq('organization_id', orgId)
      .in('type', ['convention', 'contrat'])

    const docIds = (conventionDocs ?? []).map((d) => d.id)
    let signedDocIds = new Set<string>()
    if (docIds.length > 0) {
      const { data: sigReqs } = await supabase
        .from('signature_requests')
        .select('document_id, status')
        .in('document_id', docIds)
      signedDocIds = new Set(
        (sigReqs ?? []).filter((s: any) => s.status === 'signed').map((s: any) => s.document_id)
      )
    }
    // Documents avec status = 'signed' (colonne documents)
    const { data: signedByStatus } = await supabase
      .from('documents')
      .select('id, title')
      .eq('organization_id', orgId)
      .in('type', ['convention', 'contrat'])
      .eq('status', 'signed')
    for (const d of signedByStatus ?? []) {
      signedDocIds.add(d.id)
    }

    for (const d of conventionDocs ?? []) {
      if (!signedDocIds.has(d.id)) continue
      await supabase.from('compliance_evidence_automated').insert({
        organization_id: orgId,
        indicator_number: 10,
        evidence_type: 'contract',
        source: 'system',
        entity_type: 'document',
        entity_id: d.id,
        entity_name: d.title ?? 'Convention',
        title: `Convention signée - ${d.title ?? d.id}`,
        description: 'Convention de formation signée',
        status: 'valid',
        confidence_score: 100,
        event_date: now,
      })
      inserted.push(`convention:${d.id}`)
    }

    // 5) Convocations – Ind. 9 (Conditions de déroulement) et Ind. 10 (Information stagiaires)
    const { data: convocationDocs } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .eq('organization_id', orgId)
      .eq('type', 'convocation')

    for (const d of convocationDocs ?? []) {
      const title = d.title ?? 'Convocation'
      const eventDate = d.created_at ?? now
      await supabase.from('compliance_evidence_automated').insert({
        organization_id: orgId,
        indicator_number: 9,
        evidence_type: 'document',
        source: 'system',
        entity_type: 'document',
        entity_id: d.id,
        entity_name: title,
        title: `Conditions de déroulement - ${title}`,
        description: 'Convocation envoyée (conditions de déroulement)',
        status: 'valid',
        confidence_score: 100,
        event_date: eventDate,
      })
      inserted.push(`convocation:${d.id}:9`)
      await supabase.from('compliance_evidence_automated').insert({
        organization_id: orgId,
        indicator_number: 10,
        evidence_type: 'document',
        source: 'system',
        entity_type: 'document',
        entity_id: d.id,
        entity_name: title,
        title: `Convocation - ${title}`,
        description: 'Convocation envoyée aux stagiaires',
        status: 'valid',
        confidence_score: 100,
        event_date: eventDate,
      })
      inserted.push(`convocation:${d.id}:10`)
    }

    return NextResponse.json({
      success: true,
      count: inserted.length,
      message: `${inserted.length} preuve(s) remontée(s) automatiquement.`,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
