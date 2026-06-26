import { NextResponse } from 'next/server'
import { APP_URLS } from '@/lib/config/app-config'

/**
 * GET /api/v1/docs
 * Documentation OpenAPI 3.0 de l'API publique EDUZEN
 */
export async function GET() {
  const base = APP_URLS.getBaseUrl()

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'EDUZEN API',
      version: '1.0.0',
      description: `API REST pour accéder et piloter vos données EDUZEN depuis vos propres applications.

## Authentification

Fournissez votre clé API dans le header \`x-eduzen-api-key\` de chaque requête.
Les alternatives \`X-API-Key\` et \`Authorization: Bearer <clé>\` sont également acceptées.

\`\`\`bash
curl -H "x-eduzen-api-key: ezn_live_xxxx" ${base}/api/v1/programs
\`\`\`

Générez vos clés depuis **Dashboard → Paramètres → API & Intégrations**.

## Plan requis

L'accès à l'API est réservé au **plan Enterprise**. Une organisation sans ce plan recevra une erreur \`403 Plan upgrade required\`.

## Scopes

Chaque clé API est créée avec un ensemble de permissions (scopes). Exemple pour un site web public :

| Scope | Accès |
|---|---|
| \`read:sessions\` | Lire les sessions de formation |
| \`read:formations\` | Lire les formations |
| \`read:programs\` | Lire les programmes + stats |
| \`read:enrollments\` | Lire les inscriptions |
| \`write:enrollments\` | Créer des inscriptions |
| \`read:students\` | Lire les apprenants |
| \`write:students\` | Créer/modifier les apprenants |
| \`read:invoices\` | Lire les factures et devis |
| \`write:invoices\` | Créer des factures et devis |
| \`read:documents\` | Lire les templates de documents |
| \`write:documents\` | Générer des documents |
| \`send:email\` | Envoyer des emails |
| \`read:signatures\` | Lire les demandes de signature |
| \`write:signatures\` | Créer des demandes de signature |
| \`*\` | Tous les accès |

## Rate Limiting

| Fenêtre | Limite |
|---|---|
| Par heure | 1 000 requêtes |

Chaque réponse inclut les headers \`X-RateLimit-Remaining\` et \`X-RateLimit-Reset\`.

## Format des réponses

Toutes les réponses utilisent le format JSON avec enveloppe \`data\` :

\`\`\`json
{
  "data": [...],
  "meta": { "page": 1, "limit": 50, "total": 120 }
}
\`\`\`

Les erreurs retournent :
\`\`\`json
{ "error": "Invalid API key", "message": "Description détaillée" }
\`\`\`

## Webhooks

Configurez des webhooks depuis le dashboard pour recevoir des notifications en temps réel lors d'événements (session terminée, paiement reçu, document signé…).
Chaque payload est signé HMAC-SHA256 via le header \`X-Webhook-Signature\`.`,
      contact: {
        name: 'Support EDUZEN',
        email: 'support@eduzen.io',
      },
    },
    servers: [
      { url: base, description: 'Production' },
    ],
    security: [{ ApiKey: [] }],
    components: {
      securitySchemes: {
        ApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-eduzen-api-key',
          description: 'Clé API générée depuis Dashboard → Paramètres → API & Intégrations.',
        },
      },
      schemas: {
        // ─── Pagination ───────────────────────────────────────────────────
        Meta: {
          type: 'object',
          properties: {
            page:  { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 50 },
            total: { type: 'integer', example: 120 },
          },
        },
        // ─── Erreur ───────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'Invalid API key' },
            message: { type: 'string', example: 'The provided API key is invalid or has been revoked' },
          },
        },
        // ─── Student ──────────────────────────────────────────────────────
        Student: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            student_number:  { type: 'string', example: 'ETU-2025-0042' },
            first_name:      { type: 'string', example: 'Marie' },
            last_name:       { type: 'string', example: 'Dupont' },
            email:           { type: 'string', format: 'email', nullable: true },
            phone:           { type: 'string', nullable: true },
            date_of_birth:   { type: 'string', format: 'date', nullable: true },
            gender:          { type: 'string', nullable: true },
            address:         { type: 'string', nullable: true },
            city:            { type: 'string', nullable: true },
            postal_code:     { type: 'string', nullable: true },
            country:         { type: 'string', nullable: true },
            status:          { type: 'string', enum: ['active', 'inactive', 'graduated'], example: 'active' },
            enrollment_date: { type: 'string', format: 'date', nullable: true },
            photo_url:       { type: 'string', format: 'uri', nullable: true },
            organization_id: { type: 'string', format: 'uuid' },
            created_at:      { type: 'string', format: 'date-time' },
            updated_at:      { type: 'string', format: 'date-time' },
          },
        },
        // ─── Session ──────────────────────────────────────────────────────
        Session: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            name:            { type: 'string', example: 'Session Management — Printemps 2026' },
            status:          { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'], example: 'active' },
            start_date:      { type: 'string', format: 'date', example: '2026-03-10' },
            end_date:        { type: 'string', format: 'date', example: '2026-03-14' },
            start_time:      { type: 'string', example: '09:00', nullable: true },
            end_time:        { type: 'string', example: '17:00', nullable: true },
            location:        { type: 'string', example: 'Paris 8e', nullable: true },
            capacity_max:    { type: 'integer', example: 12, nullable: true },
            formation_id:    { type: 'string', format: 'uuid', nullable: true },
            teacher_id:      { type: 'string', format: 'uuid', nullable: true },
            organization_id: { type: 'string', format: 'uuid' },
            exam_date:       { type: 'string', format: 'date', nullable: true },
            created_at:      { type: 'string', format: 'date-time' },
            updated_at:      { type: 'string', format: 'date-time' },
          },
        },
        // ─── Formation ────────────────────────────────────────────────────
        Formation: {
          type: 'object',
          properties: {
            id:                          { type: 'string', format: 'uuid' },
            code:                        { type: 'string', example: 'FORM-MGT-01' },
            name:                        { type: 'string', example: 'Management d\'équipe' },
            description:                 { type: 'string', nullable: true },
            program_id:                  { type: 'string', format: 'uuid', nullable: true },
            price:                       { type: 'number', example: 1500 },
            currency:                    { type: 'string', example: 'EUR' },
            payment_plan:                { type: 'string', enum: ['full', 'installment', 'custom'], example: 'full' },
            duration_hours:              { type: 'integer', example: 35, nullable: true },
            duration_days:               { type: 'integer', example: 5, nullable: true },
            duration_unit:               { type: 'string', enum: ['hours', 'days'], example: 'hours' },
            capacity_max:                { type: 'integer', nullable: true },
            is_active:                   { type: 'boolean', example: true },
            published_online:            { type: 'boolean', example: false },
            eligible_cpf:                { type: 'boolean', example: false },
            cpf_code:                    { type: 'string', nullable: true },
            pedagogical_objectives:      { type: 'string', nullable: true },
            training_content:            { type: 'string', nullable: true },
            certification_issued:        { type: 'boolean', example: false },
            satisfaction_score_override: {
              type: 'number', nullable: true, minimum: 0, maximum: 5,
              description: 'Score de satisfaction manuel (remplace le calcul automatique)',
            },
            photo_url: { type: 'string', format: 'uri', nullable: true },
            programs: {
              nullable: true,
              type: 'object',
              description: 'Programme parent (si rattaché)',
              properties: {
                id:   { type: 'string', format: 'uuid' },
                name: { type: 'string' },
              },
            },
            organization_id: { type: 'string', format: 'uuid' },
            created_at:      { type: 'string', format: 'date-time' },
            updated_at:      { type: 'string', format: 'date-time' },
          },
        },
        // ─── Program ──────────────────────────────────────────────────────
        Program: {
          type: 'object',
          properties: {
            id:                  { type: 'string', format: 'uuid' },
            code:                { type: 'string', example: 'PROG-MGT' },
            name:                { type: 'string', example: 'Management' },
            description:         { type: 'string', nullable: true },
            category:            { type: 'string', nullable: true, example: 'Soft skills' },
            success_rate:        { type: 'integer', nullable: true, minimum: 0, maximum: 100, example: 87, description: 'Taux de réussite en % (0-100)' },
            satisfaction_rate:   { type: 'number', nullable: true, minimum: 0, maximum: 5, example: 4.6, description: 'Note de satisfaction moyenne sur 5' },
            completion_rate:     { type: 'integer', nullable: true, minimum: 0, maximum: 100, example: 92, description: 'Taux de complétion en % (0-100)' },
            total_learners:      { type: 'integer', nullable: true, example: 134, description: 'Nombre total d\'apprenants ayant suivi ce programme' },
            is_public:           { type: 'boolean', nullable: true, example: true, description: 'Affiché sur le site public de l\'organisme' },
            public_description:  { type: 'string', nullable: true, description: 'Description publique pour le site web' },
            public_image_url:    { type: 'string', format: 'uri', nullable: true },
            price:               { type: 'number', nullable: true },
            price_individual:    { type: 'number', nullable: true },
            price_freelance:     { type: 'number', nullable: true },
            price_enterprise:    { type: 'number', nullable: true },
            is_active:           { type: 'boolean', example: true },
            organization_id:     { type: 'string', format: 'uuid' },
            created_at:          { type: 'string', format: 'date-time' },
            updated_at:          { type: 'string', format: 'date-time' },
          },
        },
        // ─── Enrollment ───────────────────────────────────────────────────
        Enrollment: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            student_id:      { type: 'string', format: 'uuid' },
            session_id:      { type: 'string', format: 'uuid' },
            status:          { type: 'string', enum: ['active', 'cancelled', 'completed', 'pending'], example: 'active' },
            total_amount:    { type: 'number', example: 1500 },
            paid_amount:     { type: 'number', nullable: true, example: 0 },
            payment_status:  { type: 'string', nullable: true, example: 'pending' },
            funding_type_id: { type: 'string', format: 'uuid', nullable: true },
            enrollment_date: { type: 'string', format: 'date', nullable: true },
            students: {
              type: 'object',
              nullable: true,
              description: 'Données de l\'apprenant (incluses automatiquement)',
              properties: {
                id:         { type: 'string', format: 'uuid' },
                first_name: { type: 'string' },
                last_name:  { type: 'string' },
                email:      { type: 'string', format: 'email', nullable: true },
              },
            },
            sessions: {
              type: 'object',
              nullable: true,
              description: 'Données de la session (incluses automatiquement)',
              properties: {
                id:         { type: 'string', format: 'uuid' },
                name:       { type: 'string' },
                start_date: { type: 'string', format: 'date' },
                end_date:   { type: 'string', format: 'date' },
                status:     { type: 'string' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Invoice ──────────────────────────────────────────────────────
        Invoice: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            invoice_number:  { type: 'string', example: 'FAC-2026-0023', description: 'Numéro généré automatiquement (FAC-YYYY-NNN ou DEV-YYYY-NNN)' },
            document_type:   { type: 'string', enum: ['invoice', 'quote'], example: 'invoice' },
            status:          { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], example: 'draft' },
            amount:          { type: 'number', example: 1500, description: 'Montant HT' },
            total_amount:    { type: 'number', example: 1800, description: 'Montant TTC' },
            tax_amount:      { type: 'number', example: 300, description: 'Montant TVA' },
            currency:        { type: 'string', example: 'EUR' },
            issue_date:      { type: 'string', format: 'date' },
            due_date:        { type: 'string', format: 'date' },
            notes:           { type: 'string', nullable: true },
            items:           { type: 'array', nullable: true, items: { type: 'object' }, description: 'Lignes de détail' },
            pdf_url:         { type: 'string', format: 'uri', nullable: true },
            enrollment_id:   { type: 'string', format: 'uuid', nullable: true },
            student_id:      { type: 'string', format: 'uuid', nullable: true },
            organization_id: { type: 'string', format: 'uuid' },
            created_at:      { type: 'string', format: 'date-time' },
            updated_at:      { type: 'string', format: 'date-time' },
          },
        },
        // ─── DocumentTemplate ─────────────────────────────────────────────
        DocumentTemplate: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            name:       { type: 'string', example: 'Attestation de formation' },
            type:       { type: 'string', enum: ['attestation', 'facture', 'devis', 'contrat', 'programme', 'convention'], example: 'attestation' },
            is_active:  { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── SignatureRequest ──────────────────────────────────────────────
        SignatureRequest: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            document_id:      { type: 'string', format: 'uuid' },
            status:           { type: 'string', enum: ['pending', 'signed', 'expired', 'declined', 'cancelled'], example: 'pending' },
            recipient_email:  { type: 'string', format: 'email' },
            recipient_name:   { type: 'string' },
            recipient_type:   { type: 'string', enum: ['student', 'funder', 'teacher', 'other'] },
            recipient_id:     { type: 'string', format: 'uuid', nullable: true },
            subject:          { type: 'string', nullable: true },
            message:          { type: 'string', nullable: true },
            expires_at:       { type: 'string', format: 'date-time' },
            signed_at:        { type: 'string', format: 'date-time', nullable: true },
            organization_id:  { type: 'string', format: 'uuid' },
            created_at:       { type: 'string', format: 'date-time' },
          },
        },
      },
      // ─── Réponses réutilisables ─────────────────────────────────────────
      responses: {
        Unauthorized: {
          description: 'Clé API manquante ou invalide',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Scope insuffisant ou plan Enterprise requis',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Ressource introuvable',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        BadRequest: {
          description: 'Paramètres invalides ou manquants',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        RateLimit: {
          description: 'Limite de requêtes dépassée',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    // ═══════════════════════════════════════════════════════════════════════
    // PATHS
    // ═══════════════════════════════════════════════════════════════════════
    paths: {
      // ─── Programmes ──────────────────────────────────────────────────────
      '/api/v1/programs': {
        get: {
          operationId: 'listPrograms',
          summary: 'Liste des programmes',
          description: `Retourne les programmes de formation avec leurs statistiques Qualiopi.

**Cas d'usage — site web public :**
\`\`\`
GET /api/v1/programs?is_public=true
\`\`\`
Scope requis : \`read:programs\``,
          tags: ['Programmes'],
          parameters: [
            { name: 'page',      in: 'query', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'Numéro de page' },
            { name: 'limit',     in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 }, description: 'Éléments par page (max 100)' },
            { name: 'search',    in: 'query', schema: { type: 'string' }, description: 'Recherche dans nom, code, description' },
            { name: 'is_public', in: 'query', schema: { type: 'boolean' }, description: '`true` = uniquement les programmes visibles sur le site public' },
            { name: 'is_active', in: 'query', schema: { type: 'boolean' }, description: 'Filtrer par statut actif (par défaut tous retournés)' },
          ],
          responses: {
            '200': {
              description: 'Liste paginée des programmes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Program' } },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                  example: {
                    data: [{
                      id: 'a1b2c3d4-0000-0000-0000-ef1234567890',
                      code: 'PROG-MGT',
                      name: 'Management',
                      description: null,
                      category: 'Soft skills',
                      success_rate: 87,
                      satisfaction_rate: 4.6,
                      completion_rate: 92,
                      total_learners: 134,
                      is_public: true,
                      public_description: 'Développez vos compétences managériales.',
                      public_image_url: 'https://cdn.eduzen.fr/programmes/management.jpg',
                      price: null,
                      price_individual: 1500,
                      price_enterprise: 1200,
                      is_active: true,
                      created_at: '2025-01-15T09:00:00Z',
                      updated_at: '2026-06-01T14:30:00Z',
                    }],
                    meta: { page: 1, limit: 50, total: 1 },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },

      // ─── Formations ──────────────────────────────────────────────────────
      '/api/v1/formations': {
        get: {
          operationId: 'listFormations',
          summary: 'Liste des formations',
          description: `Retourne les formations avec le programme parent rattaché.

Scope requis : \`read:formations\``,
          tags: ['Formations'],
          parameters: [
            { name: 'page',       in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            { name: 'limit',      in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
            { name: 'search',     in: 'query', schema: { type: 'string' }, description: 'Recherche dans nom, code, description' },
            { name: 'program_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filtrer par programme parent' },
          ],
          responses: {
            '200': {
              description: 'Liste paginée des formations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Formation' } },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },

      // ─── Sessions ────────────────────────────────────────────────────────
      '/api/v1/sessions': {
        get: {
          operationId: 'listSessions',
          summary: 'Liste des sessions',
          description: `Retourne les sessions de formation, triées par date de début.

Scope requis : \`read:sessions\``,
          tags: ['Sessions'],
          parameters: [
            { name: 'page',         in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            { name: 'limit',        in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
            { name: 'search',       in: 'query', schema: { type: 'string' }, description: 'Recherche par nom de session' },
            { name: 'status',       in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'] }, description: 'Filtrer par statut' },
            { name: 'formation_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filtrer par formation' },
          ],
          responses: {
            '200': {
              description: 'Liste paginée des sessions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Session' } },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },

      // ─── Apprenants ──────────────────────────────────────────────────────
      '/api/v1/students': {
        get: {
          operationId: 'listStudents',
          summary: 'Liste des apprenants',
          description: 'Scope requis : `read:students`',
          tags: ['Apprenants'],
          parameters: [
            { name: 'page',   in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Recherche par nom ou email' },
          ],
          responses: {
            '200': {
              description: 'Liste paginée des apprenants',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Student' } },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
        post: {
          operationId: 'createStudent',
          summary: 'Créer un apprenant',
          description: 'Scope requis : `write:students`',
          tags: ['Apprenants'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['first_name', 'last_name'],
                  properties: {
                    first_name:    { type: 'string', example: 'Marie' },
                    last_name:     { type: 'string', example: 'Dupont' },
                    email:         { type: 'string', format: 'email', nullable: true },
                    phone:         { type: 'string', nullable: true },
                    date_of_birth: { type: 'string', format: 'date', nullable: true },
                    status:        { type: 'string', enum: ['active', 'inactive'], default: 'active' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Apprenant créé',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Student' } } },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      // ─── Inscriptions ────────────────────────────────────────────────────
      '/api/v1/enrollments': {
        get: {
          operationId: 'listEnrollments',
          summary: 'Liste des inscriptions',
          description: `Retourne les inscriptions avec les données de l'apprenant et de la session incluses.

Scope requis : \`read:enrollments\``,
          tags: ['Inscriptions'],
          parameters: [
            { name: 'page',       in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            { name: 'limit',      in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
            { name: 'session_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filtrer par session' },
            { name: 'student_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filtrer par apprenant' },
            { name: 'status',     in: 'query', schema: { type: 'string', enum: ['active', 'cancelled', 'completed', 'pending'] } },
          ],
          responses: {
            '200': {
              description: 'Liste paginée des inscriptions (avec joins students + sessions)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Enrollment' } },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
        post: {
          operationId: 'createEnrollment',
          summary: 'Inscrire un apprenant à une session',
          description: `Crée une inscription. L'apprenant et la session doivent appartenir à la même organisation.

Scope requis : \`write:enrollments\``,
          tags: ['Inscriptions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['student_id', 'session_id'],
                  properties: {
                    student_id:      { type: 'string', format: 'uuid' },
                    session_id:      { type: 'string', format: 'uuid' },
                    status:          { type: 'string', enum: ['active', 'pending'], default: 'active' },
                    total_amount:    { type: 'number', default: 0, description: 'Montant de l\'inscription' },
                    funding_type_id: { type: 'string', format: 'uuid', nullable: true, description: 'Type de financement (OPCO, CPF, etc.)' },
                    enrollment_date: { type: 'string', format: 'date', description: 'Date d\'inscription (défaut: aujourd\'hui)' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Inscription créée',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Enrollment' } } },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { description: 'Apprenant ou session introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      '/api/v1/enrollments/{id}': {
        get: {
          operationId: 'getEnrollment',
          summary: 'Récupérer une inscription',
          description: `Retourne une inscription par son ID avec les données apprenant + session.

Scope requis : \`read:enrollments\``,
          tags: ['Inscriptions'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de l\'inscription' },
          ],
          responses: {
            '200': {
              description: 'Inscription trouvée',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Enrollment' } } },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Factures ────────────────────────────────────────────────────────
      '/api/v1/invoices': {
        get: {
          operationId: 'listInvoices',
          summary: 'Liste des factures et devis',
          description: `Retourne les factures et devis de l'organisation.

Scope requis : \`read:invoices\``,
          tags: ['Factures'],
          parameters: [
            { name: 'page',          in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            { name: 'limit',         in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
            { name: 'enrollment_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filtrer par inscription' },
            { name: 'student_id',    in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filtrer par apprenant' },
            { name: 'document_type', in: 'query', schema: { type: 'string', enum: ['invoice', 'quote'] }, description: 'Filtrer par type' },
            { name: 'status',        in: 'query', schema: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] } },
          ],
          responses: {
            '200': {
              description: 'Liste paginée des factures',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
        post: {
          operationId: 'createInvoice',
          summary: 'Créer une facture ou un devis',
          description: `Le numéro est généré automatiquement (FAC-YYYY-NNN pour une facture, DEV-YYYY-NNN pour un devis).

Scope requis : \`write:invoices\``,
          tags: ['Factures'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['enrollment_id', 'amount'],
                  properties: {
                    enrollment_id: { type: 'string', format: 'uuid', description: 'Inscription associée (obligatoire)' },
                    document_type: { type: 'string', enum: ['invoice', 'quote'], default: 'invoice' },
                    amount:        { type: 'number', description: 'Montant HT' },
                    total_amount:  { type: 'number', description: 'Montant TTC (défaut: égal à amount)' },
                    tax_amount:    { type: 'number', default: 0, description: 'Montant TVA' },
                    currency:      { type: 'string', default: 'EUR' },
                    status:        { type: 'string', enum: ['draft', 'sent'], default: 'draft' },
                    due_date:      { type: 'string', format: 'date', description: 'Date d\'échéance (défaut: +30 jours)' },
                    issue_date:    { type: 'string', format: 'date', description: 'Date d\'émission (défaut: aujourd\'hui)' },
                    notes:         { type: 'string', nullable: true },
                    items: {
                      type: 'array', nullable: true,
                      description: 'Lignes de détail (optionnel)',
                      items: {
                        type: 'object',
                        properties: {
                          description: { type: 'string' },
                          quantity:    { type: 'number' },
                          unit_price:  { type: 'number' },
                          total:       { type: 'number' },
                        },
                      },
                    },
                    pdf_url:     { type: 'string', format: 'uri', nullable: true, description: 'URL du PDF (depuis /api/v1/documents/generate)' },
                    document_id: { type: 'string', format: 'uuid', nullable: true, description: 'ID du document généré (pour traçabilité)' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Facture ou devis créé',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Invoice' } } },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { description: 'Inscription introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ─── Documents ───────────────────────────────────────────────────────
      '/api/v1/document-templates': {
        get: {
          operationId: 'listDocumentTemplates',
          summary: 'Liste des templates de documents',
          description: 'Scope requis : `read:documents`',
          tags: ['Documents'],
          parameters: [
            { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'type',  in: 'query', schema: { type: 'string', enum: ['attestation', 'facture', 'devis', 'contrat', 'programme', 'convention'] } },
          ],
          responses: {
            '200': {
              description: 'Liste des templates',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/DocumentTemplate' } },
                      meta: { type: 'object', properties: { total: { type: 'integer' } } },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/api/v1/document-templates/{id}': {
        get: {
          operationId: 'getDocumentTemplate',
          summary: 'Récupérer un template',
          description: 'Scope requis : `read:documents`',
          tags: ['Documents'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': {
              description: 'Template trouvé',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentTemplate' } } },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/api/v1/documents/generate': {
        post: {
          operationId: 'generateDocument',
          summary: 'Générer un document',
          description: `Génère un document à partir d'un template et de variables. Retourne le fichier binaire (download=true) ou les métadonnées (download=false).

Scope requis : \`write:documents\``,
          tags: ['Documents'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template_id', 'format', 'variables'],
                  properties: {
                    template_id:          { type: 'string', format: 'uuid' },
                    format:               { type: 'string', enum: ['PDF', 'DOCX', 'HTML'], example: 'PDF' },
                    variables:            { type: 'object', description: 'Variables à injecter dans le template (ex: { student_name: "Marie Dupont" })' },
                    related_entity_type:  { type: 'string', nullable: true, description: 'Type de l\'entité liée (ex: "student", "session")' },
                    related_entity_id:    { type: 'string', format: 'uuid', nullable: true },
                    download:             { type: 'boolean', default: true, description: 'true = fichier binaire, false = métadonnées JSON' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Document généré',
              content: {
                'application/pdf': { schema: { type: 'string', format: 'binary' } },
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { schema: { type: 'string', format: 'binary' } },
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          file_name:  { type: 'string' },
                          page_count: { type: 'integer' },
                          format:     { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Email ───────────────────────────────────────────────────────────
      '/api/v1/email/send': {
        post: {
          operationId: 'sendEmail',
          summary: 'Envoyer un email',
          description: `Envoie un email via Resend au nom de l'organisation.

Scope requis : \`send:email\``,
          tags: ['Email'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['to', 'subject'],
                  properties: {
                    to:       { oneOf: [{ type: 'string', format: 'email' }, { type: 'array', items: { type: 'string', format: 'email' } }] },
                    subject:  { type: 'string' },
                    html:     { type: 'string', description: 'Corps HTML (html ou text requis)' },
                    text:     { type: 'string', description: 'Corps texte brut' },
                    cc:       { oneOf: [{ type: 'string', format: 'email' }, { type: 'array', items: { type: 'string', format: 'email' } }] },
                    bcc:      { oneOf: [{ type: 'string', format: 'email' }, { type: 'array', items: { type: 'string', format: 'email' } }] },
                    reply_to: { type: 'string', format: 'email' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Email envoyé',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'object', properties: { id: { type: 'string' }, to: { type: 'array', items: { type: 'string' } } } },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      // ─── Signatures ──────────────────────────────────────────────────────
      '/api/v1/signature-requests': {
        get: {
          operationId: 'listSignatureRequests',
          summary: 'Liste des demandes de signature',
          description: 'Scope requis : `read:signatures`',
          tags: ['Signatures'],
          parameters: [
            { name: 'status',         in: 'query', schema: { type: 'string', enum: ['pending', 'signed', 'expired', 'declined', 'cancelled'] } },
            { name: 'recipient_type', in: 'query', schema: { type: 'string', enum: ['student', 'funder', 'teacher', 'other'] } },
          ],
          responses: {
            '200': {
              description: 'Liste des demandes de signature',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/SignatureRequest' } },
                      meta: { type: 'object', properties: { total: { type: 'integer' } } },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          operationId: 'createSignatureRequest',
          summary: 'Créer une demande de signature',
          description: `Crée une ou plusieurs demandes de signature et envoie les emails automatiquement. Maximum 20 destinataires par appel.

Scope requis : \`write:signatures\``,
          tags: ['Signatures'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['document_id'],
                  properties: {
                    document_id:      { type: 'string', format: 'uuid' },
                    recipient_email:  { type: 'string', format: 'email', description: 'Requis pour envoi unique' },
                    recipient_name:   { type: 'string', description: 'Requis pour envoi unique' },
                    recipient_type:   { type: 'string', enum: ['student', 'funder', 'teacher', 'other'], description: 'Requis pour envoi unique' },
                    recipient_id:     { type: 'string', format: 'uuid', nullable: true },
                    subject:          { type: 'string', nullable: true, description: 'Objet de l\'email (défaut: "Demande de signature : <titre>")' },
                    message:          { type: 'string', nullable: true },
                    expires_at:       { type: 'string', format: 'date-time', description: 'Expiration (défaut: +30 jours)' },
                    recipients: {
                      type: 'array',
                      description: 'Pour envoi multiple (remplace recipient_email / name / type)',
                      maxItems: 20,
                      items: {
                        type: 'object',
                        required: ['email', 'name', 'type'],
                        properties: {
                          email: { type: 'string', format: 'email' },
                          name:  { type: 'string' },
                          type:  { type: 'string', enum: ['student', 'funder', 'teacher', 'other'] },
                          id:    { type: 'string', format: 'uuid', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Demande(s) créée(s) et email(s) envoyé(s)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { $ref: '#/components/schemas/SignatureRequest' } },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Webhooks ────────────────────────────────────────────────────────
      '/api/v1/webhooks/incoming': {
        post: {
          operationId: 'receiveWebhookEvent',
          summary: 'Recevoir un événement externe',
          description: `Reçoit et stocke un événement depuis une application externe (Typeform, Make, Zapier…).

Scope requis : \`write:webhooks\``,
          tags: ['Webhooks'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['event', 'data'],
                  properties: {
                    event:            { type: 'string', example: 'student.updated', description: 'Type d\'événement' },
                    data:             { type: 'object', description: 'Payload de l\'événement' },
                    source:           { type: 'string', example: 'typeform', description: 'Nom de l\'application source' },
                    idempotency_key:  { type: 'string', description: 'Clé d\'idempotence pour éviter les doublons' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Événement reçu',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'object', properties: { id: { type: 'string' }, event: { type: 'string' }, status: { type: 'string' } } },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/api/v1/webhooks/events': {
        get: {
          operationId: 'listWebhookEvents',
          summary: 'Types d\'événements disponibles',
          description: 'Retourne la liste des types d\'événements pouvant déclencher un webhook sortant.',
          tags: ['Webhooks'],
          responses: {
            '200': {
              description: 'Liste des types d\'événements',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      events: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name:        { type: 'string', example: 'session.completed' },
                            description: { type: 'string', example: 'Déclenché quand une session est marquée terminée' },
                            category:    { type: 'string', example: 'Sessions' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ═══════════════════════════════════════════════════════════════════════
    // WEBHOOKS SORTANTS (x-webhooks)
    // ═══════════════════════════════════════════════════════════════════════
    'x-webhooks': {
      'learner.created': {
        post: {
          summary: 'Apprenant créé',
          description: 'Déclenché quand un nouvel apprenant est créé dans l\'organisation.',
          tags: ['Événements Webhook'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event:     { type: 'string', example: 'learner.created' },
                    timestamp: { type: 'string', format: 'date-time' },
                    data: {
                      type: 'object',
                      properties: {
                        id:        { type: 'string', format: 'uuid' },
                        full_name: { type: 'string' },
                        email:     { type: 'string', format: 'email' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Webhook reçu' } },
        },
      },
      'session.completed': {
        post: {
          summary: 'Session terminée',
          description: 'Déclenché quand une session passe au statut "completed".',
          tags: ['Événements Webhook'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event:     { type: 'string', example: 'session.completed' },
                    timestamp: { type: 'string', format: 'date-time' },
                    data: {
                      type: 'object',
                      properties: {
                        session_id:   { type: 'string', format: 'uuid' },
                        session_name: { type: 'string' },
                        end_date:     { type: 'string', format: 'date' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Webhook reçu' } },
        },
      },
      'document.signed': {
        post: {
          summary: 'Document signé',
          description: 'Déclenché quand un document (contrat, convention) est signé électroniquement.',
          tags: ['Événements Webhook'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event:     { type: 'string', example: 'document.signed' },
                    timestamp: { type: 'string', format: 'date-time' },
                    data: {
                      type: 'object',
                      properties: {
                        document_id:    { type: 'string', format: 'uuid' },
                        signer_name:    { type: 'string' },
                        signer_email:   { type: 'string', format: 'email' },
                        document_type:  { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Webhook reçu' } },
        },
      },
      'payment.received': {
        post: {
          summary: 'Paiement reçu',
          description: 'Déclenché quand un paiement est enregistré avec succès.',
          tags: ['Événements Webhook'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event:     { type: 'string', example: 'payment.received' },
                    timestamp: { type: 'string', format: 'date-time' },
                    data: {
                      type: 'object',
                      properties: {
                        payment_id:   { type: 'string', format: 'uuid' },
                        amount:       { type: 'number' },
                        currency:     { type: 'string' },
                        student_name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Webhook reçu' } },
        },
      },
      'diploma.expired': {
        post: {
          summary: 'Diplôme expiré',
          description: 'Déclenché quand un diplôme ou certificat arrive à expiration.',
          tags: ['Événements Webhook'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event:     { type: 'string', example: 'diploma.expired' },
                    timestamp: { type: 'string', format: 'date-time' },
                    data: {
                      type: 'object',
                      properties: {
                        student_id:   { type: 'string', format: 'uuid' },
                        student_name: { type: 'string' },
                        diploma_name: { type: 'string' },
                        expired_at:   { type: 'string', format: 'date' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Webhook reçu' } },
        },
      },
    },
  }

  return NextResponse.json(spec)
}
