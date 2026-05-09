import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Tool definitions for Claude ────────────────────────────────────────────

export const AI_TOOLS: Tool[] = [
  {
    name: 'list_sessions',
    description: 'Lister les sessions de formation de l\'organisation, avec filtres optionnels sur le statut et les dates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['planned', 'ongoing', 'completed', 'cancelled'],
          description: 'Filtrer par statut de la session',
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut : 10)',
        },
        upcoming_only: {
          type: 'boolean',
          description: 'Si true, ne retourne que les sessions futures',
        },
      },
    },
  },
  {
    name: 'list_formations',
    description: 'Lister les formations disponibles dans l\'organisation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        active_only: {
          type: 'boolean',
          description: 'Si true, ne retourne que les formations actives (défaut : true)',
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut : 10)',
        },
      },
    },
  },
  {
    name: 'create_session',
    description: 'Créer une nouvelle session de formation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        formation_id: {
          type: 'string',
          description: 'UUID de la formation parente',
        },
        name: {
          type: 'string',
          description: 'Nom de la session',
        },
        start_date: {
          type: 'string',
          description: 'Date de début au format YYYY-MM-DD',
        },
        end_date: {
          type: 'string',
          description: 'Date de fin au format YYYY-MM-DD',
        },
        location: {
          type: 'string',
          description: 'Lieu de la session (optionnel)',
        },
        capacity_max: {
          type: 'number',
          description: 'Capacité maximale (optionnel)',
        },
      },
      required: ['formation_id', 'name', 'start_date', 'end_date'],
    },
  },
  {
    name: 'search_students',
    description: 'Rechercher des apprenants par nom, prénom ou email.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Terme de recherche (nom, prénom ou email)',
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut : 10)',
        },
      },
    },
  },
  {
    name: 'check_attendance',
    description: 'Vérifier l\'état des émargements (feuilles de présence) pour une ou plusieurs sessions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID de la session spécifique (optionnel, si absent : vérification globale)',
        },
        status_filter: {
          type: 'string',
          enum: ['draft', 'active', 'closed'],
          description: 'Filtrer les émargements par statut',
        },
        unsigned_only: {
          type: 'boolean',
          description: 'Si true, ne retourne que les émargements non clôturés / non signés',
        },
      },
    },
  },
  {
    name: 'get_qualiopi_status',
    description: 'Obtenir l\'état de conformité Qualiopi de l\'organisation, indicateur par indicateur.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status_filter: {
          type: 'string',
          enum: ['not_started', 'in_progress', 'compliant', 'non_compliant', 'needs_improvement'],
          description: 'Filtrer par statut de conformité',
        },
        criterion: {
          type: 'string',
          description: 'Filtrer par critère (ex: "1", "2", "3"...)',
        },
      },
    },
  },
  {
    name: 'list_calendar_events',
    description: 'Lister les événements à venir dans le calendrier de l\'organisation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Nombre maximum d\'événements à retourner (défaut : 10)',
        },
        days_ahead: {
          type: 'number',
          description: 'Nombre de jours à l\'avance à afficher (défaut : 30)',
        },
      },
    },
  },
  {
    name: 'get_dashboard_stats',
    description: 'Obtenir les statistiques clés de l\'organisation : nombre de sessions actives, apprenants, formations, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'list_programs',
    description: 'Lister les programmes de l\'organisation (niveau supérieur qui regroupe les formations).',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut : 20)',
        },
      },
    },
  },
  {
    name: 'create_program',
    description: 'Créer un nouveau programme de formation. Avant d\'appeler cet outil, l\'agent DOIT avoir collecté auprès de l\'utilisateur : la description, les objectifs pédagogiques, le contenu, les modalités, le profil des apprenants, le prix et la durée.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'Code unique du programme (ex: PROG-001)',
        },
        name: {
          type: 'string',
          description: 'Nom du programme',
        },
        description: {
          type: 'string',
          description: 'Description générale du programme',
        },
        pedagogical_objectives: {
          type: 'string',
          description: 'Objectifs pédagogiques : ce que l\'apprenant saura faire à l\'issue de la formation',
        },
        training_content: {
          type: 'string',
          description: 'Contenu détaillé de la formation (modules, chapitres, thèmes abordés)',
        },
        modalities: {
          type: 'string',
          description: 'Modalités pédagogiques : présentiel, distanciel, mixte, e-learning, etc.',
        },
        learner_profile: {
          type: 'string',
          description: 'Profil et prérequis des apprenants ciblés',
        },
        price: {
          type: 'number',
          description: 'Prix du programme (en EUR)',
        },
        duration_hours: {
          type: 'number',
          description: 'Durée totale en heures',
        },
        duration_days: {
          type: 'number',
          description: 'Durée totale en jours (alternative aux heures)',
        },
        category: {
          type: 'string',
          description: 'Catégorie ou domaine du programme (optionnel)',
        },
      },
      required: ['code', 'name', 'description', 'pedagogical_objectives', 'training_content', 'modalities', 'learner_profile', 'price'],
    },
  },
  {
    name: 'create_formation',
    description: 'Créer une nouvelle formation (peut être rattachée à un programme existant).',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'Code unique de la formation (ex: FORM-001)',
        },
        name: {
          type: 'string',
          description: 'Nom de la formation',
        },
        description: {
          type: 'string',
          description: 'Description de la formation (optionnel)',
        },
        category: {
          type: 'string',
          description: 'Catégorie ou domaine (optionnel)',
        },
        duration_hours: {
          type: 'number',
          description: 'Durée en heures (optionnel)',
        },
        price: {
          type: 'number',
          description: 'Prix en EUR (optionnel, défaut : 0)',
        },
        program_id: {
          type: 'string',
          description: 'UUID du programme parent (optionnel)',
        },
        prerequisites: {
          type: 'string',
          description: 'Prérequis nécessaires (optionnel)',
        },
        capacity_max: {
          type: 'number',
          description: 'Capacité maximale d\'apprenants (optionnel)',
        },
      },
      required: ['code', 'name'],
    },
  },
  {
    name: 'create_student',
    description: 'Créer un nouvel apprenant dans l\'organisation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        first_name: {
          type: 'string',
          description: 'Prénom de l\'apprenant',
        },
        last_name: {
          type: 'string',
          description: 'Nom de famille de l\'apprenant',
        },
        email: {
          type: 'string',
          description: 'Adresse email (optionnel)',
        },
        phone: {
          type: 'string',
          description: 'Numéro de téléphone (optionnel)',
        },
        date_of_birth: {
          type: 'string',
          description: 'Date de naissance au format YYYY-MM-DD (optionnel)',
        },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
          description: 'Genre (optionnel)',
        },
        address: {
          type: 'string',
          description: 'Adresse postale (optionnel)',
        },
      },
      required: ['first_name', 'last_name', 'email'],
    },
  },
  {
    name: 'send_document_for_signature',
    description: 'Générer un document (devis ou convention de formation) et l\'envoyer par email à l\'apprenant pour signature électronique.',
    input_schema: {
      type: 'object' as const,
      properties: {
        document_type: {
          type: 'string',
          enum: ['convention', 'devis'],
          description: 'Type de document à envoyer : "convention" pour une convention de formation, "devis" pour un devis',
        },
        student_id: {
          type: 'string',
          description: 'UUID de l\'apprenant destinataire',
        },
        session_id: {
          type: 'string',
          description: 'UUID de la session concernée',
        },
        enrollment_id: {
          type: 'string',
          description: 'UUID de l\'inscription (optionnel)',
        },
      },
      required: ['document_type', 'student_id', 'session_id'],
    },
  },
  {
    name: 'enroll_student',
    description: 'Inscrire un apprenant à une session de formation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        student_id: {
          type: 'string',
          description: 'UUID de l\'apprenant',
        },
        session_id: {
          type: 'string',
          description: 'UUID de la session',
        },
        total_amount: {
          type: 'number',
          description: 'Montant total de la formation en EUR (optionnel, défaut : 0)',
        },
        status: {
          type: 'string',
          enum: ['pending', 'active', 'confirmed', 'cancelled'],
          description: 'Statut de l\'inscription (défaut : pending)',
        },
      },
      required: ['student_id', 'session_id'],
    },
  },
  {
    name: 'get_session_details',
    description: 'Obtenir les détails complets d\'une session : apprenants inscrits, places disponibles, statut, formation parente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID de la session',
        },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'update_entity_status',
    description: 'Modifier le statut d\'une session ou d\'une inscription. Demande confirmation avant d\'agir.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity_type: {
          type: 'string',
          enum: ['session', 'enrollment'],
          description: '"session" pour changer le statut d\'une session, "enrollment" pour changer le statut d\'une inscription',
        },
        entity_id: {
          type: 'string',
          description: 'UUID de la session ou de l\'inscription à modifier',
        },
        new_status: {
          type: 'string',
          description: 'Nouveau statut. Sessions : planned | ongoing | completed | cancelled. Inscriptions : pending | active | confirmed | cancelled',
        },
      },
      required: ['entity_type', 'entity_id', 'new_status'],
    },
  },
  {
    name: 'list_enrollments',
    description: 'Lister les inscriptions d\'un apprenant (son parcours de formations) ou les inscriptions d\'une session.',
    input_schema: {
      type: 'object' as const,
      properties: {
        student_id: {
          type: 'string',
          description: 'UUID de l\'apprenant dont on veut voir les inscriptions (optionnel)',
        },
        session_id: {
          type: 'string',
          description: 'UUID de la session dont on veut voir les inscrits (optionnel)',
        },
        status: {
          type: 'string',
          enum: ['pending', 'active', 'confirmed', 'cancelled'],
          description: 'Filtrer par statut d\'inscription (optionnel)',
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut : 20)',
        },
      },
    },
  },
  {
    name: 'send_bulk_documents',
    description: 'Envoyer un document (devis ou convention) à TOUS les apprenants inscrits d\'une session en une seule opération. Envoie uniquement aux apprenants non annulés ayant une adresse email.',
    input_schema: {
      type: 'object' as const,
      properties: {
        document_type: {
          type: 'string',
          enum: ['convention', 'devis'],
          description: 'Type de document à envoyer',
        },
        session_id: {
          type: 'string',
          description: 'UUID de la session dont on veut contacter tous les apprenants',
        },
      },
      required: ['document_type', 'session_id'],
    },
  },
]

