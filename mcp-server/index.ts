#!/usr/bin/env node
/**
 * EDUZEN MCP Server
 * Permet aux agents IA de créer et publier des articles sur le blog EDUZEN.
 *
 * Transport: stdio (compatible Claude Desktop, Cursor, Cline, n8n, etc.)
 *
 * Config requise (variables d'environnement ou .env) :
 *   EDUZEN_API_URL     — ex: https://votre-site.com
 *   EDUZEN_MCP_SECRET  — même valeur que MCP_API_SECRET dans .env.local
 */

import 'dotenv/config'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

// ─── Configuration ────────────────────────────────────────────────────────────

const API_URL = process.env.EDUZEN_API_URL?.replace(/\/$/, '')
const API_SECRET = process.env.EDUZEN_MCP_SECRET

if (!API_URL || !API_SECRET) {
  console.error(
    'Erreur: EDUZEN_API_URL et EDUZEN_MCP_SECRET sont requis.\n' +
    'Créez un fichier .env dans mcp-server/ avec ces valeurs.'
  )
  process.exit(1)
}

// ─── HTTP Helper ───────────────────────────────────────────────────────────────

async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json() as unknown

  if (!res.ok) {
    const errorData = data as Record<string, unknown>
    throw new Error(
      typeof errorData?.error === 'string'
        ? errorData.error
        : `Erreur HTTP ${res.status}`
    )
  }

  return data
}

// ─── Outils MCP ───────────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: 'list_blog_posts',
    description:
      'Liste les articles du blog EDUZEN. Filtre par statut, catégorie ou recherche textuelle.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'pending_review', 'scheduled', 'published', 'archived'],
          description: 'Filtrer par statut',
        },
        category_id: { type: 'string', description: 'UUID de la catégorie' },
        search: { type: 'string', description: 'Recherche dans le titre et l\'extrait' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 20)' },
        offset: { type: 'number', description: 'Décalage pour la pagination (défaut: 0)' },
      },
    },
  },
  {
    name: 'get_blog_post',
    description: 'Récupère le détail complet d\'un article par son ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'UUID de l\'article' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_blog_post',
    description:
      'Crée un nouvel article de blog. Par défaut en brouillon (draft). ' +
      'Mettre status="published" pour publier directement.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Titre de l\'article' },
        content: {
          type: 'string',
          description: 'Contenu HTML complet de l\'article',
        },
        excerpt: { type: 'string', description: 'Résumé court (1-2 phrases)' },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'pending_review', 'scheduled'],
          description: 'Statut de publication (défaut: draft)',
        },
        category_id: { type: 'string', description: 'UUID de la catégorie' },
        tag_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste d\'UUIDs de tags',
        },
        featured_image_url: { type: 'string', description: 'URL de l\'image à la une' },
        meta_title: { type: 'string', description: 'Titre SEO (meta title)' },
        meta_description: {
          type: 'string',
          description: 'Description SEO (meta description, 150-160 caractères)',
        },
        is_featured: {
          type: 'boolean',
          description: 'Mettre en avant sur la page blog',
        },
        allow_comments: {
          type: 'boolean',
          description: 'Autoriser les commentaires (défaut: true)',
        },
        scheduled_for: {
          type: 'string',
          description: 'Date de publication programmée (ISO 8601)',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'update_blog_post',
    description: 'Met à jour un article existant. Seuls les champs fournis sont modifiés.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'UUID de l\'article à modifier' },
        title: { type: 'string' },
        content: { type: 'string', description: 'Contenu HTML' },
        excerpt: { type: 'string' },
        status: {
          type: 'string',
          enum: ['draft', 'pending_review', 'scheduled', 'published', 'archived'],
        },
        category_id: { type: 'string' },
        tag_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Remplace tous les tags existants',
        },
        featured_image_url: { type: 'string' },
        meta_title: { type: 'string' },
        meta_description: { type: 'string' },
        is_featured: { type: 'boolean' },
        allow_comments: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'publish_blog_post',
    description: 'Publie immédiatement un article (passe son statut à "published").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'UUID de l\'article à publier' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_blog_post',
    description: 'Supprime définitivement un article.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'UUID de l\'article à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_categories',
    description: 'Liste toutes les catégories du blog.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'list_tags',
    description: 'Liste tous les tags disponibles.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'create_tag',
    description: 'Crée un nouveau tag.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Nom du tag' },
        color: {
          type: 'string',
          description: 'Couleur hex (ex: #6366f1). Défaut: violet.',
        },
      },
      required: ['name'],
    },
  },
]

