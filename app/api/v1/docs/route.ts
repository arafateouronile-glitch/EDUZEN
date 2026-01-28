import { NextResponse } from 'next/server'
import { APP_URLS } from '@/lib/config/app-config'

/**
 * GET /api/v1/docs
 * Documentation OpenAPI/Swagger de l'API
 */
export async function GET() {
  const openAPISpec = {
    openapi: '3.0.0',
    info: {
      title: 'EDUZEN API',
      version: '1.0.0',
      description: 'API publique pour accéder aux données EDUZEN',
      contact: {
        name: 'Support EDUZEN',
        email: 'support@eduzen.com',
      },
    },
    servers: [
      {
        url: APP_URLS.getBaseUrl(),
        description: 'Production server',
      },
    ],
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token Bearer pour authentification CRON (utilise CRON_SECRET)',
        },
      },
      schemas: {
        Student: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            full_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            date_of_birth: { type: 'string', format: 'date' },
            student_number: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'graduated'] },
          },
        },
        DocumentTemplate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['attestation', 'facture', 'devis', 'contrat'] },
            body: { type: 'object' },
            variables: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        SignatureRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            document_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'signed', 'expired', 'declined', 'cancelled'] },
            recipient_email: { type: 'string', format: 'email' },
            recipient_name: { type: 'string' },
            recipient_type: { type: 'string', enum: ['student', 'funder', 'teacher', 'other'] },
            message: { type: 'string' },
            expires_at: { type: 'string', format: 'date-time' },
            signed_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Requête invalide',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Unauthorized: {
          description: 'Non authentifié',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Permissions insuffisantes',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        RateLimit: {
          description: 'Rate limit dépassé',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    paths: {
      '/api/v1/students': {
        get: {
          summary: 'Liste des étudiants',
          description: 'Récupère la liste des étudiants de l\'organisation',
          tags: ['Students'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1, minimum: 1 },
              description: 'Numéro de page',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 },
              description: 'Nombre d\'éléments par page',
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Recherche par nom ou email',
            },
          ],
          responses: {
            '200': {
              description: 'Liste des étudiants',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Student' },
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Non authentifié',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Permissions insuffisantes',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '429': {
              description: 'Rate limit dépassé',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/v1/document-templates': {
        get: {
          summary: 'Liste des templates de documents',
          description: 'Récupère la liste des templates de documents disponibles',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['attestation', 'facture', 'devis', 'contrat'] },
              description: 'Filtrer par type de document',
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1, minimum: 1 },
              description: 'Numéro de page',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
              description: 'Nombre d\'éléments par page',
            },
          ],
          responses: {
            '200': {
              description: 'Liste des templates',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/DocumentTemplate' },
                      },
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
          summary: 'Créer un template de document',
          description: 'Crée un nouveau template de document',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'type'],
                  properties: {
                    name: { type: 'string', description: 'Nom du template' },
                    type: { type: 'string', enum: ['attestation', 'facture', 'devis', 'contrat'] },
                    body: { type: 'object', description: 'Corps du template' },
                    variables: { type: 'object', description: 'Variables disponibles' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Template créé',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DocumentTemplate' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/v1/document-templates/{id}': {
        get: {
          summary: 'Récupérer un template',
          description: 'Récupère un template de document par son ID',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID du template',
            },
          ],
          responses: {
            '200': {
              description: 'Template trouvé',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DocumentTemplate' },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/documents/generate': {
        post: {
          summary: 'Générer un document',
          description: 'Génère un document à partir d\'un template et de variables',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template_id', 'variables'],
                  properties: {
                    template_id: { type: 'string', format: 'uuid', description: 'ID du template' },
                    variables: { type: 'object', description: 'Variables à remplacer dans le template' },
                    format: { type: 'string', enum: ['PDF', 'DOCX', 'HTML'], default: 'PDF' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Document généré',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      document_url: { type: 'string', format: 'uri' },
                      document_id: { type: 'string', format: 'uuid' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/auth/check': {
        get: {
          summary: 'Vérifier l\'authentification',
          description: 'Vérifie l\'état de l\'authentification de l\'utilisateur',
          tags: ['Auth'],
          responses: {
            '200': {
              description: 'État de l\'authentification',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authenticated: { type: 'boolean' },
                      user: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/signature-requests': {
        get: {
          summary: 'Liste des demandes de signature',
          description: 'Récupère les demandes de signature pour une organisation',
          tags: ['Signature Requests'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['pending', 'signed', 'expired', 'declined', 'cancelled'] },
              description: 'Filtrer par statut',
            },
            {
              name: 'recipientType',
              in: 'query',
              schema: { type: 'string', enum: ['student', 'funder', 'teacher', 'other'] },
              description: 'Filtrer par type de destinataire',
            },
          ],
          responses: {
            '200': {
              description: 'Liste des demandes de signature',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SignatureRequest' },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          summary: 'Créer une demande de signature',
          description: 'Crée une ou plusieurs demandes de signature',
          tags: ['Signature Requests'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['document_id', 'recipients'],
                  properties: {
                    document_id: { type: 'string', format: 'uuid' },
                    recipients: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['email', 'name'],
                        properties: {
                          email: { type: 'string', format: 'email' },
                          name: { type: 'string' },
                          role: { type: 'string', enum: ['signer', 'viewer'] },
                        },
                      },
                    },
                    message: { type: 'string' },
                    expires_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Demande(s) de signature créée(s)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      requests: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/SignatureRequest' },
                      },
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
      '/api/payments/stripe/create-intent': {
        post: {
          summary: 'Créer une intention de paiement Stripe',
          description: 'Crée une intention de paiement Stripe pour un montant donné',
          tags: ['Payments'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'customer_email'],
                  properties: {
                    amount: { type: 'number', minimum: 0.01, maximum: 999999999 },
                    currency: { type: 'string', enum: ['EUR', 'USD', 'GBP', 'CHF', 'CAD'], default: 'EUR' },
                    description: { type: 'string', maxLength: 500 },
                    customer_email: { type: 'string', format: 'email' },
                    customer_name: { type: 'string', maxLength: 100 },
                    metadata: { type: 'object' },
                    return_url: { type: 'string', format: 'uri' },
                    cancel_url: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Intention de paiement créée',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      client_secret: { type: 'string' },
                      payment_intent_id: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/email/send': {
        post: {
          summary: 'Envoyer un email',
          description: 'Envoie un email à un ou plusieurs destinataires',
          tags: ['Email'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['to', 'subject'],
                  properties: {
                    to: {
                      oneOf: [
                        { type: 'string', format: 'email' },
                        { type: 'array', items: { type: 'string', format: 'email' } },
                      ],
                    },
                    subject: { type: 'string', minLength: 1, maxLength: 200 },
                    html: { type: 'string', maxLength: 100000 },
                    text: { type: 'string', maxLength: 100000 },
                    cc: {
                      oneOf: [
                        { type: 'string', format: 'email' },
                        { type: 'array', items: { type: 'string', format: 'email' } },
                      ],
                    },
                    bcc: {
                      oneOf: [
                        { type: 'string', format: 'email' },
                        { type: 'array', items: { type: 'string', format: 'email' } },
                      ],
                    },
                    replyTo: { type: 'string', format: 'email' },
                    attachments: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          filename: { type: 'string' },
                          content: { type: 'string' },
                          contentType: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Email envoyé avec succès',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message_id: { type: 'string' },
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/document-templates': {
        get: {
          summary: 'Liste des templates de documents (v2)',
          description: 'Récupère tous les templates de documents d\'une organisation',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['attestation', 'facture', 'devis', 'contrat'] },
              description: 'Filtrer par type de document',
            },
            {
              name: 'isActive',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'Filtrer par statut actif',
            },
          ],
          responses: {
            '200': {
              description: 'Liste des templates',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/DocumentTemplate' },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        post: {
          summary: 'Créer un template de document (v2)',
          description: 'Crée un nouveau template de document',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'type', 'organization_id'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['attestation', 'facture', 'devis', 'contrat'] },
                    organization_id: { type: 'string', format: 'uuid' },
                    body: { type: 'object' },
                    variables: { type: 'object' },
                    is_active: { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Template créé',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DocumentTemplate' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/documents/generate': {
        post: {
          summary: 'Générer un document (v2)',
          description: 'Génère un document à partir d\'un template et de variables',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template_id', 'variables'],
                  properties: {
                    template_id: { type: 'string', format: 'uuid' },
                    variables: { type: 'object' },
                    format: { type: 'string', enum: ['PDF', 'DOCX', 'HTML'], default: 'PDF' },
                    send_email: { type: 'boolean', default: false },
                    email_recipients: {
                      type: 'array',
                      items: { type: 'string', format: 'email' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Document généré',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      document_url: { type: 'string', format: 'uri' },
                      document_id: { type: 'string', format: 'uuid' },
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/learner/data': {
        get: {
          summary: 'Récupérer les données de l\'espace apprenant',
          description: 'Récupère les données de l\'apprenant (étudiant, inscriptions, cours, etc.)',
          tags: ['Learner'],
          parameters: [
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['student', 'enrollments', 'courses', 'attendance', 'grades'] },
              description: 'Type de données à récupérer',
            },
            {
              name: 'access_token',
              in: 'query',
              schema: { type: 'string' },
              description: 'Token d\'accès direct (optionnel)',
            },
          ],
          responses: {
            '200': {
              description: 'Données récupérées avec succès',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    description: 'Structure varie selon le type demandé',
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/push-notifications/register': {
        post: {
          summary: 'Enregistrer un device pour notifications push',
          description: 'Enregistre un appareil pour recevoir des notifications push',
          tags: ['Push Notifications'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['deviceToken', 'deviceType', 'platform'],
                  properties: {
                    deviceToken: { type: 'string', description: 'Token unique du device' },
                    deviceType: { type: 'string', enum: ['mobile', 'tablet', 'desktop'] },
                    platform: { type: 'string', enum: ['ios', 'android', 'web'] },
                    deviceName: { type: 'string' },
                    deviceModel: { type: 'string' },
                    osVersion: { type: 'string' },
                    appVersion: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Device enregistré',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      device: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          device_token: { type: 'string' },
                          device_type: { type: 'string' },
                          platform: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/push-notifications/unregister': {
        post: {
          summary: 'Désenregistrer un device',
          description: 'Désenregistre un appareil pour ne plus recevoir de notifications push',
          tags: ['Push Notifications'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['deviceToken'],
                  properties: {
                    deviceToken: { type: 'string', description: 'Token du device à désenregistrer' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Device désenregistré',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/document-templates/{id}': {
        get: {
          summary: 'Récupérer un template par ID (v2)',
          description: 'Récupère un template de document par son ID',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID du template',
            },
          ],
          responses: {
            '200': {
              description: 'Template trouvé',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DocumentTemplate' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          summary: 'Mettre à jour un template (v2)',
          description: 'Met à jour un template de document existant',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID du template',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    body: { type: 'object' },
                    variables: { type: 'object' },
                    is_active: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Template mis à jour',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DocumentTemplate' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          summary: 'Supprimer un template (v2)',
          description: 'Supprime un template de document',
          tags: ['Document Templates'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID du template',
            },
          ],
          responses: {
            '200': {
              description: 'Template supprimé',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/documents/generate-batch': {
        post: {
          summary: 'Générer plusieurs documents en masse',
          description: 'Génère plusieurs documents à partir d\'un template et d\'une liste de variables',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template_id', 'format', 'items'],
                  properties: {
                    template_id: { type: 'string', format: 'uuid' },
                    format: { type: 'string', enum: ['PDF', 'DOCX'] },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          variables: { type: 'object' },
                        },
                      },
                    },
                    zip_filename: { type: 'string', maxLength: 200 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Documents générés (fichier ZIP)',
              content: {
                'application/zip': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/signature-requests/{id}': {
        patch: {
          summary: 'Mettre à jour une demande de signature',
          description: 'Met à jour une demande de signature (annuler, envoyer rappel, etc.)',
          tags: ['Signature Requests'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID de la demande de signature',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: { type: 'string', enum: ['cancel', 'remind'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Demande mise à jour',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/payments/stripe/status/{paymentIntentId}': {
        get: {
          summary: 'Vérifier le statut d\'un paiement Stripe',
          description: 'Récupère le statut d\'une intention de paiement Stripe',
          tags: ['Payments'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'paymentIntentId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'ID de l\'intention de paiement Stripe',
            },
          ],
          responses: {
            '200': {
              description: 'Statut du paiement',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['requires_payment_method', 'processing', 'succeeded', 'canceled'] },
                      amount: { type: 'number' },
                      currency: { type: 'string' },
                      paid: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/resources/upload': {
        post: {
          summary: 'Uploader une ressource',
          description: 'Upload une ressource (fichier) vers Supabase Storage',
          tags: ['Resources'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file', 'organization_id', 'title', 'resource_type'],
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    organization_id: { type: 'string', format: 'uuid' },
                    category_id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    resource_type: { type: 'string' },
                    tags: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ressource uploadée',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      resource: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          title: { type: 'string' },
                          file_url: { type: 'string', format: 'uri' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/resources/{id}/download': {
        get: {
          summary: 'Télécharger une ressource',
          description: 'Télécharge ou redirige vers une ressource',
          tags: ['Resources'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID de la ressource',
            },
          ],
          responses: {
            '200': {
              description: 'Redirection vers la ressource',
              headers: {
                Location: {
                  schema: { type: 'string', format: 'uri' },
                  description: 'URL de la ressource',
                },
              },
            },
            '301': {
              description: 'Redirection permanente vers la ressource',
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/documents/scheduled': {
        get: {
          summary: 'Liste des générations programmées',
          description: 'Récupère toutes les générations de documents programmées pour une organisation',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Liste des générations programmées',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        template_id: { type: 'string', format: 'uuid' },
                        scheduled_at: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        post: {
          summary: 'Créer une génération programmée',
          description: 'Programme la génération d\'un document à une date/heure précise',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template_id', 'scheduled_at', 'variables'],
                  properties: {
                    template_id: { type: 'string', format: 'uuid' },
                    scheduled_at: { type: 'string', format: 'date-time' },
                    variables: { type: 'object' },
                    format: { type: 'string', enum: ['PDF', 'DOCX', 'HTML'], default: 'PDF' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Génération programmée créée',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      scheduled_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/documents/schedule-send': {
        post: {
          summary: 'Programmer l\'envoi d\'un document',
          description: 'Programme l\'envoi d\'un document par email à une date/heure précise',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['document_id', 'scheduled_at'],
                  properties: {
                    document_id: { type: 'string', format: 'uuid' },
                    recipient_type: { type: 'string', enum: ['student', 'funder', 'teacher'] },
                    recipient_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                    session_id: { type: 'string', format: 'uuid' },
                    scheduled_at: { type: 'string', format: 'date-time' },
                    subject: { type: 'string' },
                    message: { type: 'string' },
                    send_via: { type: 'string', enum: ['email', 'sms'] },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Envoi programmé créé',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      scheduled_at: { type: 'string', format: 'date-time' },
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
      '/api/signature-requests/sign': {
        post: {
          summary: 'Signer une demande de signature',
          description: 'Signe une demande de signature (endpoint public, accessible via token)',
          tags: ['Signature Requests'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'signatureData'],
                  properties: {
                    token: { type: 'string', description: 'Token d\'accès à la demande de signature' },
                    signatureData: {
                      type: 'object',
                      description: 'Données de la signature (image, coordonnées, etc.)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Signature effectuée',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      signature: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/learner/access-token': {
        post: {
          summary: 'Générer un token d\'accès pour apprenant',
          description: 'Génère un token d\'accès temporaire pour un apprenant (espace apprenant)',
          tags: ['Learner'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['studentId'],
                  properties: {
                    studentId: { type: 'string', format: 'uuid' },
                    sessionId: { type: 'string', format: 'uuid' },
                    expiresInDays: { type: 'integer', default: 30, minimum: 1, maximum: 365 },
                    maxUses: { type: 'integer', nullable: true, minimum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Token généré',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      token: { type: 'string' },
                      expiresAt: { type: 'string', format: 'date-time' },
                      accessUrl: { type: 'string', format: 'uri' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/users/create': {
        post: {
          summary: 'Créer un utilisateur',
          description: 'Crée un nouvel utilisateur dans le système',
          tags: ['Users'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'full_name', 'organization_id'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    full_name: { type: 'string', minLength: 2, maxLength: 100 },
                    phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
                    organization_id: { type: 'string', format: 'uuid' },
                    password: {
                      type: 'string',
                      minLength: 8,
                      maxLength: 72,
                      description: 'Doit contenir majuscule, minuscule et chiffre',
                    },
                    role: { type: 'string', enum: ['super_admin', 'admin', 'teacher', 'student'] },
                    is_active: { type: 'boolean', default: true },
                    send_invitation: { type: 'boolean', default: false },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Utilisateur créé',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          email: { type: 'string', format: 'email' },
                          full_name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '409': {
              description: 'Utilisateur déjà existant',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/electronic-attendance/sessions': {
        get: {
          summary: 'Liste des sessions d\'émargement électronique',
          description: 'Récupère les sessions d\'émargement électronique pour une organisation',
          tags: ['Electronic Attendance'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['draft', 'active', 'closed', 'cancelled'] },
              description: 'Filtrer par statut',
            },
            {
              name: 'date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filtrer par date',
            },
            {
              name: 'sessionId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Filtrer par session',
            },
          ],
          responses: {
            '200': {
              description: 'Liste des sessions',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        session_id: { type: 'string', format: 'uuid' },
                        date: { type: 'string', format: 'date' },
                        status: { type: 'string' },
                        requests: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              student_name: { type: 'string' },
                              status: { type: 'string' },
                              signed_at: { type: 'string', format: 'date-time' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/documents/generate-pdf': {
        post: {
          summary: 'Générer un document PDF',
          description: 'Génère un document PDF à partir d\'un template et de variables',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template', 'variables'],
                  properties: {
                    template: { $ref: '#/components/schemas/DocumentTemplate' },
                    variables: { type: 'object' },
                    documentId: { type: 'string', format: 'uuid' },
                    organizationId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'PDF généré',
              content: {
                'application/pdf': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/documents/generate-docx': {
        post: {
          summary: 'Générer un document Word (DOCX)',
          description: 'Génère un document Word (DOCX) à partir d\'un template et de variables',
          tags: ['Documents'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['templateId', 'variables'],
                  properties: {
                    templateId: { type: 'string', format: 'uuid' },
                    variables: { type: 'object' },
                    filename: { type: 'string', default: 'document.docx' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'DOCX généré',
              content: {
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/sessions/active': {
        get: {
          summary: 'Liste des sessions actives',
          description: 'Récupère la liste des sessions actives',
          tags: ['Sessions'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
              description: 'Nombre de sessions à retourner',
            },
          ],
          responses: {
            '200': {
              description: 'Liste des sessions actives',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sessions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            status: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/sessions/revoke': {
        post: {
          summary: 'Révoquer une session',
          description: 'Révoque une session spécifique ou toutes les sessions',
          tags: ['Sessions'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    session_id: { type: 'string', format: 'uuid' },
                    revoke_all: { type: 'boolean', default: false },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Session(s) révoquée(s)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/geolocation/reverse-geocode': {
        get: {
          summary: 'Géocodage inverse',
          description: 'Convertit des coordonnées GPS (latitude, longitude) en adresse',
          tags: ['Geolocation'],
          parameters: [
            {
              name: 'latitude',
              in: 'query',
              required: true,
              schema: { type: 'number' },
              description: 'Latitude',
            },
            {
              name: 'longitude',
              in: 'query',
              required: true,
              schema: { type: 'number' },
              description: 'Longitude',
            },
          ],
          responses: {
            '200': {
              description: 'Adresse trouvée',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      address: { type: 'string' },
                      details: { type: 'object' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/sirene/search': {
        get: {
          summary: 'Recherche d\'entreprise via SIRENE',
          description: 'Recherche des informations d\'entreprise via l\'API SIRENE (INSEE)',
          tags: ['Sirene'],
          parameters: [
            {
              name: 'siret',
              in: 'query',
              schema: { type: 'string', pattern: '^[0-9]{14}$' },
              description: 'Numéro SIRET (14 chiffres)',
            },
            {
              name: 'siren',
              in: 'query',
              schema: { type: 'string', pattern: '^[0-9]{9}$' },
              description: 'Numéro SIREN (9 chiffres)',
            },
            {
              name: 'name',
              in: 'query',
              schema: { type: 'string' },
              description: 'Nom de l\'entreprise',
            },
          ],
          responses: {
            '200': {
              description: 'Informations de l\'entreprise',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'object' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '404': { $ref: '#/components/responses/NotFound' },
            '500': {
              description: 'Erreur serveur ou configuration manquante',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/2fa/generate-secret': {
        post: {
          summary: 'Générer un secret 2FA',
          description: 'Génère un secret TOTP et un QR code pour activer l\'authentification à deux facteurs',
          tags: ['2FA'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Secret et QR code générés',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      secret: { type: 'string' },
                      qrCodeUrl: { type: 'string', format: 'uri' },
                      backupCodes: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/2fa/verify': {
        post: {
          summary: 'Vérifier un code 2FA',
          description: 'Vérifie un code TOTP lors de la connexion avec 2FA',
          tags: ['2FA'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string', description: 'Code TOTP à 6 chiffres' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Code vérifié',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      isBackupCode: { type: 'boolean' },
                      sessionToken: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/2fa/verify-activation': {
        post: {
          summary: 'Vérifier l\'activation 2FA',
          description: 'Vérifie un code TOTP lors de l\'activation de l\'authentification à deux facteurs',
          tags: ['2FA'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string', description: 'Code TOTP à 6 chiffres' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '2FA activée avec succès',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/2fa/verify-login': {
        post: {
          summary: 'Vérifier code 2FA lors de la connexion',
          description: 'Vérifie un code TOTP lors de la connexion (sans authentification préalable) et définit le token de session 2FA',
          tags: ['2FA'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId', 'code'],
                  properties: {
                    userId: { type: 'string', format: 'uuid', description: 'ID de l\'utilisateur' },
                    code: { type: 'string', description: 'Code TOTP à 6 chiffres ou code de récupération à 8 caractères hex' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Code vérifié, session 2FA créée',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      isBackupCode: { type: 'boolean' },
                      sessionToken: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/2fa/disable': {
        post: {
          summary: 'Désactiver la 2FA',
          description: 'Désactive l\'authentification à deux facteurs pour un utilisateur',
          tags: ['2FA'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    password: { type: 'string', description: 'Mot de passe pour confirmer la désactivation' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '2FA désactivée avec succès',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/2fa/regenerate-backup-codes': {
        post: {
          summary: 'Régénérer les codes de récupération 2FA',
          description: 'Régénère les codes de récupération pour l\'authentification à deux facteurs',
          tags: ['2FA'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Codes de récupération régénérés',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      backupCodes: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimit' },
          },
        },
      },
      '/api/cron/notification-reminders': {
        get: {
          summary: 'CRON - Rappels de notifications',
          description: 'Tâche CRON pour envoyer les rappels de notifications (à exécuter quotidiennement)',
          tags: ['Cron'],
          security: [
            {
              BearerAuth: [],
            },
          ],
          parameters: [
            {
              name: 'Authorization',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              description: 'Bearer token avec CRON_SECRET',
            },
          ],
          responses: {
            '200': {
              description: 'Rappels envoyés',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            organizationId: { type: 'string', format: 'uuid' },
                            scheduled: { type: 'integer' },
                            errors: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/cron/send-scheduled-documents': {
        get: {
          summary: 'CRON - Envoi des documents planifiés',
          description: 'Tâche CRON pour envoyer les documents planifiés (à exécuter toutes les 5-15 minutes)',
          tags: ['Cron'],
          security: [
            {
              BearerAuth: [],
            },
          ],
          parameters: [
            {
              name: 'Authorization',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              description: 'Bearer token avec CRON_SECRET',
            },
          ],
          responses: {
            '200': {
              description: 'Documents envoyés',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      sent: { type: 'integer' },
                      failed: { type: 'integer' },
                      errors: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/webhooks/stripe': {
        post: {
          summary: 'Webhook Stripe',
          description: 'Webhook pour gérer automatiquement les événements Stripe (souscriptions, paiements)',
          tags: ['Webhooks'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Événement Stripe (customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed)',
                },
              },
            },
          },
          parameters: [
            {
              name: 'stripe-signature',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              description: 'Signature Stripe pour vérifier l\'authenticité du webhook',
            },
          ],
          responses: {
            '200': {
              description: 'Webhook traité',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      received: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/api/electronic-attendance/sign': {
        post: {
          summary: 'Signer une demande d\'émargement électronique',
          description: 'Signe une demande d\'émargement électronique (endpoint public)',
          tags: ['Electronic Attendance'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'signatureData'],
                  properties: {
                    token: { type: 'string', description: 'Token de la demande d\'émargement' },
                    signatureData: { type: 'object', description: 'Données de signature' },
                    location: {
                      type: 'object',
                      properties: {
                        latitude: { type: 'number' },
                        longitude: { type: 'number' },
                        address: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Signature réussie',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/electronic-attendance/public/{token}': {
        get: {
          summary: 'Récupérer une demande d\'émargement par token',
          description: 'Récupère une demande d\'émargement par son token (endpoint public)',
          tags: ['Electronic Attendance'],
          parameters: [
            {
              name: 'token',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Token de la demande d\'émargement',
            },
          ],
          responses: {
            '200': {
              description: 'Demande d\'émargement',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      token: { type: 'string' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/electronic-attendance/sessions/{id}': {
        get: {
          summary: 'Récupérer une session d\'émargement',
          description: 'Récupère une session d\'émargement par son ID',
          tags: ['Electronic Attendance'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID de la session d\'émargement',
            },
          ],
          responses: {
            '200': {
              description: 'Session d\'émargement',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        patch: {
          summary: 'Mettre à jour une session d\'émargement',
          description: 'Met à jour une session d\'émargement (lancer, fermer, etc.)',
          tags: ['Electronic Attendance'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID de la session d\'émargement',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: { type: 'string', enum: ['start', 'close', 'cancel'] },
                    sendEmails: { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Session mise à jour',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/electronic-attendance/requests/{id}': {
        patch: {
          summary: 'Mettre à jour une demande d\'émargement',
          description: 'Met à jour une demande d\'émargement (rappel, etc.)',
          tags: ['Electronic Attendance'],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID de la demande d\'émargement',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: { type: 'string', enum: ['remind'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Demande mise à jour',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/compliance/reports/generate': {
        post: {
          summary: 'Générer un rapport de conformité',
          description: 'Génère un rapport de conformité pour une organisation',
          tags: ['Compliance'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    report_type: { type: 'string', enum: ['annual', 'monthly', 'quarterly'], default: 'annual' },
                    format: { type: 'string', enum: ['pdf', 'json'], default: 'pdf' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Rapport généré',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      report: { type: 'object' },
                      download_url: { type: 'string', format: 'uri' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/compliance/alerts/check': {
        post: {
          summary: 'Vérifier les alertes de conformité',
          description: 'Exécute toutes les vérifications d\'alertes de conformité',
          tags: ['Compliance'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Vérifications terminées',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      timestamp: { type: 'string', format: 'date-time' },
                      results: { type: 'object' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/compliance/alerts/critical-risks': {
        get: {
          summary: 'Vérifier les risques critiques',
          description: 'Vérifie les risques critiques et envoie des alertes',
          tags: ['Compliance'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Risques critiques vérifiés',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      risks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                            description: { type: 'string' },
                          },
                        },
                      },
                      alerts_sent: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/compliance/sync-controls': {
        post: {
          summary: 'Synchroniser les contrôles de conformité',
          description: 'Synchronise les contrôles de conformité avec les systèmes existants (2FA, SSO, etc.)',
          tags: ['Compliance'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Contrôles synchronisés',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      timestamp: { type: 'string', format: 'date-time' },
                      results: { type: 'object' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/cpf/catalog-sync': {
        post: {
          summary: 'Synchroniser le catalogue CPF',
          description: 'Synchronise le catalogue CPF depuis un fichier XML',
          tags: ['CPF'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['xml_data'],
                  properties: {
                    xml_data: { type: 'string', description: 'Contenu XML du catalogue CPF' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Catalogue synchronisé',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      synced: { type: 'integer' },
                      errors: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '500': {
              description: 'Erreur serveur',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    },
  }

  return NextResponse.json(openAPISpec)
}