// ─── Tool handlers ────────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>

export async function executeTool(
  toolName: string,
  toolInput: ToolInput,
  supabase: SupabaseClient,
  organizationId: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'list_sessions':
        return await listSessions(toolInput, supabase, organizationId)
      case 'list_formations':
        return await listFormations(toolInput, supabase, organizationId)
      case 'create_session':
        return await createSession(toolInput, supabase, organizationId)
      case 'search_students':
        return await searchStudents(toolInput, supabase, organizationId)
      case 'check_attendance':
        return await checkAttendance(toolInput, supabase, organizationId)
      case 'get_qualiopi_status':
        return await getQualiopi(toolInput, supabase, organizationId)
      case 'list_calendar_events':
        return await listCalendarEvents(toolInput, supabase, organizationId)
      case 'get_dashboard_stats':
        return await getDashboardStats(supabase, organizationId)
      case 'list_programs':
        return await listPrograms(toolInput, supabase, organizationId)
      case 'create_program':
        return await createProgram(toolInput, supabase, organizationId)
      case 'create_formation':
        return await createFormation(toolInput, supabase, organizationId)
      case 'create_student':
        return await createStudent(toolInput, supabase, organizationId)
      case 'enroll_student':
        return await enrollStudent(toolInput, supabase)
      case 'send_document_for_signature':
        return await sendDocumentForSignature(toolInput, supabase, organizationId)
      case 'get_session_details':
        return await getSessionDetails(toolInput, supabase)
      case 'update_entity_status':
        return await updateEntityStatus(toolInput, supabase)
      case 'list_enrollments':
        return await listEnrollments(toolInput, supabase)
      case 'send_bulk_documents':
        return await sendBulkDocuments(toolInput, supabase, organizationId)
      default:
        return `Outil inconnu : ${toolName}`
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return `Erreur lors de l'exécution de l'outil ${toolName} : ${message}`
  }
}

