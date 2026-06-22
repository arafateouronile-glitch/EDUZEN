/**
 * POST /api/qualiopi/sync-evidence
 * Remonte automatiquement les preuves pour les indicateurs Qualiopi :
 * - Ind. 1  : complétude des informations programme (7 champs obligatoires)
 * - Ind. 2  : taux de réussite/satisfaction/complétion (calculés + manuels)
 * - Ind. 3  : délais d'accès réels (enrollment_date → session start_date)
 * - Ind. 6  : contenu et modalités pédagogiques
 * - Ind. 9  : conditions de déroulement (convocations)
 * - Ind. 10 : adaptation/information stagiaires (conventions signées, convocations)
 * - Ind. 16 : accessibilité handicap
 * - Ind. 29 : recueil des appréciations (satisfaction renseignée)
 */

import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { acquireOrgLock, releaseOrgLock } from '@/lib/utils/sync-lock'

const IND1_REQUIRED_FIELDS = [
  { key: 'description',             label: 'Description' },
  { key: 'pedagogical_objectives',  label: 'Objectifs pédagogiques' },
  { key: 'training_content',        label: 'Contenu de formation' },
  { key: 'modalities',              label: 'Modalités' },
  { key: 'duration_days',           label: 'Durée' },
  { key: 'price',                   label: 'Tarif' },
  { key: 'learner_profile',         label: 'Public cible' },
] as const

function isFieldFilled(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number') return true
  return true
}

type EvidenceInsert = {
  organization_id:  string
  indicator_number: number
  evidence_type:    string
  source:           'system'
  entity_type:      string
  entity_id:        string
  entity_name:      string
  title:            string
  description:      string
  status:           'valid' | 'pending' | 'invalid'
  confidence_score: number
  event_date:       string
  metadata?:        Record<string, unknown>
}

async function bulkInsert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  evidences: EvidenceInsert[]
) {
  const CHUNK = 500
  for (let i = 0; i < evidences.length; i += CHUNK) {
    const { error } = await (supabase as any)
      .from('compliance_evidence_automated')
      .insert(evidences.slice(i, i + CHUNK))
    if (error) throw error
  }
}

/**
 * Cœur de la synchronisation — découplé du handler HTTP pour pouvoir
 * s'exécuter dans un after() sans dépendance au contexte de requête.
 * Utilise le client admin (service_role) car cookies non disponibles hors requête.
 */
