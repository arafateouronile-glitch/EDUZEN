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
    description: 'Générer un document (convention, devis ou convocation) et l\'envoyer par email à l\'apprenant. Convention et devis sont envoyés pour signature électronique ; la convocation est envoyée directement en pièce jointe.',
    input_schema: {
      type: 'object' as const,
      properties: {
        document_type: {
          type: 'string',
          enum: ['convention', 'devis', 'convocation'],
          description: 'Type de document : "convention" pour une convention de formation, "devis" pour un devis, "convocation" pour une convocation (envoyée en pièce jointe, sans signature)',
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
    description: 'Envoyer un document (devis, convention ou convocation) à TOUS les apprenants inscrits d\'une session en une seule opération. Envoie uniquement aux apprenants non annulés ayant une adresse email.',
    input_schema: {
      type: 'object' as const,
      properties: {
        document_type: {
          type: 'string',
          enum: ['convention', 'devis', 'convocation'],
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
  {
    name: 'search_sessions',
    description: 'Rechercher des sessions par nom (partiel), ou par nom de formation parente. Utile pour retrouver une session quand on ne connaît pas son ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Terme de recherche dans le nom de la session ou de la formation',
        },
        status: {
          type: 'string',
          enum: ['planned', 'ongoing', 'completed', 'cancelled'],
          description: 'Filtrer par statut (optionnel)',
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut : 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_session',
    description: 'Modifier les champs d\'une session existante (nom, dates, lieu, capacité, statut). Confirme avec l\'utilisateur avant d\'agir.',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID de la session à modifier',
        },
        name: { type: 'string', description: 'Nouveau nom (optionnel)' },
        start_date: { type: 'string', description: 'Nouvelle date de début YYYY-MM-DD (optionnel)' },
        end_date: { type: 'string', description: 'Nouvelle date de fin YYYY-MM-DD (optionnel)' },
        location: { type: 'string', description: 'Nouveau lieu (optionnel)' },
        capacity_max: { type: 'number', description: 'Nouvelle capacité maximale (optionnel)' },
        status: {
          type: 'string',
          enum: ['planned', 'ongoing', 'completed', 'cancelled'],
          description: 'Nouveau statut (optionnel)',
        },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'update_formation',
    description: 'Modifier les champs d\'une formation existante (nom, description, durée, prix, catégorie, prérequis, activation). Confirme avec l\'utilisateur avant d\'agir.',
    input_schema: {
      type: 'object' as const,
      properties: {
        formation_id: {
          type: 'string',
          description: 'UUID de la formation à modifier',
        },
        name: { type: 'string', description: 'Nouveau nom (optionnel)' },
        description: { type: 'string', description: 'Nouvelle description (optionnel)' },
        duration_hours: { type: 'number', description: 'Nouvelle durée en heures (optionnel)' },
        price: { type: 'number', description: 'Nouveau prix en EUR (optionnel)' },
        category: { type: 'string', description: 'Nouvelle catégorie (optionnel)' },
        prerequisites: { type: 'string', description: 'Nouveaux prérequis (optionnel)' },
        is_active: { type: 'boolean', description: 'Activer ou désactiver la formation (optionnel)' },
      },
      required: ['formation_id'],
    },
  },
  {
    name: 'get_student_details',
    description: 'Obtenir la fiche complète d\'un apprenant : coordonnées, toutes ses inscriptions, documents envoyés et statut de signature.',
    input_schema: {
      type: 'object' as const,
      properties: {
        student_id: {
          type: 'string',
          description: 'UUID de l\'apprenant',
        },
      },
      required: ['student_id'],
    },
  },
  {
    name: 'send_reminder',
    description: 'Envoyer un email de rappel de signature aux apprenants d\'une session qui n\'ont pas encore signé leur convention ou devis. Ne recrée pas de document — utilise les demandes de signature existantes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID de la session',
        },
        document_type: {
          type: 'string',
          enum: ['convention', 'devis'],
          description: 'Type de document (optionnel, par défaut les deux)',
        },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'generate_certificate',
    description: 'Générer et envoyer par email une attestation de formation (ou certificat de réalisation) à un apprenant. Si l\'apprenant a complété la session, génère le PDF et l\'envoie pour signature.',
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
        certificate_type: {
          type: 'string',
          enum: ['attestation', 'attestation_reussite', 'certificat_realisation'],
          description: 'Type d\'attestation à générer (défaut : attestation)',
        },
      },
      required: ['student_id', 'session_id'],
    },
  },
  {
    name: 'get_financial_report',
    description: 'Obtenir un rapport financier : CA total, CA par formation, taux de remplissage moyen. Filtrable par période (mois ou année).',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: {
          type: 'number',
          description: 'Année (ex: 2025)',
        },
        month: {
          type: 'number',
          description: 'Mois (1-12, optionnel — si absent, rapport annuel)',
        },
      },
      required: [],
    },
  },
]

// ─── Tool handlers ────────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>

const JEANE_CREATE_TOOLS: Record<string, 'programs' | 'formations' | 'sessions'> = {
  create_program: 'programs',
  create_formation: 'formations',
  create_session: 'sessions',
}