// ─── Individual handlers ──────────────────────────────────────────────────────

async function listSessions(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const limit = (input.limit as number) ?? 10
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('sessions')
    .select(`
      id, name, start_date, end_date, start_time, end_time,
      location, status, capacity_max,
      formations!inner(name, organization_id)
    `)
    .eq('formations.organization_id', orgId)
    .order('start_date', { ascending: true })
    .limit(limit)

  if (input.status) {
    query = query.eq('status', input.status as string)
  }
  if (input.upcoming_only) {
    query = query.gte('start_date', today)
  }

  const { data, error } = await query
  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return 'Aucune session trouvée.'

  const rows = data.map((s: Record<string, unknown>) => {
    const formation = s.formations as Record<string, unknown> | null
    return `• [${s.id}] ${s.name} — ${s.start_date} au ${s.end_date}` +
      `${s.location ? ` (${s.location})` : ''} — Statut : ${s.status}` +
      `${formation ? ` — Formation : ${formation.name}` : ''}`
  })
  return `${data.length} session(s) trouvée(s) :\n${rows.join('\n')}`
}

async function listFormations(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const limit = (input.limit as number) ?? 10
  const activeOnly = input.active_only !== false

  let query = supabase
    .from('formations')
    .select('id, code, name, category, duration_hours, duration_days, is_active, price, currency')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })
    .limit(limit)

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return 'Aucune formation trouvée.'

  const rows = data.map((f: Record<string, unknown>) =>
    `• [${f.id}] ${f.code} — ${f.name}` +
    `${f.duration_hours ? ` (${f.duration_hours}h)` : f.duration_days ? ` (${f.duration_days}j)` : ''}` +
    `${f.price ? ` — ${f.price} ${f.currency ?? 'EUR'}` : ''}`
  )
  return `${data.length} formation(s) :\n${rows.join('\n')}`
}

async function createSession(input: ToolInput, supabase: SupabaseClient, _orgId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      formation_id: input.formation_id as string,
      name: input.name as string,
      start_date: input.start_date as string,
      end_date: input.end_date as string,
      location: (input.location as string) ?? null,
      capacity_max: (input.capacity_max as number) ?? null,
      status: 'planned',
    })
    .select('id, name, start_date, end_date')
    .single()

  if (error) return `Erreur lors de la création : ${error.message}`
  return (
    `Session créée avec succès !\n` +
    `• ID : ${data.id}\n` +
    `• Nom : ${data.name}\n` +
    `• Du ${data.start_date} au ${data.end_date}\n` +
    `[Voir la session →](/dashboard/sessions/${data.id})`
  )
}