// ─── Serveur MCP ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'eduzen-blog', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

// Lister les outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

// Schémas de validation
const IdSchema = z.object({ id: z.string().uuid() })
const ListSchema = z.object({
  status: z.string().optional(),
  category_id: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

// Exécuter un outil
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    let result: unknown

    switch (name) {
      case 'list_blog_posts': {
        const params = ListSchema.parse(args ?? {})
        const qs = new URLSearchParams()
        if (params.status) qs.set('status', params.status)
        if (params.category_id) qs.set('category_id', params.category_id)
        if (params.search) qs.set('search', params.search)
        if (params.limit) qs.set('limit', String(params.limit))
        if (params.offset) qs.set('offset', String(params.offset))
        result = await apiRequest('GET', `/api/mcp/blog?${qs}`)
        break
      }

      case 'get_blog_post': {
        const { id } = IdSchema.parse(args)
        result = await apiRequest('GET', `/api/mcp/blog/${id}`)
        break
      }

      case 'create_blog_post': {
        const body = z.object({
          title: z.string(),
          content: z.string(),
          excerpt: z.string().optional(),
          status: z.string().optional(),
          category_id: z.string().optional(),
          tag_ids: z.array(z.string()).optional(),
          featured_image_url: z.string().optional(),
          meta_title: z.string().optional(),
          meta_description: z.string().optional(),
          is_featured: z.boolean().optional(),
          allow_comments: z.boolean().optional(),
          scheduled_for: z.string().optional(),
        }).parse(args)
        result = await apiRequest('POST', '/api/mcp/blog', body)
        break
      }

      case 'update_blog_post': {
        const { id, ...body } = z.object({
          id: z.string().uuid(),
          title: z.string().optional(),
          content: z.string().optional(),
          excerpt: z.string().optional(),
          status: z.string().optional(),
          category_id: z.string().optional(),
          tag_ids: z.array(z.string()).optional(),
          featured_image_url: z.string().optional(),
          meta_title: z.string().optional(),
          meta_description: z.string().optional(),
          is_featured: z.boolean().optional(),
          allow_comments: z.boolean().optional(),
        }).parse(args)
        result = await apiRequest('PATCH', `/api/mcp/blog/${id}`, body)
        break
      }

      case 'publish_blog_post': {
        const { id } = IdSchema.parse(args)
        result = await apiRequest('PATCH', `/api/mcp/blog/${id}`, { status: 'published' })
        break
      }

      case 'delete_blog_post': {
        const { id } = IdSchema.parse(args)
        result = await apiRequest('DELETE', `/api/mcp/blog/${id}`)
        break
      }

      case 'list_categories': {
        result = await apiRequest('GET', '/api/mcp/categories')
        break
      }

      case 'list_tags': {
        result = await apiRequest('GET', '/api/mcp/tags')
        break
      }

      case 'create_tag': {
        const body = z.object({
          name: z.string(),
          color: z.string().optional(),
        }).parse(args)
        result = await apiRequest('POST', '/api/mcp/tags', body)
        break
      }

      default:
        return {
          content: [{ type: 'text' as const, text: `Outil inconnu: ${name}` }],
          isError: true,
        }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return {
      content: [{ type: 'text' as const, text: `Erreur: ${message}` }],
      isError: true,
    }
  }
})

// ─── Démarrage ────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