export async function executeTool(
  toolName: string,
  toolInput: ToolInput,
  supabase: SupabaseClient,
  organizationId: string
): Promise<string> {
  try {
    // Vérification quota Jeane pour les outils de création (trial uniquement)
    const resourceType = JEANE_CREATE_TOOLS[toolName]
    if (resourceType) {
      const { checkJeaneLimit, incrementJeaneUsage } = await import('@/lib/services/jeane-limits')
      const check = await checkJeaneLimit(supabase, organizationId, resourceType)
      if (!check.allowed) return check.message!
      const handlers: Record<string, () => Promise<string>> = {
        create_program: () => createProgram(toolInput, supabase, organizationId),
        create_formation: () => createFormation(toolInput, supabase, organizationId),
        create_session: () => createSession(toolInput, supabase, organizationId),
      }
      const result = await handlers[toolName]()
      if (!result.startsWith('Erreur')) await incrementJeaneUsage(supabase, organizationId, resourceType)
      return result
    }

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
        return await enrollStudent(toolInput, supabase, organizationId)
      case 'send_document_for_signature':
        return await sendDocumentForSignature(toolInput, supabase, organizationId)
      case 'get_session_details':
        return await getSessionDetails(toolInput, supabase, organizationId)
      case 'update_entity_status':
        return await updateEntityStatus(toolInput, supabase, organizationId)
      case 'list_enrollments':
        return await listEnrollments(toolInput, supabase, organizationId)
      case 'send_bulk_documents':
        return await sendBulkDocuments(toolInput, supabase, organizationId)
      case 'search_sessions':
        return await searchSessions(toolInput, supabase, organizationId)
      case 'update_session':
        return await updateSession(toolInput, supabase, organizationId)
      case 'update_formation':
        return await updateFormation(toolInput, supabase, organizationId)
      case 'get_student_details':
        return await getStudentDetails(toolInput, supabase, organizationId)
      case 'send_reminder':
        return await sendReminder(toolInput, supabase, organizationId)
      case 'generate_certificate':
        return await generateCertificate(toolInput, supabase, organizationId)
      case 'get_financial_report':
        return await getFinancialReport(toolInput, supabase, organizationId)
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

async function createSession(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  // Verify the parent formation belongs to this organization
  const { data: formationCheck } = await supabase
    .from('formations')
    .select('id')
    .eq('id', input.formation_id as string)
    .eq('organization_id', orgId)
    .single()
  if (!formationCheck) return `Formation introuvable ou n'appartient pas à votre organisation.`

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
    .eq('organization_id', orgId)
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
  const docType = input.document_type as 'convention' | 'devis' | 'convocation'
  const studentId = input.student_id as string
  const sessionId = input.session_id as string
  const enrollmentId = (input.enrollment_id as string) ?? null

  // Fetch all data in parallel — même sélection que le dashboard
  const [studentRes, sessionRes, orgRes, templateRes, enrollmentRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, email, student_number, phone, address, date_of_birth, company_name')
      .eq('id', studentId)
      .single(),
    supabase
      .from('sessions')
      .select('id, name, start_date, end_date, location, start_time, end_time, formations(id, name, code, duration_hours, price, currency, pedagogical_objectives, modalities, program_id, programs(id, name, description, objectives, target_audience, prerequisites))')
      .eq('id', sessionId)
      .single(),
    supabase
      .from('organizations')
      .select('id, name, email, phone, address, logo_url, website, siret, nda_number, representative_name, city, postal_code, region')
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
    enrollmentId
      ? supabase.from('enrollments').select('id, total_amount, paid_amount, enrollment_date').eq('id', enrollmentId).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  const student = studentRes.data
  const session = sessionRes.data
  const org = orgRes.data
  const template = templateRes.data
  const enrollment = enrollmentRes.data

  if (!student) return `Apprenant introuvable (ID: ${studentId})`
  if (!session) return `Session introuvable (ID: ${sessionId})`
  if (!student.email) return `L'apprenant ${student.first_name} ${student.last_name} n'a pas d'adresse email.`
  if (!template) {
    const labels: Record<string, string> = { convention: 'convention de formation', devis: 'devis', convocation: 'convocation' }
    return `Aucun modèle de ${labels[docType] ?? docType} configuré. Créez-en un dans Paramètres → Modèles de documents avant de pouvoir envoyer ce document.`
  }

  // Extraire programme et formation depuis la session
  const formationRaw = session.formations
  const formationObj = (Array.isArray(formationRaw) ? formationRaw[0] : formationRaw) as Record<string, unknown> | null ?? {}
  const programRaw = (formationObj as Record<string, unknown>)?.programs
  const programObj = (Array.isArray(programRaw) ? programRaw[0] : programRaw) as Record<string, unknown> | null ?? null

  // Construire les variables avec le même extracteur que le dashboard
  const { extractDocumentVariables } = await import('@/lib/utils/document-generation/variable-extractor')
  const variables = extractDocumentVariables({
    student: student as any,
    session: {
      ...session,
      formations: formationObj as any,
    } as any,
    organization: {
      ...org,
      siret: (org as any)?.siret ?? null,
      nda_number: (org as any)?.nda_number ?? null,
      representative_name: (org as any)?.representative_name ?? null,
      city: (org as any)?.city ?? null,
      postal_code: (org as any)?.postal_code ?? null,
      region: (org as any)?.region ?? null,
    } as any,
    program: programObj ? { ...programObj, id: String(programObj.id ?? ''), name: String(programObj.name ?? '') } as any : undefined,
    language: 'fr',
    issueDate: new Date().toISOString(),
  })

  // Generate PDF — même moteur (Puppeteer/Gotenberg) que le dashboard
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

  const timestamp = Date.now()
  const docLabels: Record<string, string> = { convention: 'Convention', devis: 'Devis', convocation: 'Convocation' }
  const docTitle = `${docLabels[docType] ?? docType} — ${student.first_name} ${student.last_name} — ${session.name}`

  // ── Convocation : envoi direct par email (pièce jointe, sans signature) ──
  if (docType === 'convocation') {
    const { sendEmailViaResend } = await import('@/lib/utils/send-email-resend')
    const startDate = session.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : '—'
    const endDate = session.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : '—'
    const html = `<!DOCTYPE html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#222;">
      <p>Bonjour ${student.first_name} ${student.last_name},</p>
      <p>Vous êtes convoqué(e) pour la session de formation suivante :</p>
      <ul>
        <li><strong>Formation :</strong> ${String(formationObj?.name ?? session.name)}</li>
        <li><strong>Session :</strong> ${session.name}</li>
        <li><strong>Date de début :</strong> ${startDate}</li>
        <li><strong>Date de fin :</strong> ${endDate}</li>
        ${session.location ? `<li><strong>Lieu :</strong> ${session.location}</li>` : ''}
      </ul>
      <p>Veuillez trouver ci-joint votre convocation en PDF.</p>
      <p>Cordialement,<br>${org?.name ?? ''}</p>
    </body></html>`

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM_EMAIL = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'EDUZEN <noreply@eduzen.io>'
    const fileName = `convocation_${student.last_name}_${student.first_name}.pdf`
    const { error: emailErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [student.email],
      subject: `Convocation - ${session.name}`,
      html,
      attachments: [{ filename: fileName, content: pdfBuffer }],
    } as Parameters<typeof resend.emails.send>[0])

    if (emailErr) {
      const msg = typeof emailErr === 'object' && emailErr !== null && 'message' in emailErr ? String((emailErr as { message: unknown }).message) : 'Erreur Resend'
      return `PDF généré mais erreur d'envoi email : ${msg}`
    }

    return (
      `✅ Convocation envoyée par email !\n` +
      `• Destinataire : ${student.first_name} ${student.last_name} (${student.email})\n` +
      `• Session : ${session.name}\n` +
      `• Pièce jointe : ${fileName}`
    )
  }

  // ── Convention / Devis : upload + demande de signature ──
  const docSlug = docType === 'convention' ? 'convention' : 'devis'
  const fileName = `${docSlug}_${student.student_number || studentId.slice(0, 8)}_${timestamp}.pdf`
  const filePath = `signatures/${orgId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return `Erreur lors de l'upload du PDF : ${uploadError.message}`

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

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

  const { SignatureRequestService } = await import('@/lib/services/signature-request.service')
  const signatureService = new SignatureRequestService(supabase)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const typeLabel = docType === 'convention' ? 'convention de formation' : 'devis'

  try {
    const sigRequest = await signatureService.createSignatureRequest({
      documentId: document.id,
      organizationId: orgId,
      recipientEmail: student.email,
      recipientName: `${student.first_name} ${student.last_name}`,
      recipientType: 'student',
      recipientId: studentId,
      subject: `Demande de signature : ${docTitle}`,
      message: `Bonjour ${student.first_name},\n\nVeuillez trouver ci-joint votre ${typeLabel} pour la session "${session.name}". Merci de le signer électroniquement via le lien ci-dessous.`,
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

async function enrollStudent(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  // Verify session and student belong to this organization
  const { data: sessionCheck } = await supabase
    .from('sessions')
    .select('id, formations!inner(organization_id)')
    .eq('id', input.session_id as string)
    .eq('formations.organization_id', orgId)
    .single()
  if (!sessionCheck) return `Session introuvable ou n'appartient pas à votre organisation.`

  const { data: studentCheck } = await supabase
    .from('students')
    .select('id')
    .eq('id', input.student_id as string)
    .eq('organization_id', orgId)
    .single()
  if (!studentCheck) return `Apprenant introuvable ou n'appartient pas à votre organisation.`

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

async function getSessionDetails(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const sessionId = input.session_id as string

  const [sessionRes, enrollmentsRes, docsRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, name, start_date, end_date, location, status, capacity_max, formations!inner(name, code, duration_hours, price, currency, organization_id)')
      .eq('id', sessionId)
      .eq('formations.organization_id', orgId)
      .single(),
    supabase
      .from('enrollments')
      .select('id, status, total_amount, enrollment_date, students(id, first_name, last_name, email, student_number)')
      .eq('session_id', sessionId)
      .order('enrollment_date', { ascending: true }),
    // Documents sent for this session (convention or devis)
    supabase
      .from('documents')
      .select('id, type, student_id')
      .contains('metadata', { session_id: sessionId })
      .in('type', ['convention', 'devis']),
  ])

  if (sessionRes.error || !sessionRes.data) return `Session introuvable (ID: ${sessionId})`

  const s = sessionRes.data
  const formation = (Array.isArray(s.formations) ? s.formations[0] : s.formations) as Record<string, unknown> | null
  const enrollments = enrollmentsRes.data ?? []
  const docs = docsRes.data ?? []

  const statusLabel: Record<string, string> = {
    planned: 'Planifiée', ongoing: 'En cours', completed: 'Terminée', cancelled: 'Annulée',
  }
  const enrollStatusLabel: Record<string, string> = {
    pending: '⏳ En attente', active: '✅ Actif', confirmed: '✅ Confirmé', cancelled: '❌ Annulé',
  }

  const activeEnrollments = enrollments.filter((e: Record<string, unknown>) => e.status !== 'cancelled')
  const spotsUsed = activeEnrollments.length
  const spotsMax = s.capacity_max ?? null

  // Taux de remplissage
  const fillRate = spotsMax ? Math.round((spotsUsed / spotsMax) * 100) : null
  const spotsInfo = spotsMax
    ? `${spotsUsed}/${spotsMax} places (${fillRate}% de remplissage)`
    : `${spotsUsed} inscrit(s)`

  // CA potentiel
  const caPotentiel = activeEnrollments.reduce((sum: number, e: Record<string, unknown>) => {
    return sum + (typeof e.total_amount === 'number' ? e.total_amount : 0)
  }, 0)

  // Documents manquants
  const studentIdsWithDoc = new Set(docs.map((d: Record<string, unknown>) => d.student_id as string))
  const activeStudentIds = activeEnrollments
    .map((e: Record<string, unknown>) => {
      const st = (Array.isArray(e.students) ? e.students[0] : e.students) as Record<string, unknown> | null
      return st?.id as string | undefined
    })
    .filter(Boolean) as string[]
  const missingDocCount = activeStudentIds.filter((id) => !studentIdsWithDoc.has(id)).length

  const enrollLines = enrollments.map((e: Record<string, unknown>) => {
    const st = (Array.isArray(e.students) ? e.students[0] : e.students) as Record<string, unknown> | null
    const name = st ? `${st.first_name} ${st.last_name}${st.student_number ? ` (n°${st.student_number})` : ''}` : 'Apprenant inconnu'
    const hasDoc = st?.id && studentIdsWithDoc.has(st.id as string) ? ' 📄' : ''
    return `  • ${name} — ${enrollStatusLabel[e.status as string] ?? e.status}${hasDoc}`
  })

  return (
    `**Détails de la session**\n` +
    `• Nom : ${s.name}\n` +
    `• Statut : ${statusLabel[s.status] ?? s.status}\n` +
    `• Dates : ${s.start_date} → ${s.end_date}${s.location ? `\n• Lieu : ${s.location}` : ''}\n` +
    (formation ? `• Formation : ${formation.name} (${formation.code})\n` : '') +
    `• Inscriptions : ${spotsInfo}\n` +
    (caPotentiel > 0 ? `• CA potentiel : ${caPotentiel.toLocaleString('fr-FR')} EUR\n` : '') +
    (missingDocCount > 0
      ? `• ⚠️ Documents manquants : ${missingDocCount} apprenant(s) sans convention/devis\n`
      : docs.length > 0 ? `• ✅ Tous les apprenants ont un document envoyé\n` : '') +
    (enrollLines.length > 0
      ? `\n**Apprenants inscrits** (📄 = document envoyé) :\n${enrollLines.join('\n')}`
      : '\nAucun apprenant inscrit.') +
    `\n[Voir la session →](/dashboard/sessions/${s.id})`
  )
}

async function updateEntityStatus(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const entityType = input.entity_type as 'session' | 'enrollment'
  const entityId = input.entity_id as string
  const newStatus = input.new_status as string

  const sessionStatuses = ['planned', 'ongoing', 'completed', 'cancelled']
  const enrollmentStatuses = ['pending', 'active', 'confirmed', 'cancelled']

  if (entityType === 'session') {
    if (!sessionStatuses.includes(newStatus)) {
      return `Statut invalide pour une session. Valeurs acceptées : ${sessionStatuses.join(', ')}`
    }
    // Verify session belongs to org, then update
    const { data: check } = await supabase
      .from('sessions')
      .select('id, formations!inner(organization_id)')
      .eq('id', entityId)
      .eq('formations.organization_id', orgId)
      .single()
    if (!check) return `Session introuvable ou n'appartient pas à votre organisation.`

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
    // Verify enrollment belongs to a session of this org
    const { data: check } = await supabase
      .from('enrollments')
      .select('id, sessions!inner(formations!inner(organization_id))')
      .eq('id', entityId)
      .eq('sessions.formations.organization_id', orgId)
      .single()
    if (!check) return `Inscription introuvable ou n'appartient pas à votre organisation.`

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

async function listEnrollments(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const limit = (input.limit as number) ?? 20

  let query = supabase
    .from('enrollments')
    .select('id, status, total_amount, enrollment_date, students(id, first_name, last_name, student_number), sessions!inner(id, name, start_date, end_date, formations!inner(name, organization_id))')
    .eq('sessions.formations.organization_id', orgId)
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
  const docType = input.document_type as 'convention' | 'devis' | 'convocation'
  const sessionId = input.session_id as string

  // Verify session belongs to this organization
  const { data: sessionCheck } = await supabase
    .from('sessions')
    .select('id, formations!inner(organization_id)')
    .eq('id', sessionId)
    .eq('formations.organization_id', orgId)
    .single()
  if (!sessionCheck) return `Session introuvable ou n'appartient pas à votre organisation.`

  // Fetch non-cancelled enrollments with student info
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, status, student_id, students(id, first_name, last_name, email, student_number)')
    .eq('session_id', sessionId)
    .neq('status', 'cancelled')

  if (error) return `Erreur lors de la récupération des inscriptions : ${error.message}`
  if (!enrollments?.length) return 'Aucun apprenant inscrit (non annulé) pour cette session.'

  const docLabels: Record<string, string> = { convention: 'convention', devis: 'devis', convocation: 'convocation' }
  const docLabel = docLabels[docType] ?? docType
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

    if (result.startsWith('Document envoyé') || result.startsWith('✅')) {
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

async function searchSessions(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const q = (input.query as string).trim()
  const limit = (input.limit as number) ?? 10

  // Search sessions by name
  let sessionQuery = supabase
    .from('sessions')
    .select('id, name, start_date, end_date, status, location, formations!inner(name, organization_id)')
    .eq('formations.organization_id', orgId)
    .ilike('name', `%${q}%`)
    .order('start_date', { ascending: false })
    .limit(limit)

  if (input.status) sessionQuery = sessionQuery.eq('status', input.status as string)
  const { data: bySessionName } = await sessionQuery

  // Also search sessions via formation name
  const { data: formations } = await supabase
    .from('formations')
    .select('id')
    .eq('organization_id', orgId)
    .ilike('name', `%${q}%`)
    .limit(5)

  let byFormationName: typeof bySessionName = []
  if (formations?.length) {
    const formationIds = formations.map((f: Record<string, unknown>) => f.id as string)
    const { data } = await supabase
      .from('sessions')
      .select('id, name, start_date, end_date, status, location, formations!inner(name, organization_id)')
      .in('formation_id', formationIds)
      .order('start_date', { ascending: false })
      .limit(limit)
    byFormationName = data ?? []
  }

  // Merge and deduplicate
  const all = [...(bySessionName ?? []), ...(byFormationName ?? [])]
  const seen = new Set<string>()
  const data = all.filter((s: Record<string, unknown>) => {
    if (seen.has(s.id as string)) return false
    seen.add(s.id as string)
    return true
  }).slice(0, limit)

  if (!data.length) return `Aucune session trouvée pour "${q}".`

  const statusLabel: Record<string, string> = {
    planned: 'Planifiée', ongoing: 'En cours', completed: 'Terminée', cancelled: 'Annulée',
  }

  const rows = data.map((s: Record<string, unknown>) => {
    const fo = (Array.isArray(s.formations) ? s.formations[0] : s.formations) as Record<string, unknown> | null
    return `• [${s.id}] **${s.name}** — ${s.start_date} → ${s.end_date}` +
      ` — ${statusLabel[s.status as string] ?? s.status}` +
      (s.location ? ` @ ${s.location}` : '') +
      (fo ? ` (${fo.name})` : '') +
      `\n  [Voir →](/dashboard/sessions/${s.id})`
  })

  return `${data.length} session(s) trouvée(s) pour "${q}" :\n${rows.join('\n')}`
}

async function updateSession(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const sessionId = input.session_id as string

  // Verify session belongs to this organization
  const { data: check } = await supabase
    .from('sessions')
    .select('id, formations!inner(organization_id)')
    .eq('id', sessionId)
    .eq('formations.organization_id', orgId)
    .single()
  if (!check) return `Session introuvable ou n'appartient pas à votre organisation.`

  // Build update payload with only provided fields
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.start_date !== undefined) patch.start_date = input.start_date
  if (input.end_date !== undefined) patch.end_date = input.end_date
  if (input.location !== undefined) patch.location = input.location
  if (input.capacity_max !== undefined) patch.capacity_max = input.capacity_max
  if (input.status !== undefined) patch.status = input.status

  if (Object.keys(patch).length === 0) return 'Aucun champ à modifier fourni.'

  const { data, error } = await supabase
    .from('sessions')
    .update(patch)
    .eq('id', sessionId)
    .select('id, name, start_date, end_date, location, status, capacity_max')
    .single()

  if (error) return `Erreur lors de la mise à jour : ${error.message}`

  const updated = Object.keys(patch).join(', ')
  return (
    `Session mise à jour (${updated}) :\n` +
    `• Nom : ${data.name}\n` +
    `• Dates : ${data.start_date} → ${data.end_date}\n` +
    `• Statut : ${data.status}` +
    (data.location ? `\n• Lieu : ${data.location}` : '') +
    (data.capacity_max ? `\n• Capacité : ${data.capacity_max}` : '') +
    `\n[Voir la session →](/dashboard/sessions/${data.id})`
  )
}

async function updateFormation(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const formationId = input.formation_id as string

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  if (input.duration_hours !== undefined) patch.duration_hours = input.duration_hours
  if (input.price !== undefined) patch.price = input.price
  if (input.category !== undefined) patch.category = input.category
  if (input.prerequisites !== undefined) patch.prerequisites = input.prerequisites
  if (input.is_active !== undefined) patch.is_active = input.is_active

  if (Object.keys(patch).length === 0) return 'Aucun champ à modifier fourni.'

  const { data, error } = await supabase
    .from('formations')
    .update(patch)
    .eq('id', formationId)
    .eq('organization_id', orgId)
    .select('id, name, duration_hours, price, category, is_active')
    .single()

  if (error) return `Erreur lors de la mise à jour : ${error.message}`

  const updated = Object.keys(patch).join(', ')
  return (
    `Formation mise à jour (${updated}) :\n` +
    `• Nom : ${data.name}\n` +
    (data.duration_hours ? `• Durée : ${data.duration_hours}h\n` : '') +
    (data.price ? `• Prix : ${data.price} EUR\n` : '') +
    (data.category ? `• Catégorie : ${data.category}\n` : '') +
    `• Statut : ${data.is_active ? 'Active' : 'Inactive'}\n` +
    `[Voir la formation →](/dashboard/formations/${data.id})`
  )
}

async function getStudentDetails(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const studentId = input.student_id as string

  const [studentRes, enrollmentsRes, docsRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, email, phone, student_number, date_of_birth, address, created_at')
      .eq('id', studentId)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('enrollments')
      .select('id, status, total_amount, enrollment_date, sessions(id, name, start_date, end_date, formations(name))')
      .eq('student_id', studentId)
      .order('enrollment_date', { ascending: false }),
    supabase
      .from('documents')
      .select('id, title, type, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (studentRes.error || !studentRes.data) return `Apprenant introuvable (ID: ${studentId})`

  const st = studentRes.data
  const enrollments = enrollmentsRes.data ?? []
  const docs = docsRes.data ?? []

  const statusLabel: Record<string, string> = {
    pending: '⏳ En attente', active: '✅ Actif', confirmed: '✅ Confirmé', cancelled: '❌ Annulé',
  }

  const activeEnrollments = enrollments.filter((e: Record<string, unknown>) => e.status !== 'cancelled')
  const totalSpent = activeEnrollments.reduce((s: number, e: Record<string, unknown>) =>
    s + (typeof e.total_amount === 'number' ? e.total_amount : 0), 0)

  const enrollLines = enrollments.map((e: Record<string, unknown>) => {
    const se = (Array.isArray(e.sessions) ? e.sessions[0] : e.sessions) as Record<string, unknown> | null
    const fo = se ? (Array.isArray(se.formations) ? se.formations[0] : se.formations) as Record<string, unknown> | null : null
    return `  • ${se?.name ?? '—'} (${se?.start_date ?? '?'}) — ${statusLabel[e.status as string] ?? e.status}` +
      (fo ? ` — ${fo.name}` : '')
  })

  const docLines = docs.map((d: Record<string, unknown>) => {
    const icon = d.type === 'convention' ? '📋' : '💰'
    return `  • ${icon} ${d.type === 'convention' ? 'Convention' : 'Devis'} — ${new Date(d.created_at as string).toLocaleDateString('fr-FR')}`
  })

  return (
    `**Fiche apprenant**\n` +
    `• Numéro : ${st.student_number}\n` +
    `• Nom : ${st.first_name} ${st.last_name}\n` +
    `• Email : ${st.email ?? '—'}\n` +
    `• Téléphone : ${st.phone ?? '—'}\n` +
    (st.address ? `• Adresse : ${st.address}\n` : '') +
    `• Inscrit depuis : ${new Date(st.created_at as string).toLocaleDateString('fr-FR')}\n` +
    `\n**Inscriptions (${enrollments.length}) :**\n` +
    (enrollLines.length > 0 ? enrollLines.join('\n') : '  Aucune inscription.') +
    (totalSpent > 0 ? `\n• Total CA : ${totalSpent.toLocaleString('fr-FR')} EUR` : '') +
    `\n\n**Documents (${docs.length}) :**\n` +
    (docLines.length > 0 ? docLines.join('\n') : '  Aucun document envoyé.') +
    `\n[Voir la fiche →](/dashboard/students/${st.id})`
  )
}

async function sendReminder(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const sessionId = input.session_id as string
  const docTypeFilter = input.document_type as string | undefined

  // Verify session belongs to this organization
  const { data: sessionCheck } = await supabase
    .from('sessions')
    .select('id, formations!inner(organization_id)')
    .eq('id', sessionId)
    .eq('formations.organization_id', orgId)
    .single()
  if (!sessionCheck) return `Session introuvable ou n'appartient pas à votre organisation.`

  const typesFilter = docTypeFilter ? [docTypeFilter] : ['convention', 'devis']
  const { data: docs, error: docsErr } = await supabase
    .from('documents')
    .select('id, type, student_id')
    .contains('metadata', { session_id: sessionId })
    .in('type', typesFilter)

  if (docsErr) return `Erreur : ${docsErr.message}`
  if (!docs?.length) {
    return `Aucun document trouvé pour cette session. Envoyez d'abord les conventions avec send_bulk_documents.`
  }

  const docIds = docs.map((d: Record<string, unknown>) => d.id as string)
  const { data: requests, error: reqErr } = await supabase
    .from('signature_requests')
    .select('id, status, recipient_name, recipient_email, document_id')
    .in('document_id', docIds)
    .eq('status', 'pending')

  if (reqErr) return `Erreur lors de la récupération des demandes : ${reqErr.message}`
  if (!requests?.length) {
    return `✅ Toutes les conventions/devis de cette session ont déjà été signés ! Aucun rappel à envoyer.`
  }

  const { SignatureRequestService } = await import('@/lib/services/signature-request.service')
  const service = new SignatureRequestService(supabase)

  const results: string[] = []
  let sent = 0
  let failed = 0

  for (const req of requests) {
    try {
      await service.sendReminder(req.id)
      results.push(`✅ ${req.recipient_name} (${req.recipient_email})`)
      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push(`❌ ${req.recipient_name} — ${msg}`)
      failed++
    }
  }

  return (
    `**Rappels envoyés**\n` +
    `• ✅ Envoyés : ${sent}\n` +
    (failed > 0 ? `• ❌ Échecs : ${failed}\n` : '') +
    `\n${results.join('\n')}`
  )
}

async function generateCertificate(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const studentId = input.student_id as string
  const sessionId = input.session_id as string
  const certType = (input.certificate_type as string) ?? 'attestation'

  const [studentRes, sessionRes, orgRes] = await Promise.all([
    supabase.from('students').select('id, first_name, last_name, email, student_number').eq('id', studentId).single(),
    supabase.from('sessions').select(`
      id, name, start_date, end_date, location,
      formations(name, duration_hours)
    `).eq('id', sessionId).single(),
    supabase.from('organizations').select('name, logo_url, address').eq('id', orgId).single(),
  ])

  if (studentRes.error || !studentRes.data) return `Apprenant introuvable (${studentId})`
  if (sessionRes.error || !sessionRes.data) return `Session introuvable (${sessionId})`

  const st = studentRes.data
  const se = sessionRes.data
  const fo = (Array.isArray(se.formations) ? se.formations[0] : se.formations) as Record<string, unknown> | null
  const org = orgRes.data

  const typeLabel: Record<string, string> = {
    attestation: 'Attestation de formation',
    attestation_reussite: 'Attestation de réussite',
    certificat_realisation: 'Certificat de réalisation',
  }

  const { data: templateData } = await supabase
    .from('document_templates')
    .select('*')
    .eq('organization_id', orgId)
    .eq('type', certType)
    .eq('is_active', true)
    .single()

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const startDate = se.start_date ? new Date(se.start_date as string).toLocaleDateString('fr-FR') : '—'
  const endDate = se.end_date ? new Date(se.end_date as string).toLocaleDateString('fr-FR') : '—'
  const durationHours = fo?.duration_hours ?? ''

  const builtInHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; border: 2px solid #333;">
      <h1 style="text-align: center; font-size: 24px; margin-bottom: 8px;">${typeLabel[certType] ?? typeLabel.attestation}</h1>
      <p style="text-align: center; color: #555; margin-bottom: 32px;">${org?.name ?? 'Organisme de formation'}</p>
      <p>Nous soussignés, certifions que :</p>
      <p style="font-size: 18px; font-weight: bold; margin: 16px 0;">{{student_name}}</p>
      <p>a bien participé à la formation :</p>
      <p style="font-size: 16px; font-weight: bold; margin: 16px 0;">{{session_name}}</p>
      <p>Du <strong>${startDate}</strong> au <strong>${endDate}</strong>${durationHours ? ` — <strong>${durationHours}h</strong>` : ''}${se.location ? ` — ${se.location}` : ''}</p>
      <p style="margin-top: 48px;">Fait le ${dateStr}</p>
      <div style="margin-top: 32px; border-top: 1px solid #ccc; padding-top: 16px;">
        <p style="color: #555; font-size: 12px;">Document généré par EDUZEN — ${org?.name ?? ''}</p>
      </div>
    </div>
  `

  const template = templateData ?? {
    id: 'builtin',
    type: certType,
    content: { html: builtInHtml },
    header: {},
    footer: {},
    page_size: 'A4',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  }

  const variables: import('@/lib/types/document-templates').DocumentVariables = {
    etudiant_nom_complet: `${st.first_name} ${st.last_name}`,
    etudiant_nom: st.last_name,
    etudiant_prenom: st.first_name,
    etudiant_email: st.email ?? '',
    etudiant_numero: st.student_number ?? '',
    session_nom: se.name as string,
    session_date_debut: startDate,
    session_date_fin: endDate,
    session_lieu: (se.location as string) ?? '',
    formation_nom: (fo?.name as string) ?? '',
    heures_totales: durationHours ? String(durationHours) : '',
    organisation_nom: org?.name ?? '',
    ecole_nom: org?.name ?? '',
    date_aujourd_hui: dateStr,
    date_emission: dateStr,
  }

  try {
    const { generatePDF } = await import('@/lib/utils/document-generation/pdf-generator')
    const { blob } = await generatePDF(
      template as import('@/lib/types/document-templates').DocumentTemplate,
      variables,
      undefined,
      orgId
    )

    const fileName = `${certType}_${st.student_number ?? st.id}_${Date.now()}.pdf`
    const filePath = `attestations/${orgId}/${fileName}`

    const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, blob, {
      contentType: 'application/pdf',
    })
    if (uploadErr) return `Erreur upload PDF : ${uploadErr.message}`

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
    const docTitle = `${typeLabel[certType] ?? typeLabel.attestation} — ${st.first_name} ${st.last_name} — ${se.name}`

    const { data: fileRecord, error: fileErr } = await supabase.from('documents').insert({
      organization_id: orgId,
      student_id: studentId,
      title: docTitle,
      type: certType,
      file_url: urlData.publicUrl,
      metadata: { session_id: sessionId, generated_by: 'ai_agent' },
    }).select('id').single()

    if (fileErr || !fileRecord) return `PDF généré mais erreur enregistrement : ${fileErr?.message}`

    const { SignatureRequestService } = await import('@/lib/services/signature-request.service')
    const service = new SignatureRequestService(supabase)
    await service.createSignatureRequest({
      documentId: fileRecord.id,
      recipientName: `${st.first_name} ${st.last_name}`,
      recipientEmail: st.email!,
      recipientType: 'student',
      subject: `${typeLabel[certType] ?? typeLabel.attestation} — ${se.name}`,
      organizationId: orgId,
    })

    return (
      `✅ **${typeLabel[certType] ?? typeLabel.attestation} générée et envoyée**\n` +
      `• Apprenant : ${st.first_name} ${st.last_name} (${st.email})\n` +
      `• Formation : ${se.name}\n` +
      `• Email envoyé pour signature électronique\n` +
      `[Voir l'apprenant →](/dashboard/students/${st.id})`
    )
  } catch (err) {
    return `Erreur génération PDF : ${err instanceof Error ? err.message : String(err)}`
  }
}

async function getFinancialReport(input: ToolInput, supabase: SupabaseClient, orgId: string) {
  const now = new Date()
  const year = (input.year as number) ?? now.getFullYear()
  const month = input.month as number | undefined

  let dateFrom: string
  let dateTo: string
  let periodLabel: string

  if (month) {
    dateFrom = new Date(year, month - 1, 1).toISOString().split('T')[0]
    dateTo = new Date(year, month, 0).toISOString().split('T')[0]
    periodLabel = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  } else {
    dateFrom = `${year}-01-01`
    dateTo = `${year}-12-31`
    periodLabel = String(year)
  }

  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select(`
      id, name, status, capacity_max, start_date,
      formations!inner(name, organization_id, price, duration_hours)
    `)
    .eq('formations.organization_id', orgId)
    .gte('start_date', dateFrom)
    .lte('start_date', dateTo)

  if (sessErr) return `Erreur : ${sessErr.message}`
  if (!sessions?.length) return `Aucune session trouvée pour la période ${periodLabel}.`

  const sessionIds = sessions.map((s: Record<string, unknown>) => s.id as string)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('session_id, status, total_amount')
    .in('session_id', sessionIds)
    .neq('status', 'cancelled')

  const enrollsBySession: Record<string, Array<Record<string, unknown>>> = {}
  for (const e of enrollments ?? []) {
    const sid = e.session_id as string
    if (!enrollsBySession[sid]) enrollsBySession[sid] = []
    enrollsBySession[sid].push(e as Record<string, unknown>)
  }

  let totalCA = 0
  let totalEnrolled = 0
  let totalCapacity = 0
  const byFormation: Record<string, { name: string; ca: number; sessions: number; enrolled: number }> = {}

  for (const s of sessions) {
    const se = s as Record<string, unknown>
    const fo = (Array.isArray(se.formations) ? se.formations[0] : se.formations) as Record<string, unknown> | null
    const formationName = (fo?.name as string) ?? 'Inconnu'
    const enrs = enrollsBySession[se.id as string] ?? []
    const enrolled = enrs.length
    const capacity = (se.capacity_max as number) ?? 0
    const caSession = enrs.reduce((acc: number, e: Record<string, unknown>) =>
      acc + (typeof e.total_amount === 'number' ? e.total_amount : (fo?.price as number ?? 0)), 0)

    totalCA += caSession
    totalEnrolled += enrolled
    totalCapacity += capacity

    if (!byFormation[formationName]) byFormation[formationName] = { name: formationName, ca: 0, sessions: 0, enrolled: 0 }
    byFormation[formationName].ca += caSession
    byFormation[formationName].sessions += 1
    byFormation[formationName].enrolled += enrolled
  }

  const fillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0

  const formationLines = Object.values(byFormation)
    .sort((a, b) => b.ca - a.ca)
    .map(f => `  | ${f.name} | ${f.sessions} session(s) | ${f.enrolled} apprenants | ${f.ca.toLocaleString('fr-FR')} EUR |`)

  return (
    `## Rapport financier — ${periodLabel}\n\n` +
    `| Indicateur | Valeur |\n` +
    `|---|---|\n` +
    `| CA total | **${totalCA.toLocaleString('fr-FR')} EUR** |\n` +
    `| Sessions | ${sessions.length} |\n` +
    `| Apprenants inscrits | ${totalEnrolled} |\n` +
    `| Taux de remplissage moyen | ${fillRate}% |\n\n` +
    `### CA par formation\n\n` +
    `| Formation | Sessions | Apprenants | CA |\n` +
    `|---|---|---|---|\n` +
    formationLines.join('\n')
  )
}