async function searchStudents(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const q = (input.query as string) ?? ''
  const limit = (input.limit as number) ?? 20

  let query = supabase
    .from('students')
    .select('id, first_name, last_name, email, student_number')
    .eq('organization_id', orgId)
    .limit(limit)

  if (q.trim()) {
    // Split multi-word queries so "Legrand AIRTONE" matches across first_name + last_name
    const words = q.trim().split(/\s+/).filter(Boolean)
    const clauses = words
      .flatMap((w) => [`first_name.ilike.%${w}%`, `last_name.ilike.%${w}%`, `email.ilike.%${w}%`])
      .join(',')
    query = query.or(clauses)
  }

  const { data, error } = await query
  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return 'Aucun apprenant trouvé.'

  const rows = data.map((s: Record<string, unknown>) =>
    `• [${s.id}] ${s.first_name ?? ''} ${s.last_name ?? ''}${s.email ? ` — ${s.email}` : ''}${s.student_number ? ` (n°${s.student_number})` : ''}`
  )
  return `${data.length} apprenant(s) trouvé(s) :\n${rows.join('\n')}`
}

async function checkAttendance(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  let query = supabase
    .from('electronic_attendance_sessions')
    .select('id, title, date, status, require_signature, session_id')
    .eq('organization_id', orgId)
    .order('date', { ascending: false })
    .limit(20)

  if (input.session_id) {
    query = query.eq('session_id', input.session_id as string)
  }
  if (input.status_filter) {
    query = query.eq('status', input.status_filter as string)
  }
  if (input.unsigned_only) {
    query = query.neq('status', 'closed')
  }

  const { data, error } = await query
  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return 'Aucun émargement trouvé pour ces critères.'

  const statusLabel: Record<string, string> = {
    draft: '⏳ Brouillon',
    active: '✅ Actif',
    closed: '🔒 Clôturé',
    cancelled: '❌ Annulé',
  }

  const rows = data.map((a: Record<string, unknown>) =>
    `• ${a.title} — ${a.date} — ${statusLabel[a.status as string] ?? a.status}${a.require_signature ? ' (signature requise)' : ''}`
  )
  const unsigned = data.filter((a: Record<string, unknown>) => a.status !== 'closed').length
  return `${data.length} émargement(s) — ${unsigned} non clôturé(s) :\n${rows.join('\n')}`
}

async function getQualiopi(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  let query = supabase
    .from('qualiopi_indicators')
    .select('indicator_code, indicator_name, category, status, compliance_rate, notes')
    .eq('organization_id', orgId)
    .order('indicator_code', { ascending: true })

  if (input.status_filter) {
    query = query.eq('status', input.status_filter as string)
  }
  if (input.criterion) {
    query = query.like('indicator_code', `${input.criterion}.%`)
  }

  const { data, error } = await query
  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return 'Aucun indicateur Qualiopi configuré dans votre organisation. Rendez-vous dans le module Qualiopi pour les initialiser.'

  const statusLabel: Record<string, string> = {
    not_started: '⬜ Non démarré',
    in_progress: '🔄 En cours',
    compliant: '✅ Conforme',
    non_compliant: '❌ Non conforme',
    needs_improvement: '⚠️ À améliorer',
  }

  const compliant = data.filter((i: Record<string, unknown>) => i.status === 'compliant').length
  const nonCompliant = data.filter((i: Record<string, unknown>) => i.status === 'non_compliant').length
  const rows = data.map((i: Record<string, unknown>) =>
    `• Ind. ${i.indicator_code} — ${i.indicator_name} — ${statusLabel[i.status as string] ?? i.status} (${i.compliance_rate ?? 0}%)`
  )

  return `**Conformité Qualiopi** — ${data.length} indicateur(s)\n` +
    `✅ Conformes : ${compliant} | ❌ Non conformes : ${nonCompliant} | ⬜ Autres : ${data.length - compliant - nonCompliant}\n\n` +
    rows.join('\n')
}

async function listCalendarEvents(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const limit = (input.limit as number) ?? 10
  const daysAhead = (input.days_ahead as number) ?? 30
  const today = new Date().toISOString()
  const until = new Date(Date.now() + daysAhead * 86400000).toISOString()

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_date, end_date, location, event_type')
    .gte('start_date', today)
    .lte('start_date', until)
    .order('start_date', { ascending: true })
    .limit(limit)

  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return `Aucun événement dans les ${daysAhead} prochains jours.`

  const rows = data.map((e: Record<string, unknown>) =>
    `• ${e.title} — ${new Date(e.start_date as string).toLocaleDateString('fr-FR')}${e.location ? ` @ ${e.location}` : ''}`
  )
  return `${data.length} événement(s) à venir :\n${rows.join('\n')}`
}

async function getDashboardStats(supabase: SupabaseClient, orgId: string) {
  const [sessionsRes, formationsRes, studentsRes, attendanceRes] = await Promise.all([
    supabase.from('sessions')
      .select('id, status', { count: 'exact' })
      .eq('formations.organization_id', orgId)
      .in('status', ['planned', 'ongoing'])
      .limit(1),
    supabase.from('formations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_active', true),
    supabase.from('students')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId),
    supabase.from('electronic_attendance_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .neq('status', 'closed'),
  ])

  return `**Tableau de bord EDUZEN**\n` +
    `• Sessions actives/planifiées : ${sessionsRes.count ?? 'N/A'}\n` +
    `• Formations actives : ${formationsRes.count ?? 'N/A'}\n` +
    `• Apprenants total : ${studentsRes.count ?? 'N/A'}\n` +
    `• Émargements non clôturés : ${attendanceRes.count ?? 'N/A'}`
}