async function doSync(orgId: string): Promise<{ count: number }> {
  const supabase = createAdminClient()

    const now      = new Date().toISOString()
    const inserted: string[]        = []
    const evidences: EvidenceInsert[] = []

    // 1) Supprimer les preuves auto précédentes pour éviter doublons
    await supabase
      .from('compliance_evidence_automated')
      .delete()
      .eq('organization_id', orgId)
      .eq('source', 'system')
      .in('entity_type', ['program', 'accessibility', 'document'])

    // ── Pré-chargement bulk ──────────────────────────────────────────────────
    const { data: allFormations } = await supabase
      .from('formations')
      .select('id, program_id')
      .eq('organization_id', orgId)
      .limit(5000)

    const programFormationMap = new Map<string, string[]>()
    for (const f of allFormations ?? []) {
      if (!f.program_id) continue
      const existing = programFormationMap.get(f.program_id) ?? []
      programFormationMap.set(f.program_id, [...existing, f.id])
    }

    const { data: allSessions } = await supabase
      .from('sessions')
      .select('id, formation_id')
      .eq('organization_id', orgId)
      .limit(5000)

    const formationSessionMap = new Map<string, string[]>()
    for (const s of allSessions ?? []) {
      if (!s.formation_id) continue
      const existing = formationSessionMap.get(s.formation_id) ?? []
      formationSessionMap.set(s.formation_id, [...existing, s.id])
    }

    const allSessionIds = (allSessions ?? []).map((s) => s.id)

    type GradeRow       = { session_id: string | null; score: number | null; max_score: number | null; percentage: number | null }
    type AttRow         = { session_id: string | null; status: string }
    type PreFormGradeRow = { id: string; session_id: string | null }
    type HotGradeRow    = { id: string; session_id: string | null }

    let allGrades:     GradeRow[]       = []
    let allAttendance: AttRow[]          = []
    let preFormGrades: PreFormGradeRow[] = []
    let hotGrades:     HotGradeRow[]     = []

    if (allSessionIds.length > 0) {
      const [gradesRes, attRes, pfRes, hotRes] = await Promise.all([
        supabase.from('grades').select('session_id, score, max_score, percentage').in('session_id', allSessionIds).limit(50000),
        supabase.from('attendance').select('session_id, status').in('session_id', allSessionIds).limit(50000),
        supabase.from('grades').select('id, session_id').in('session_id', allSessionIds).eq('assessment_type', 'pre_formation').limit(50000),
        supabase.from('grades').select('id, session_id').in('session_id', allSessionIds).eq('assessment_type', 'hot').limit(50000),
      ])
      allGrades     = (gradesRes.data ?? []) as GradeRow[]
      allAttendance = (attRes.data    ?? []) as AttRow[]
      preFormGrades = (pfRes.data     ?? []) as PreFormGradeRow[]
      hotGrades     = (hotRes.data    ?? []) as HotGradeRow[]
    }

    // Index par session_id pour éviter les .filter(...includes()) O(n) dans les boucles
    const gradesBySession = new Map<string, GradeRow[]>()
    for (const g of allGrades) {
      if (!g.session_id) continue
      const arr = gradesBySession.get(g.session_id) ?? []
      arr.push(g)
      gradesBySession.set(g.session_id, arr)
    }
    const attBySession = new Map<string, AttRow[]>()
    for (const a of allAttendance) {
      if (!a.session_id) continue
      const arr = attBySession.get(a.session_id) ?? []
      arr.push(a)
      attBySession.set(a.session_id, arr)
    }

    type SessionTeacherRow = { id: string; teacher_id: string | null }
    const { data: sessionTeacherData } = await supabase
      .from('sessions')
      .select('id, teacher_id')
      .eq('organization_id', orgId)
      .not('teacher_id', 'is', null)
      .limit(5000)
    const sessionsWithTeacher = (sessionTeacherData ?? []) as SessionTeacherRow[]

    // ── Pré-chargement Critères 4-7 ──────────────────────────────────────────
    type TeacherRow    = { id: string; is_active: boolean | null; specialization: string | null }
    type TeacherDocRow = { id: string; teacher_id: string; document_type: string; verified: boolean | null }
    type CorrActRow    = { id: string; status: string; priority: string | null }

    const [teachersRes, teacherDocsRes, corrActsRes] = await Promise.all([
      supabase.from('teachers').select('id, is_active, specialization').eq('organization_id', orgId).limit(5000),
      supabase.from('teacher_documents').select('id, teacher_id, document_type, verified').eq('organization_id', orgId).limit(5000),
      (supabase as any).from('qualiopi_corrective_actions').select('id, status, priority').eq('organization_id', orgId).limit(5000),
    ])
    const teachers          = (teachersRes.data    ?? []) as TeacherRow[]
    const teacherDocs       = (teacherDocsRes.data  ?? []) as TeacherDocRow[]
    const correctiveActions = ((corrActsRes.data    ?? []) as unknown) as CorrActRow[]

    // 2) Catalogue – programmes publiés et actifs
    const { data: programs } = await supabase
      .from('programs')
      .select('id, name, description, pedagogical_objectives, training_content, modalities, duration_days, duration_unit, price, learner_profile, success_rate, satisfaction_rate, completion_rate')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .or('is_public.eq.true,published_online.eq.true')
      .limit(5000)

    if (programs?.length) {
      for (const p of programs) {
        const name = p.name ?? 'Programme'

        // ── Ind. 1 – Complétude des informations du programme ───────────────
        const filledFields  = IND1_REQUIRED_FIELDS.filter((f) => isFieldFilled((p as Record<string, unknown>)[f.key]))
        const missingFields = IND1_REQUIRED_FIELDS.filter((f) => !filledFields.includes(f)).map((f) => f.label)
        const completeness  = Math.round((filledFields.length / IND1_REQUIRED_FIELDS.length) * 100)
        const ind1Status    = completeness >= 80 ? 'valid' : 'pending'
        const ind1Desc      = missingFields.length === 0
          ? `${filledFields.length}/${IND1_REQUIRED_FIELDS.length} champs renseignés — programme complet`
          : `${filledFields.length}/${IND1_REQUIRED_FIELDS.length} champs — manquants : ${missingFields.join(', ')}`

        evidences.push({
          organization_id:  orgId,
          indicator_number: 1,
          evidence_type:    'document',
          source:           'system',
          entity_type:      'program',
          entity_id:        p.id,
          entity_name:      name,
          title:            `Informations programme - ${name}`,
          description:      ind1Desc,
          status:           ind1Status,
          confidence_score: completeness,
          event_date:       now,
          metadata: {
            completeness_pct: completeness,
            filled_count:     filledFields.length,
            total_fields:     IND1_REQUIRED_FIELDS.length,
            missing_fields:   missingFields,
          },
        })
        inserted.push(`program:${p.id}:1`)

        // ── Ind. 2 – Indicateurs de résultats (calculés + manuels) ──────────
        const formationIds = programFormationMap.get(p.id) ?? []
        const sessionIds   = formationIds.flatMap((fid) => formationSessionMap.get(fid) ?? [])

        // O(1) par session grâce aux Maps — plus de .includes() O(n)
        const programGrades = sessionIds.flatMap((sid) => gradesBySession.get(sid) ?? [])
        let computedSuccessRate: number | null = null
        if (programGrades.length > 0) {
          const passed = programGrades.filter((g) => {
            if (g.percentage != null) return g.percentage >= 50
            if (g.score != null && g.max_score != null && g.max_score > 0)
              return (g.score / g.max_score) * 100 >= 50
            return false
          }).length
          computedSuccessRate = Math.round((passed / programGrades.length) * 100)
        }

        const programAtt = sessionIds.flatMap((sid) => attBySession.get(sid) ?? [])
        let computedCompletionRate: number | null = null
        if (programAtt.length > 0) {
          const present = programAtt.filter((a) => a.status === 'present' || a.status === 'late').length
          computedCompletionRate = Math.round((present / programAtt.length) * 100)
        }

        const finalSuccessRate    = computedSuccessRate    ?? p.success_rate    ?? null
        const finalCompletionRate = computedCompletionRate ?? p.completion_rate ?? null
        const finalSatisfaction   = p.satisfaction_rate ?? null

        const hasAnyRate = finalSuccessRate != null || finalCompletionRate != null || finalSatisfaction != null
        if (hasAnyRate) {
          const parts: string[] = []
          if (finalSuccessRate    != null) parts.push(`réussite ${finalSuccessRate}%`)
          if (finalSatisfaction   != null) parts.push(`satisfaction ${finalSatisfaction}/5`)
          if (finalCompletionRate != null) parts.push(`complétion ${finalCompletionRate}%`)

          evidences.push({
            organization_id:  orgId,
            indicator_number: 2,
            evidence_type:    'data_point',
            source:           'system',
            entity_type:      'program',
            entity_id:        p.id,
            entity_name:      name,
            title:            `Indicateurs de résultats - ${name}`,
            description:      parts.join(', '),
            status:           'valid',
            confidence_score: computedSuccessRate != null || computedCompletionRate != null ? 100 : 80,
            event_date:       now,
            metadata: {
              success_rate:        finalSuccessRate,
              completion_rate:     finalCompletionRate,
              satisfaction_rate:   finalSatisfaction,
              sources: {
                success:      computedSuccessRate    != null ? 'computed' : (p.success_rate    != null ? 'manual' : 'none'),
                completion:   computedCompletionRate != null ? 'computed' : (p.completion_rate != null ? 'manual' : 'none'),
                satisfaction: finalSatisfaction      != null ? 'manual'   : 'none',
              },
              sessions_analyzed:   sessionIds.length,
              grades_analyzed:     programGrades.length,
              attendance_analyzed: programAtt.length,
            },
          })
          inserted.push(`program:${p.id}:2`)
        }

        // ── Ind. 5 – Objectifs opérationnels ────────────────────────────────
        if (isFieldFilled(p.pedagogical_objectives)) {
          const objStr     = String(p.pedagogical_objectives)
          const objExcerpt = objStr.length > 200 ? objStr.slice(0, 200) + '…' : objStr
          evidences.push({
            organization_id:  orgId,
            indicator_number: 5,
            evidence_type:    'document',
            source:           'system',
            entity_type:      'program',
            entity_id:        p.id,
            entity_name:      name,
            title:            `Objectifs opérationnels - ${name}`,
            description:      `Objectifs pédagogiques définis : ${objExcerpt}`,
            status:           'valid',
            confidence_score: 100,
            event_date:       now,
            metadata: { has_objectives: true, objectives_length: objStr.length },
          })
          inserted.push(`program:${p.id}:5`)
        }

        // ── Ind. 6 – Contenu et modalités ───────────────────────────────────
        const hasObjC6     = isFieldFilled(p.pedagogical_objectives)
        const hasContentC6 = isFieldFilled(p.training_content)
        const hasModalC6   = isFieldFilled(p.modalities)
        const hasDescC6    = isFieldFilled(p.description)
        if (hasObjC6 || hasContentC6 || hasDescC6) {
          const contentFields = [
            hasObjC6     && 'Objectifs pédagogiques',
            hasContentC6 && 'Contenu de formation',
            hasModalC6   && 'Modalités',
            hasDescC6    && 'Description',
          ].filter(Boolean) as string[]
          evidences.push({
            organization_id:  orgId,
            indicator_number: 6,
            evidence_type:    'document',
            source:           'system',
            entity_type:      'program',
            entity_id:        p.id,
            entity_name:      name,
            title:            `Contenu et modalités - ${name}`,
            description:      `${contentFields.join(', ')} renseignés`,
            status:           'valid',
            confidence_score: 100,
            event_date:       now,
            metadata: {
              has_objectives:       hasObjC6,
              has_training_content: hasContentC6,
              has_modalities:       hasModalC6,
              has_description:      hasDescC6,
              content_fields:       contentFields,
            },
          })
          inserted.push(`program:${p.id}:6`)
        }

        // ── Ind. 7 – Adéquation contenus/objectifs ──────────────────────────
        if (isFieldFilled(p.pedagogical_objectives) && isFieldFilled(p.training_content)) {
          const alignFields = [true, true, isFieldFilled(p.modalities)]
          const alignScore  = Math.round((alignFields.filter(Boolean).length / 3) * 100)
          evidences.push({
            organization_id:  orgId,
            indicator_number: 7,
            evidence_type:    'document',
            source:           'system',
            entity_type:      'program',
            entity_id:        p.id,
            entity_name:      name,
            title:            `Adéquation contenus/objectifs - ${name}`,
            description:      `Objectifs, contenu${isFieldFilled(p.modalities) ? ' et modalités' : ''} définis — cohérence auditable`,
            status:           'valid',
            confidence_score: alignScore,
            event_date:       now,
            metadata: {
              has_objectives:       true,
              has_training_content: true,
              has_modalities:       isFieldFilled(p.modalities),
              alignment_score:      alignScore,
            },
          })
          inserted.push(`program:${p.id}:7`)
        }

        // ── Ind. 29 – Recueil des appréciations ─────────────────────────────
        if (p.satisfaction_rate != null) {
          evidences.push({
            organization_id:  orgId,
            indicator_number: 29,
            evidence_type:    'feedback',
            source:           'system',
            entity_type:      'program',
            entity_id:        p.id,
            entity_name:      name,
            title:            `Recueil satisfaction - ${name}`,
            description:      `Note de satisfaction publiée : ${p.satisfaction_rate}/5`,
            status:           'valid',
            confidence_score: 100,
            event_date:       now,
          })
          inserted.push(`program:${p.id}:29`)
        }
      }
    }

    // 3) Ind. 4 & 8 – Analyse du besoin + Positionnement initial ────────────
    const uniquePreFormSessions = new Set(preFormGrades.filter((g) => g.session_id).map((g) => g.session_id!))
    const totalPreFormSessions  = uniquePreFormSessions.size

    if (totalPreFormSessions > 0) {
      evidences.push({
        organization_id:  orgId,
        indicator_number: 4,
        evidence_type:    'evaluation',
        source:           'system',
        entity_type:      'program',
        entity_id:        orgId,
        entity_name:      'Organisation',
        title:            `Analyse du besoin — ${totalPreFormSessions} session(s) avec éval. pré-formation`,
        description:      `${preFormGrades.length} évaluation(s) pré-formation réalisée(s) sur ${totalPreFormSessions} session(s)`,
        status:           'valid',
        confidence_score: 90,
        event_date:       now,
        metadata: { sessions_with_pre_form: totalPreFormSessions, total_pre_form_evals: preFormGrades.length },
      })
      inserted.push('org:4:pre-form')

      evidences.push({
        organization_id:  orgId,
        indicator_number: 8,
        evidence_type:    'evaluation',
        source:           'system',
        entity_type:      'program',
        entity_id:        orgId,
        entity_name:      'Organisation',
        title:            `Positionnement initial — ${totalPreFormSessions} session(s) positionnées`,
        description:      `Procédures de positionnement documentées : ${preFormGrades.length} évaluation(s) pré-formation`,
        status:           'valid',
        confidence_score: 90,
        event_date:       now,
        metadata: {
          sessions_with_positioning: totalPreFormSessions,
          total_positioning_evals:   preFormGrades.length,
          assessment_type:           'pre_formation',
        },
      })
      inserted.push('org:8:positioning')
    } else {
      for (const [indNum, title, desc] of [
        [4, 'Analyse du besoin',       "Créez des évaluations de type « pré-formation » pour documenter l'analyse des besoins"],
        [8, 'Positionnement initial',  "Créez des évaluations de type « pré-formation » pour documenter les procédures de positionnement"],
      ] as [number, string, string][]) {
        evidences.push({
          organization_id:  orgId,
          indicator_number: indNum,
          evidence_type:    'evaluation',
          source:           'system',
          entity_type:      'program',
          entity_id:        orgId,
          entity_name:      'Organisation',
          title:            `${title} — Aucune évaluation pré-formation enregistrée`,
          description:      desc,
          status:           'pending',
          confidence_score: 0,
          event_date:       now,
          metadata:         { sessions_with_pre_form: 0, total_pre_form_evals: 0 },
        })
        inserted.push(`org:${indNum}:pending`)
      }
    }

    // 4) Ind. 3 – Délais d'accès réels (via RPC) ─────────────────────────────
    const { data: delayStats } = await (supabase as any).rpc('get_c1_access_delay_stats', { org_id: orgId })

    const delay            = Array.isArray(delayStats) && delayStats.length > 0 ? delayStats[0] : null
    const totalEnrollments = delay?.total_enrollments ? Number(delay.total_enrollments) : 0

    if (delay && totalEnrollments > 0) {
      const avgDays    = Number(delay.avg_days ?? 0)
      const ind3Status = (avgDays <= 15 ? 'valid' : avgDays <= 30 ? 'pending' : 'invalid') as 'valid' | 'pending' | 'invalid'

      evidences.push({
        organization_id:  orgId,
        indicator_number: 3,
        evidence_type:    'data_point',
        source:           'system',
        entity_type:      'program',
        entity_id:        orgId,
        entity_name:      'Organisation',
        title:            `Délais d'accès — Moyenne ${avgDays} j (${totalEnrollments} inscriptions)`,
        description:      `Délai moyen d'accès : ${avgDays} j (médiane ${delay.median_days} j) — ${totalEnrollments} inscription(s) analysée(s)`,
        status:           ind3Status,
        confidence_score: 100,
        event_date:       now,
        metadata: {
          avg_days:          avgDays,
          median_days:       Number(delay.median_days ?? 0),
          min_days:          Number(delay.min_days ?? 0),
          max_days:          Number(delay.max_days ?? 0),
          pct_under_10:      Number(delay.pct_under_10 ?? 0),
          pct_under_30:      Number(delay.pct_under_30 ?? 0),
          total_enrollments: totalEnrollments,
        },
      })
      inserted.push('org:3:delay-stats')
    } else {
      for (const p of programs ?? []) {
        const hasDuration = p.duration_days != null || p.duration_unit != null
        if (!hasDuration) continue
        const durationDesc = p.duration_days != null
          ? `${p.duration_days} jour(s)${p.duration_unit ? ` (${p.duration_unit})` : ''}`
          : p.duration_unit ?? 'Durée renseignée'
        evidences.push({
          organization_id:  orgId,
          indicator_number: 3,
          evidence_type:    'document',
          source:           'system',
          entity_type:      'program',
          entity_id:        p.id,
          entity_name:      p.name ?? 'Programme',
          title:            `Durée programme - ${p.name ?? 'Programme'}`,
          description:      `Durée publiée : ${durationDesc} — aucune inscription enregistrée pour calculer le délai réel`,
          status:           'pending',
          confidence_score: 50,
          event_date:       now,
          metadata:         { duration_days: p.duration_days, duration_unit: p.duration_unit, fallback: true },
        })
        inserted.push(`program:${p.id}:3:fallback`)
      }
    }

    // 5) Accessibilité (Ind. 16) ──────────────────────────────────────────────
    const { data: accessibility } = await supabase
      .from('accessibility_configurations')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (accessibility) {
      evidences.push({
        organization_id:  orgId,
        indicator_number: 16,
        evidence_type:    'document',
        source:           'system',
        entity_type:      'document',
        entity_id:        accessibility.id,
        entity_name:      'Configuration accessibilité',
        title:            'Accessibilité configurée',
        description:      "Référent handicap et politique d'accessibilité renseignés",
        status:           'valid',
        confidence_score: 100,
        event_date:       now,
        metadata:         { has_accessibility_config: true },
      })
      inserted.push('accessibility')
    }

    // 6) Conventions / contrats signés (Ind. 10) ──────────────────────────────
    const { data: conventionDocs } = await supabase
      .from('documents')
      .select('id, title')
      .eq('organization_id', orgId)
      .in('type', ['convention', 'contrat'])
      .limit(5000)

    const docIds = (conventionDocs ?? []).map((d) => d.id)
    let signedDocIds = new Set<string>()
    if (docIds.length > 0) {
      const { data: sigReqs } = await supabase
        .from('signature_requests')
        .select('document_id, status')
        .in('document_id', docIds)
      signedDocIds = new Set(
        (sigReqs ?? [])
          .filter((s: { document_id: string; status: string }) => s.status === 'signed')
          .map((s: { document_id: string }) => s.document_id)
      )
    }
    const { data: signedByStatus } = await supabase
      .from('documents')
      .select('id, title')
      .eq('organization_id', orgId)
      .in('type', ['convention', 'contrat'])
      .eq('status', 'signed')
      .limit(5000)
    for (const d of signedByStatus ?? []) signedDocIds.add(d.id)

    for (const d of conventionDocs ?? []) {
      if (!signedDocIds.has(d.id)) continue
      evidences.push({
        organization_id:  orgId,
        indicator_number: 10,
        evidence_type:    'contract',
        source:           'system',
        entity_type:      'document',
        entity_id:        d.id,
        entity_name:      d.title ?? 'Convention',
        title:            `Convention signée - ${d.title ?? d.id}`,
        description:      'Convention de formation signée',
        status:           'valid',
        confidence_score: 100,
        event_date:       now,
        metadata:         { total_signed: signedDocIds.size, document_type: 'convention' },
      })
      inserted.push(`convention:${d.id}`)
    }

    // 7) Convocations – Ind. 9 et Ind. 10 ────────────────────────────────────
    const { data: convocationDocs } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .eq('organization_id', orgId)
      .eq('type', 'convocation')
      .limit(5000)

    const totalConvocations = convocationDocs?.length ?? 0
    for (const d of convocationDocs ?? []) {
      const title     = d.title ?? 'Convocation'
      const eventDate = d.created_at ?? now
      evidences.push({
        organization_id:  orgId,
        indicator_number: 9,
        evidence_type:    'document',
        source:           'system',
        entity_type:      'document',
        entity_id:        d.id,
        entity_name:      title,
        title:            `Conditions de déroulement - ${title}`,
        description:      'Convocation envoyée (conditions de déroulement)',
        status:           'valid',
        confidence_score: 100,
        event_date:       eventDate,
        metadata:         { total_convocations: totalConvocations, document_type: 'convocation' },
      })
      inserted.push(`convocation:${d.id}:9`)
      evidences.push({
        organization_id:  orgId,
        indicator_number: 10,
        evidence_type:    'document',
        source:           'system',
        entity_type:      'document',
        entity_id:        d.id,
        entity_name:      title,
        title:            `Convocation - ${title}`,
        description:      'Convocation envoyée aux stagiaires',
        status:           'valid',
        confidence_score: 100,
        event_date:       eventDate,
        metadata:         { total_convocations: totalConvocations, document_type: 'convocation' },
      })
      inserted.push(`convocation:${d.id}:10`)
    }

    // 8) Critère 3 — Ind. 11, 12, 13, 14, 15 ─────────────────────────────────

    // ── Ind. 11 – Évaluation de l'atteinte des objectifs ────────────────────
    const uniqueHotSessions = new Set(hotGrades.filter((g) => g.session_id).map((g) => g.session_id!))
    const totalHotSessions  = uniqueHotSessions.size

    evidences.push(totalHotSessions > 0 ? {
      organization_id:  orgId,
      indicator_number: 11,
      evidence_type:    'evaluation',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            `Évaluations à chaud — ${totalHotSessions} session(s) évaluées`,
      description:      `${hotGrades.length} évaluation(s) à chaud réalisée(s) sur ${totalHotSessions} session(s)`,
      status:           'valid',
      confidence_score: 100,
      event_date:       now,
      metadata:         { sessions_with_hot_eval: totalHotSessions, total_hot_evals: hotGrades.length, assessment_type: 'hot' },
    } : {
      organization_id:  orgId,
      indicator_number: 11,
      evidence_type:    'evaluation',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            "Évaluation atteinte objectifs — Aucune évaluation à chaud enregistrée",
      description:      "Créez des évaluations de type « à chaud » pour documenter l'atteinte des objectifs",
      status:           'pending',
      confidence_score: 0,
      event_date:       now,
      metadata:         { sessions_with_hot_eval: 0, total_hot_evals: 0 },
    })
    inserted.push(totalHotSessions > 0 ? 'org:11:hot-evals' : 'org:11:pending')

    // ── Ind. 12 – Engagement des bénéficiaires ───────────────────────────────
    const totalAttendance = allAttendance.length
    if (totalAttendance > 0) {
      const presentCount   = allAttendance.filter((a) => a.status === 'present' || a.status === 'late').length
      const engagementRate = Math.round((presentCount / totalAttendance) * 100)
      evidences.push({
        organization_id:  orgId,
        indicator_number: 12,
        evidence_type:    'attendance',
        source:           'system',
        entity_type:      'program',
        entity_id:        orgId,
        entity_name:      'Organisation',
        title:            `Engagement bénéficiaires — Présence ${engagementRate}% (${totalAttendance} pointages)`,
        description:      `${presentCount} présence(s) sur ${totalAttendance} pointage(s) — taux d'engagement ${engagementRate}%`,
        status:           engagementRate >= 70 ? 'valid' : 'pending',
        confidence_score: engagementRate,
        event_date:       now,
        metadata:         { total_pointages: totalAttendance, present_count: presentCount, engagement_rate: engagementRate },
      })
      inserted.push('org:12:attendance')
    } else {
      evidences.push({
        organization_id:  orgId,
        indicator_number: 12,
        evidence_type:    'attendance',
        source:           'system',
        entity_type:      'program',
        entity_id:        orgId,
        entity_name:      'Organisation',
        title:            "Engagement bénéficiaires — Aucun émargement enregistré",
        description:      "Saisissez les présences dans les sessions pour mesurer l'engagement",
        status:           'pending',
        confidence_score: 0,
        event_date:       now,
        metadata:         { total_pointages: 0, present_count: 0, engagement_rate: 0 },
      })
      inserted.push('org:12:pending')
    }

    // ── Ind. 13 – Coordination des intervenants ──────────────────────────────
    const { data: conventionFormateur } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .eq('organization_id', orgId)
      .eq('type', 'convention_formateur')
      .limit(5000)
    const totalConvFormateur   = conventionFormateur?.length ?? 0
    const totalTeacherSessions = sessionsWithTeacher.length

    evidences.push(totalTeacherSessions > 0 || totalConvFormateur > 0 ? {
      organization_id:  orgId,
      indicator_number: 13,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            `Coordination intervenants — ${totalTeacherSessions} session(s) encadrées, ${totalConvFormateur} convention(s) formateur`,
      description:      `${totalTeacherSessions} session(s) avec formateur assigné · ${totalConvFormateur} convention(s) formateur`,
      status:           'valid',
      confidence_score: 100,
      event_date:       now,
      metadata:         { sessions_with_teacher: totalTeacherSessions, convention_formateur: totalConvFormateur },
    } : {
      organization_id:  orgId,
      indicator_number: 13,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            "Coordination intervenants — Aucun formateur assigné",
      description:      "Assignez des formateurs aux sessions et créez des conventions formateur pour documenter la coordination",
      status:           'pending',
      confidence_score: 0,
      event_date:       now,
      metadata:         { sessions_with_teacher: 0, convention_formateur: 0 },
    })
    inserted.push(totalTeacherSessions > 0 || totalConvFormateur > 0 ? 'org:13:teachers' : 'org:13:pending')

    // ── Ind. 14 & 15 – Spécifiques CFA ──────────────────────────────────────
    for (const [indNum, label] of [[14, 'Exercice de la citoyenneté'], [15, 'Accompagnement socio-professionnel']] as [number, string][]) {
      evidences.push({
        organization_id:  orgId,
        indicator_number: indNum,
        evidence_type:    'document',
        source:           'system',
        entity_type:      'program',
        entity_id:        orgId,
        entity_name:      'Organisation',
        title:            `${label} — Applicable aux CFA uniquement`,
        description:      "Cet indicateur est spécifique aux Centres de Formation d'Apprentis. Non applicable pour les organismes de formation classiques.",
        status:           'pending',
        confidence_score: 0,
        event_date:       now,
        metadata:         { cfa_only: true },
      })
      inserted.push(`org:${indNum}:cfa-only`)
    }

    // 9) Critère 4 — Adéquation des moyens pédagogiques (Ind. 17-20) ──────────
    const activeTeachersCount    = teachers.filter((t) => t.is_active !== false).length
    const teacherDocsCount       = teacherDocs.length
    const uniqueTeachersWithDocs = new Set(teacherDocs.map((d) => d.teacher_id)).size
    const totalProgramsCount     = (programs ?? []).length
    const hasTeacherMeans        = activeTeachersCount > 0 || teacherDocsCount > 0

    // ── Ind. 17 – Moyens humains et techniques ──────────────────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 17,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            hasTeacherMeans
        ? `Moyens pédagogiques — ${activeTeachersCount} formateur(s), ${teacherDocsCount} document(s)`
        : 'Moyens pédagogiques — Formateurs non encore renseignés',
      description:      hasTeacherMeans
        ? `${activeTeachersCount} formateur(s) actif(s) · ${teacherDocsCount} document(s) formateurs · ${allSessionIds.length} session(s) au total`
        : "Ajoutez des formateurs dans votre équipe et renseignez leurs documents (CV, certifications…)",
      status:           activeTeachersCount >= 1 ? 'valid' : 'pending',
      confidence_score: activeTeachersCount >= 1 ? Math.min(100, 60 + teacherDocsCount * 5) : 0,
      event_date:       now,
      metadata:         { active_teachers: activeTeachersCount, teacher_docs_count: teacherDocsCount, total_sessions: allSessionIds.length },
    })
    inserted.push('org:17:teachers')

    // ── Ind. 18 – Coordination alternants (CFA uniquement) ──────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 18,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            "Coordination alternants — Applicable aux CFA uniquement",
      description:      "Cet indicateur est spécifique aux Centres de Formation d'Apprentis.",
      status:           'pending',
      confidence_score: 0,
      event_date:       now,
      metadata:         { cfa_only: true },
    })
    inserted.push('org:18:cfa-only')

    // ── Ind. 19 – Ressources pédagogiques ───────────────────────────────────
    const programsWithContent19 = (programs ?? []).filter(
      (p) => isFieldFilled(p.training_content) || isFieldFilled(p.pedagogical_objectives)
    )
    const contentRatio19 = totalProgramsCount > 0
      ? Math.round((programsWithContent19.length / totalProgramsCount) * 100)
      : 0

    evidences.push({
      organization_id:  orgId,
      indicator_number: 19,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            programsWithContent19.length > 0
        ? `Ressources pédagogiques — ${programsWithContent19.length}/${totalProgramsCount} programme(s) documenté(s)`
        : 'Ressources pédagogiques — Contenu de formation non renseigné',
      description:      programsWithContent19.length > 0
        ? `${programsWithContent19.length} programme(s) avec objectifs pédagogiques et/ou contenu de formation définis`
        : 'Renseignez les objectifs et contenus de formation dans vos programmes.',
      status:           contentRatio19 >= 80 ? 'valid' : 'pending',
      confidence_score: contentRatio19,
      event_date:       now,
      metadata:         { programs_with_content: programsWithContent19.length, total_programs: totalProgramsCount, content_ratio: contentRatio19 },
    })
    inserted.push('org:19:content')

    // ── Ind. 20 – Personnel dédié handicap ──────────────────────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 20,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            accessibility
        ? "Personnel dédié handicap — Référent accessibilité renseigné"
        : "Personnel dédié handicap — Référent handicap non configuré",
      description:      accessibility
        ? "Un référent handicap est défini dans la configuration accessibilité de l'organisme."
        : "Configurez un référent handicap dans les paramètres d'accessibilité.",
      status:           accessibility ? 'valid' : 'pending',
      confidence_score: accessibility ? 100 : 0,
      event_date:       now,
      metadata:         { has_accessibility_config: !!accessibility },
    })
    inserted.push('org:20:handicap')

    // 10) Critère 5 — Qualification et développement des formateurs (Ind. 21-22) ─
    const qualKeywords = ['cv', 'diplome', 'diplôme', 'certificat', 'bac', 'licence', 'master', 'doctorat', 'qualification', 'titre']
    const qualDocs     = teacherDocs.filter((d) => qualKeywords.some((kw) => (d.document_type ?? '').toLowerCase().includes(kw)))
    const verifiedDocs = teacherDocs.filter((d) => d.verified === true)

    // ── Ind. 21 – Compétences des intervenants ──────────────────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 21,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            teacherDocs.length > 0
        ? `Compétences intervenants — ${teacherDocs.length} document(s) · ${uniqueTeachersWithDocs} formateur(s)`
        : "Compétences intervenants — Aucun document formateur enregistré",
      description:      teacherDocs.length > 0
        ? `${teacherDocs.length} document(s) formateur(s) · ${verifiedDocs.length} vérifié(s) · ${qualDocs.length} qualification(s) (CV, diplômes…)`
        : "Ajoutez des CV, diplômes et certifications pour chaque formateur.",
      status:           uniqueTeachersWithDocs > 0 && activeTeachersCount > 0 && uniqueTeachersWithDocs >= activeTeachersCount
        ? 'valid' : 'pending',
      confidence_score: activeTeachersCount > 0
        ? Math.round((uniqueTeachersWithDocs / activeTeachersCount) * 100)
        : teacherDocs.length > 0 ? 50 : 0,
      event_date:       now,
      metadata:         { total_teacher_docs: teacherDocs.length, teachers_with_docs: uniqueTeachersWithDocs, verified_docs: verifiedDocs.length, qualification_docs: qualDocs.length, active_teachers: activeTeachersCount },
    })
    inserted.push('org:21:qualifications')

    // ── Ind. 22 – Développement des compétences ─────────────────────────────
    const devKeywords = ['formation', 'perfectionnement', 'developpement', 'développement', 'attestation', 'cpf', 'foad', 'seminaire', 'séminaire', 'congres', 'congrès']
    const devDocs     = teacherDocs.filter((d) => devKeywords.some((kw) => (d.document_type ?? '').toLowerCase().includes(kw)))

    evidences.push({
      organization_id:  orgId,
      indicator_number: 22,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            devDocs.length > 0
        ? `Développement compétences — ${devDocs.length} document(s) de formation formateurs`
        : "Développement compétences — Non documenté",
      description:      devDocs.length > 0
        ? `${devDocs.length} document(s) attestant de la formation continue des intervenants`
        : "Ajoutez des attestations de formation continue (séminaires, CPF…) pour vos formateurs.",
      status:           devDocs.length > 0 ? 'valid' : 'pending',
      confidence_score: Math.min(100, devDocs.length * 20),
      event_date:       now,
      metadata:         { dev_docs_count: devDocs.length, total_docs: teacherDocs.length, active_teachers: activeTeachersCount },
    })
    inserted.push('org:22:dev-competences')

    // 11) Critère 6 — Inscription dans l'environnement professionnel (Ind. 23-28) ─

    // ── Ind. 23-25 – Veille ──────────────────────────────────────────────────
    for (const [indNum, label, desc] of [
      [23, 'Veille légale et réglementaire',       "Documentez vos activités de veille légale (bulletins officiels, formations réglementaires…)"],
      [24, 'Veille métiers et emploi',             "Documentez votre veille sur les métiers ciblés (études sectorielles, contacts employeurs…)"],
      [25, 'Veille technologique et pédagogique',  "Documentez votre veille sur les innovations pédagogiques et technologiques de votre secteur."],
    ] as [number, string, string][]) {
      evidences.push({
        organization_id:  orgId,
        indicator_number: indNum,
        evidence_type:    'document',
        source:           'system',
        entity_type:      'program',
        entity_id:        orgId,
        entity_name:      'Organisation',
        title:            `${label} — À documenter manuellement`,
        description:      desc,
        status:           'pending',
        confidence_score: 0,
        event_date:       now,
        metadata:         { requires_manual_evidence: true },
      })
      inserted.push(`org:${indNum}:veille`)
    }

    // ── Ind. 26 – Mobilisation des acteurs de l'orientation ─────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 26,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            "Mobilisation acteurs orientation — À documenter manuellement",
      description:      "Documentez vos partenariats avec les acteurs de l'orientation (Pôle Emploi, OPCO, Régions…).",
      status:           'pending',
      confidence_score: 0,
      event_date:       now,
      metadata:         { requires_manual_evidence: true },
    })
    inserted.push('org:26:acteurs')

    // ── Ind. 27 – Réseau CFA (CFA uniquement) ───────────────────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 27,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            "Réseau CFA — Applicable aux CFA uniquement",
      description:      "Cet indicateur est spécifique aux Centres de Formation d'Apprentis.",
      status:           'pending',
      confidence_score: 0,
      event_date:       now,
      metadata:         { cfa_only: true },
    })
    inserted.push('org:27:cfa-only')

    // ── Ind. 28 – Ingénierie de formation ───────────────────────────────────
    const programsFullyDefined = (programs ?? []).filter((p) =>
      isFieldFilled(p.pedagogical_objectives) &&
      isFieldFilled(p.training_content) &&
      isFieldFilled(p.modalities)
    )
    const engineeringScore = totalProgramsCount > 0
      ? Math.round((programsFullyDefined.length / totalProgramsCount) * 100)
      : 0

    evidences.push({
      organization_id:  orgId,
      indicator_number: 28,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            totalProgramsCount > 0
        ? `Ingénierie de formation — ${totalProgramsCount} programme(s) · ${programsFullyDefined.length} complet(s)`
        : "Ingénierie de formation — Aucun programme créé",
      description:      totalProgramsCount > 0
        ? `${programsFullyDefined.length}/${totalProgramsCount} programme(s) avec objectifs, contenu et modalités définis`
        : "Créez des programmes de formation pour documenter votre activité d'ingénierie pédagogique.",
      status:           programsFullyDefined.length > 0 ? 'valid' : 'pending',
      confidence_score: engineeringScore,
      event_date:       now,
      metadata:         { total_programs: totalProgramsCount, programs_fully_defined: programsFullyDefined.length, engineering_score: engineeringScore },
    })
    inserted.push('org:28:ingenierie')

    // 12) Critère 7 — Appréciations et amélioration continue (Ind. 30-32) ──────
    const totalCA        = correctiveActions.length
    const completedCA    = correctiveActions.filter((a) => a.status === 'completed')
    const pendingCA      = correctiveActions.filter((a) => a.status === 'pending' || a.status === 'in_progress')
    const completionRate = totalCA > 0 ? Math.round((completedCA.length / totalCA) * 100) : 0

    // ── Ind. 30 – Traitement des réclamations ───────────────────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 30,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            totalCA > 0
        ? `Traitement réclamations — ${totalCA} action(s) corrective(s) enregistrée(s)`
        : "Traitement réclamations — Aucune action corrective enregistrée",
      description:      totalCA > 0
        ? `${completedCA.length} résolue(s), ${pendingCA.length} en cours`
        : "Enregistrez les réclamations et actions correctives pour documenter leur traitement.",
      status:           totalCA > 0 ? 'valid' : 'pending',
      confidence_score: totalCA > 0 ? 80 : 0,
      event_date:       now,
      metadata:         { total_actions: totalCA, completed_actions: completedCA.length, pending_actions: pendingCA.length },
    })
    inserted.push('org:30:reclamations')

    // ── Ind. 31 – Mesures d'amélioration ────────────────────────────────────
    evidences.push({
      organization_id:  orgId,
      indicator_number: 31,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            completedCA.length > 0
        ? `Mesures d'amélioration — ${completedCA.length} action(s) réalisée(s)`
        : "Mesures d'amélioration — Aucune action complétée",
      description:      completedCA.length > 0
        ? `${completedCA.length} action(s) corrective(s) complétée(s) sur ${totalCA} (${completionRate}%)`
        : "Marquez des actions correctives comme réalisées pour documenter vos mesures d'amélioration.",
      status:           completedCA.length > 0 ? 'valid' : 'pending',
      confidence_score: completionRate,
      event_date:       now,
      metadata:         { completed_actions: completedCA.length, total_actions: totalCA, completion_rate: completionRate },
    })
    inserted.push('org:31:amelioration')

    // ── Ind. 32 – Amélioration continue ─────────────────────────────────────
    const hasContinuousImprovement = totalCA >= 2 && completedCA.length >= 1
    evidences.push({
      organization_id:  orgId,
      indicator_number: 32,
      evidence_type:    'document',
      source:           'system',
      entity_type:      'program',
      entity_id:        orgId,
      entity_name:      'Organisation',
      title:            hasContinuousImprovement
        ? `Amélioration continue — ${completionRate}% de résolution (${totalCA} actions)`
        : totalCA > 0
        ? `Amélioration continue — ${totalCA} action(s) en cours`
        : "Amélioration continue — Non documentée",
      description:      hasContinuousImprovement
        ? `Démarche active : ${completedCA.length}/${totalCA} actions résolues`
        : totalCA > 0
        ? "Des actions sont enregistrées — complétez-en pour démontrer l'amélioration continue."
        : "Créez et résolvez des actions correctives pour documenter votre démarche d'amélioration.",
      status:           hasContinuousImprovement ? 'valid' : 'pending',
      confidence_score: hasContinuousImprovement ? completionRate : 0,
      event_date:       now,
      metadata: {
        total_actions:          totalCA,
        completed_actions:      completedCA.length,
        pending_actions:        pendingCA.length,
        completion_rate:        completionRate,
        continuous_improvement: hasContinuousImprovement,
      },
    })
    inserted.push('org:32:amelioration-continue')

    // ── Insertion bulk de toutes les preuves collectées ──────────────────────
    await bulkInsert(supabase, evidences)

    // 13) Recalcul des statuts qualiopi_indicators depuis les preuves ──────────
    const IND_TO_CODE: Record<number, string> = {
      1:'1.1', 2:'1.2', 3:'1.3',
      4:'2.1', 5:'2.2', 6:'2.3', 7:'2.4', 8:'2.5',
      9:'3.1', 10:'3.2', 11:'3.3', 12:'3.4', 13:'3.5', 14:'3.6', 15:'3.7', 16:'3.8',
      17:'4.1', 18:'4.2', 19:'4.3', 20:'4.4',
      21:'5.1', 22:'5.2',
      23:'6.1', 24:'6.2', 25:'6.3', 26:'6.4', 27:'6.5', 28:'6.6',
      29:'7.1', 30:'7.2', 31:'7.3', 32:'7.4',
    }

    const { data: allOrgEvidence } = await supabase
      .from('compliance_evidence_automated')
      .select('indicator_number, status, confidence_score')
      .eq('organization_id', orgId)

    type IndSummary = { hasValid: boolean; hasPending: boolean; maxScore: number }
    const indSummary = new Map<number, IndSummary>()
    for (const e of allOrgEvidence ?? []) {
      const n    = e.indicator_number
      const prev = indSummary.get(n) ?? { hasValid: false, hasPending: false, maxScore: 0 }
      indSummary.set(n, {
        hasValid:   prev.hasValid   || e.status === 'valid',
        hasPending: prev.hasPending || e.status === 'pending',
        maxScore:   Math.max(prev.maxScore, e.confidence_score ?? 0),
      })
    }

    const isoNow = new Date().toISOString()
    await Promise.all(
      Object.entries(IND_TO_CODE).map(([numStr, code]) => {
        const n       = parseInt(numStr)
        const summary = indSummary.get(n)
        if (!summary) return Promise.resolve()

        const newStatus = summary.hasValid ? 'compliant' : 'in_progress'
        const newRate   = summary.hasValid ? summary.maxScore : Math.round(summary.maxScore * 0.5)

        return supabase
          .from('qualiopi_indicators')
          .update({
            status:               newStatus,
            compliance_rate:      newRate,
            last_evaluation_date: isoNow.split('T')[0],
            updated_at:           isoNow,
          })
          .eq('organization_id', orgId)
          .eq('indicator_code', code)
      })
    )

  return { count: inserted.length }
}

/**
 * POST /api/qualiopi/sync-evidence
 * Démarre la synchronisation en arrière-plan via after() et répond immédiatement.
 * Un lock Redis par organisation empêche les syncs simultanés pour la même org.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const locked = await acquireOrgLock('sync-evidence', orgId)
    if (!locked) {
      return NextResponse.json({
        success: true,
        status:  'already_running',
        message: 'Synchronisation déjà en cours pour cette organisation',
      })
    }

    after(
      doSync(orgId)
        .catch((e) => console.error('[sync-evidence:background]', e))
        .finally(() => releaseOrgLock('sync-evidence', orgId))
    )

    return NextResponse.json({
      success: true,
      status:  'queued',
      message: 'Synchronisation démarrée en arrière-plan',
    })
  } catch (e) {
    console.error('[sync-evidence]', e)
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation des preuves' },
      { status: 500 }
    )
  }
}
