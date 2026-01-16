import { NextResponse } from 'next/server'

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
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
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
    },
    paths: {
      '/api/v1/students': {
        get: {
          summary: 'Liste des étudiants',
          description: 'Récupère la liste des étudiants de l\'organisation',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Numéro de page',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 100 },
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
    },
  }

  return NextResponse.json(openAPISpec)
}