async function listPrograms(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const limit = (input.limit as number) ?? 20
  const { data, error } = await supabase
    .from('programs')
    .select('id, code, name, description, category, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(limit)

  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return 'Aucun programme trouvé.'

  const rows = data.map((p: Record<string, unknown>) =>
    `• [${p.id}] ${p.code} — ${p.name}${p.category ? ` (${p.category})` : ''}`
  )
  return `${data.length} programme(s) :\n${rows.join('\n')}`
}

async function createProgram(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const durationUnit = input.duration_hours ? 'hours' : input.duration_days ? 'days' : null

  const { data, error } = await supabase
    .from('programs')
    .insert({
      organization_id: orgId,
      code: input.code as string,
      name: input.name as string,
      description: (input.description as string) ?? null,
      pedagogical_objectives: (input.pedagogical_objectives as string) ?? null,
      training_content: (input.training_content as string) ?? null,
      modalities: (input.modalities as string) ?? null,
      learner_profile: (input.learner_profile as string) ?? null,
      price: (input.price as number) ?? 0,
      currency: 'EUR',
      duration_hours: (input.duration_hours as number) ?? null,
      duration_days: (input.duration_days as number) ?? null,
      duration_unit: durationUnit,
      category: (input.category as string) ?? null,
      is_active: true,
    })
    .select('id, code, name, price, duration_hours, duration_days')
    .single()

  if (error) return `Erreur lors de la création du programme : ${error.message}`

  const duration = data.duration_hours
    ? `${data.duration_hours}h`
    : data.duration_days
      ? `${data.duration_days} jour(s)`
      : 'non renseignée'

  return (
    `Programme créé avec succès !\n` +
    `• ID : ${data.id}\n` +
    `• Code : ${data.code}\n` +
    `• Nom : ${data.name}\n` +
    `• Prix : ${data.price ?? 0} EUR\n` +
    `• Durée : ${duration}\n` +
    `[Voir le programme →](/dashboard/programs/${data.id})`
  )
}

async function createStudent(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  // Generate student_number using the same logic as the dashboard
  const { data: org } = await supabase
    .from('organizations')
    .select('code')
    .eq('id', orgId)
    .single()

  const orgCode = org?.code || 'ETU'
  const year = new Date().getFullYear().toString().slice(-2)
  const prefix = `${orgCode}${year}`

  const { data: lastStudent } = await supabase
    .from('students')
    .select('student_number')
    .eq('organization_id', orgId)
    .like('student_number', `${prefix}%`)
    .order('student_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sequence = 1
  if (lastStudent?.student_number) {
    const lastSeq = parseInt(lastStudent.student_number.slice(-4)) || 0
    sequence = lastSeq + 1
  }
  const studentNumber = `${prefix}${String(sequence).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('students')
    .insert({
      organization_id: orgId,
      student_number: studentNumber,
      first_name: input.first_name as string,
      last_name: input.last_name as string,
      email: (input.email as string) ?? null,
      phone: (input.phone as string) ?? null,
      date_of_birth: (input.date_of_birth as string) ?? null,
      gender: (input.gender as string) ?? null,
      address: (input.address as string) ?? null,
    })
    .select('id, first_name, last_name, email, student_number')
    .single()

  if (error) return `Erreur lors de la création de l'apprenant : ${error.message}`
  return (
    `Apprenant créé avec succès !\n` +
    `• Numéro : ${data.student_number}\n` +
    `• Nom : ${data.first_name} ${data.last_name}` +
    `${data.email ? `\n• Email : ${data.email}` : ''}\n` +
    `[Voir l'apprenant →](/dashboard/students/${data.id})`
  )
}

async function createFormation(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from('formations')
    .insert({
      organization_id: orgId,
      code: input.code as string,
      name: input.name as string,
      description: (input.description as string) ?? null,
      category: (input.category as string) ?? null,
      duration_hours: (input.duration_hours as number) ?? null,
      price: (input.price as number) ?? 0,
      currency: 'EUR',
      payment_plan: 'full',
      program_id: (input.program_id as string) ?? null,
      prerequisites: (input.prerequisites as string) ?? null,
      capacity_max: (input.capacity_max as number) ?? null,
      is_active: true,
    })
    .select('id, code, name, duration_hours, price')
    .single()

  if (error) return `Erreur lors de la création de la formation : ${error.message}`
  return (
    `Formation créée avec succès !\n` +
    `• ID : ${data.id}\n` +
    `• Code : ${data.code}\n` +
    `• Nom : ${data.name}` +
    `${data.duration_hours ? `\n• Durée : ${data.duration_hours}h` : ''}` +
    `${data.price ? `\n• Prix : ${data.price} EUR` : ''}\n` +
    `[Voir la formation →](/dashboard/formations/${data.id})`
  )
}

async function sendDocumentForSignature(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const docType = input.document_type as 'convention' | 'devis'
  const studentId = input.student_id as string
  const sessionId = input.session_id as string
  const enrollmentId = (input.enrollment_id as string) ?? null

  // Fetch all data in parallel
  const [studentRes, sessionRes, orgRes, templateRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, email, student_number, phone, address, date_of_birth')
      .eq('id', studentId)
      .single(),
    supabase
      .from('sessions')
      .select('id, name, start_date, end_date, location, formations(id, name, code, duration_hours, price, currency, pedagogical_objectives, modalities)')
      .eq('id', sessionId)
      .single(),
    supabase
      .from('organizations')
      .select('id, name, email, phone, address, logo_url, website, siret, nda_number, representative_name')
      .eq('id', orgId)
      .single(),
    supabase
      .from('document_templates')
      .select('*')
      .eq('organization_id', orgId)
      .eq('type', docType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const student = studentRes.data
  const session = sessionRes.data
  const org = orgRes.data
  const template = templateRes.data

  if (!student) return `Apprenant introuvable (ID: ${studentId})`
  if (!session) return `Session introuvable (ID: ${sessionId})`
  if (!student.email) return `L'apprenant ${student.first_name} ${student.last_name} n'a pas d'adresse email.`
  if (!template) {
    const label = docType === 'convention' ? 'convention de formation' : 'devis'
    return `Aucun modèle de ${label} configuré. Créez-en un dans Paramètres → Modèles de documents avant de pouvoir envoyer ce document.`
  }

  const formationRaw = session.formations
  const formation: Record<string, unknown> = (
    Array.isArray(formationRaw) ? formationRaw[0] : formationRaw
  ) as Record<string, unknown> ?? {}

  // Build document variables
  const today = new Date()
  const variables = {
    organisation_nom: org?.name ?? '',
    organisation_email: org?.email ?? '',
    organisation_telephone: org?.phone ?? '',
    organisation_adresse: org?.address ?? '',
    organisation_siret: (org as Record<string, unknown> | null)?.siret ?? '',
    organisation_numero_declaration: (org as Record<string, unknown> | null)?.nda_number ?? '',
    organisation_representant: (org as Record<string, unknown> | null)?.representative_name ?? '',
    etudiant_nom: student.last_name ?? '',
    etudiant_prenom: student.first_name ?? '',
    etudiant_nom_complet: `${student.first_name} ${student.last_name}`,
    etudiant_numero: student.student_number ?? '',
    etudiant_email: student.email ?? '',
    etudiant_telephone: student.phone ?? '',
    etudiant_adresse: student.address ?? '',
    session_nom: session.name ?? '',
    session_date_debut: session.start_date ?? '',
    session_debut: session.start_date ?? '',
    session_date_fin: session.end_date ?? '',
    session_fin: session.end_date ?? '',
    session_lieu: session.location ?? '',
    formation_nom: (formation.name as string) ?? '',
    formation_code: (formation.code as string) ?? '',
    formation_duree: formation.duration_hours ? `${formation.duration_hours}h` : '',
    formation_prix: formation.price ? `${formation.price} ${formation.currency ?? 'EUR'}` : '',
    montant: formation.price ? String(formation.price) : '0',
    facture_devise: (formation.currency as string) ?? 'EUR',
    date_jour: today.toLocaleDateString('fr-FR'),
    date_aujourd_hui: today.toLocaleDateString('fr-FR'),
    date_emission: today.toLocaleDateString('fr-FR'),
    annee_actuelle: String(today.getFullYear()),
    numero_devis: `D-${Date.now().toString().slice(-8)}`,
    reference_devis: `D-${Date.now().toString().slice(-8)}`,
    validite_devis: new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR'),
  }

  // Generate PDF server-side
  const { generatePDF } = await import('@/lib/utils/document-generation/pdf-generator')
  let pdfBuffer: Buffer
  try {
    const { blob } = await generatePDF(
      template as import('@/lib/types/document-templates').DocumentTemplate,
      variables,
      undefined,
      orgId
    )
    pdfBuffer = Buffer.from(await blob.arrayBuffer())
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `Erreur lors de la génération du PDF : ${msg}. Vérifiez que le modèle de document contient du contenu.`
  }

  // Upload to Supabase Storage
  const timestamp = Date.now()
  const docLabel = docType === 'convention' ? 'convention' : 'devis'
  const fileName = `${docLabel}_${student.student_number || studentId.slice(0, 8)}_${timestamp}.pdf`
  const filePath = `signatures/${orgId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return `Erreur lors de l'upload du PDF : ${uploadError.message}`

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

  // Create document record
  const docTitle = `${docType === 'convention' ? 'Convention' : 'Devis'} — ${student.first_name} ${student.last_name} — ${session.name}`
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      title: docTitle,
      type: docType,
      file_url: urlData.publicUrl,
      organization_id: orgId,
      student_id: studentId,
      metadata: { session_id: sessionId, enrollment_id: enrollmentId, generated_by: 'ai_agent' },
    })
    .select('id')
    .single()

  if (docError || !document) return `Erreur lors de la création du document : ${docError?.message}`

  // Create signature request (sends email automatically via SignatureRequestService)
  const { SignatureRequestService } = await import('@/lib/services/signature-request.service')
  const signatureService = new SignatureRequestService(supabase)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const sigRequest = await signatureService.createSignatureRequest({
      documentId: document.id,
      organizationId: orgId,
      recipientEmail: student.email,
      recipientName: `${student.first_name} ${student.last_name}`,
      recipientType: 'student',
      recipientId: studentId,
      subject: `Demande de signature : ${docTitle}`,
      message: `Bonjour ${student.first_name},\n\nVeuillez trouver ci-joint votre ${docType === 'convention' ? 'convention de formation' : 'devis'} pour la session "${session.name}". Merci de le signer électroniquement via le lien ci-dessous.`,
      expiresAt,
    })

    return (
      `Document envoyé pour signature !\n` +
      `• Type : ${docType === 'convention' ? 'Convention de formation' : 'Devis'}\n` +
      `• Destinataire : ${student.first_name} ${student.last_name} (${student.email})\n` +
      `• Session : ${session.name}\n` +
      `• ID demande : ${(sigRequest as { id?: string })?.id ?? 'créé'}\n` +
      `• Expire le : ${new Date(expiresAt).toLocaleDateString('fr-FR')}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `Document créé (ID: ${document.id}) mais erreur lors de l'envoi de la demande de signature : ${msg}`
  }
}

async function enrollStudent(input: ToolInput, supabase: SupabaseClient) {
  // Check for existing enrollment to avoid duplicates
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('student_id', input.student_id as string)
    .eq('session_id', input.session_id as string)
    .maybeSingle()

  if (existing) {
    return `L'apprenant est déjà inscrit à cette session (statut : ${existing.status}, ID : ${existing.id}).`
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      student_id: input.student_id as string,
      session_id: input.session_id as string,
      status: (input.status as string) ?? 'pending',
      total_amount: (input.total_amount as number) ?? 0,
      enrollment_date: new Date().toISOString(),
    })
    .select('id, status, enrollment_date')
    .single()

  if (error) return `Erreur lors de l'inscription : ${error.message}`
  return (
    `Inscription créée avec succès !\n` +
    `• ID inscription : ${data.id}\n` +
    `• Statut : ${data.status}\n` +
    `• Date : ${new Date(data.enrollment_date).toLocaleDateString('fr-FR')}`
  )
}

async function getSessionDetails(input: ToolInput, supabase: SupabaseClient) {
  const sessionId = input.session_id as string

  const [sessionRes, enrollmentsRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, name, start_date, end_date, location, status, capacity_max, formations(name, code, duration_hours, price, currency)')
      .eq('id', sessionId)
      .single(),
    supabase
      .from('enrollments')
      .select('id, status, total_amount, enrollment_date, students(id, first_name, last_name, email, student_number)')
      .eq('session_id', sessionId)
      .order('enrollment_date', { ascending: true }),
  ])

  if (sessionRes.error || !sessionRes.data) return `Session introuvable (ID: ${sessionId})`

  const s = sessionRes.data
  const formation = (Array.isArray(s.formations) ? s.formations[0] : s.formations) as Record<string, unknown> | null
  const enrollments = enrollmentsRes.data ?? []

  const statusLabel: Record<string, string> = {
    planned: 'Planifiée', ongoing: 'En cours', completed: 'Terminée', cancelled: 'Annulée',
  }
  const enrollStatusLabel: Record<string, string> = {
    pending: '⏳ En attente', active: '✅ Actif', confirmed: '✅ Confirmé', cancelled: '❌ Annulé',
  }

  const spotsUsed = enrollments.filter((e: Record<string, unknown>) => e.status !== 'cancelled').length
  const spotsMax = s.capacity_max ?? null
  const spotsInfo = spotsMax ? `${spotsUsed}/${spotsMax} places` : `${spotsUsed} inscrit(s)`

  const enrollLines = enrollments.map((e: Record<string, unknown>) => {
    const st = (Array.isArray(e.students) ? e.students[0] : e.students) as Record<string, unknown> | null
    const name = st ? `${st.first_name} ${st.last_name}${st.student_number ? ` (n°${st.student_number})` : ''}` : 'Apprenant inconnu'
    return `  • ${name} — ${enrollStatusLabel[e.status as string] ?? e.status}`
  })

  return (
    `**Détails de la session**\n` +
    `• Nom : ${s.name}\n` +
    `• Statut : ${statusLabel[s.status] ?? s.status}\n` +
    `• Dates : ${s.start_date} → ${s.end_date}${s.location ? `\n• Lieu : ${s.location}` : ''}\n` +
    (formation ? `• Formation : ${formation.name} (${formation.code})\n` : '') +
    `• Inscriptions : ${spotsInfo}\n` +
    (enrollLines.length > 0
      ? `\n**Apprenants inscrits :**\n${enrollLines.join('\n')}`
      : '\nAucun apprenant inscrit.') +
    `\n[Voir la session →](/dashboard/sessions/${s.id})`
  )
}

async function updateEntityStatus(input: ToolInput, supabase: SupabaseClient) {
  const entityType = input.entity_type as 'session' | 'enrollment'
  const entityId = input.entity_id as string
  const newStatus = input.new_status as string

  const sessionStatuses = ['planned', 'ongoing', 'completed', 'cancelled']
  const enrollmentStatuses = ['pending', 'active', 'confirmed', 'cancelled']

  if (entityType === 'session') {
    if (!sessionStatuses.includes(newStatus)) {
      return `Statut invalide pour une session. Valeurs acceptées : ${sessionStatuses.join(', ')}`
    }
    const { data, error } = await supabase
      .from('sessions')
      .update({ status: newStatus })
      .eq('id', entityId)
      .select('id, name, status')
      .single()
    if (error) return `Erreur lors de la mise à jour : ${error.message}`
    return `Statut de la session "${data.name}" mis à jour → **${newStatus}**\n[Voir la session →](/dashboard/sessions/${data.id})`
  }

  if (entityType === 'enrollment') {
    if (!enrollmentStatuses.includes(newStatus)) {
      return `Statut invalide pour une inscription. Valeurs acceptées : ${enrollmentStatuses.join(', ')}`
    }
    const { data, error } = await supabase
      .from('enrollments')
      .update({ status: newStatus })
      .eq('id', entityId)
      .select('id, status, student_id, session_id')
      .single()
    if (error) return `Erreur lors de la mise à jour : ${error.message}`
    return `Statut de l'inscription mis à jour → **${newStatus}** (ID : ${data.id})`
  }

  return `Type d'entité inconnu : ${entityType}. Utilisez "session" ou "enrollment".`
}

async function listEnrollments(input: ToolInput, supabase: SupabaseClient) {
  const limit = (input.limit as number) ?? 20

  let query = supabase
    .from('enrollments')
    .select('id, status, total_amount, enrollment_date, students(id, first_name, last_name, student_number), sessions(id, name, start_date, end_date, formations(name))')
    .order('enrollment_date', { ascending: false })
    .limit(limit)

  if (input.student_id) query = query.eq('student_id', input.student_id as string)
  if (input.session_id) query = query.eq('session_id', input.session_id as string)
  if (input.status) query = query.eq('status', input.status as string)

  const { data, error } = await query
  if (error) return `Erreur : ${error.message}`
  if (!data?.length) return 'Aucune inscription trouvée.'

  const statusLabel: Record<string, string> = {
    pending: '⏳ En attente', active: '✅ Actif', confirmed: '✅ Confirmé', cancelled: '❌ Annulé',
  }

  const rows = data.map((e: Record<string, unknown>) => {
    const st = (Array.isArray(e.students) ? e.students[0] : e.students) as Record<string, unknown> | null
    const se = (Array.isArray(e.sessions) ? e.sessions[0] : e.sessions) as Record<string, unknown> | null
    const fo = se ? ((Array.isArray(se.formations) ? se.formations[0] : se.formations) as Record<string, unknown> | null) : null
    const studentName = st ? `${st.first_name} ${st.last_name}` : '—'
    const sessionName = se ? `${se.name} (${se.start_date})` : '—'
    const formationName = fo ? ` — ${fo.name}` : ''
    return `• ${studentName} → ${sessionName}${formationName} — ${statusLabel[e.status as string] ?? e.status}`
  })

  return `${data.length} inscription(s) :\n${rows.join('\n')}`
}

async function sendBulkDocuments(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const docType = input.document_type as 'convention' | 'devis'
  const sessionId = input.session_id as string

  // Fetch non-cancelled enrollments with student info
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, status, student_id, students(id, first_name, last_name, email, student_number)')
    .eq('session_id', sessionId)
    .neq('status', 'cancelled')

  if (error) return `Erreur lors de la récupération des inscriptions : ${error.message}`
  if (!enrollments?.length) return 'Aucun apprenant inscrit (non annulé) pour cette session.'

  const docLabel = docType === 'convention' ? 'convention' : 'devis'
  const results: string[] = []
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const enrollment of enrollments) {
    const st = (Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students) as Record<string, unknown> | null
    if (!st) { skipped++; continue }
    if (!st.email) {
      results.push(`⚠️ ${st.first_name} ${st.last_name} — ignoré (pas d'email)`)
      skipped++
      continue
    }

    const result = await sendDocumentForSignature(
      { document_type: docType, student_id: st.id as string, session_id: sessionId, enrollment_id: enrollment.id },
      supabase,
      orgId
    )

    if (result.startsWith('Document envoyé')) {
      results.push(`✅ ${st.first_name} ${st.last_name} (${st.email})`)
      sent++
    } else {
      results.push(`❌ ${st.first_name} ${st.last_name} — ${result.split('\n')[0]}`)
      failed++
    }
  }

  return (
    `**Envoi en masse — ${docLabel}**\n` +
    `• ✅ Envoyés : ${sent}\n` +
    `• ⚠️ Ignorés (sans email) : ${skipped}\n` +
    `• ❌ Échecs : ${failed}\n\n` +
    `**Détail :**\n${results.join('\n')}`
  )
}
