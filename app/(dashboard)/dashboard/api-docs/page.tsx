'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Code, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function ApiDocsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [openApiSpec, setOpenApiSpec] = useState<any>(null)
  // Utiliser l'URL dynamique au lieu de localhost hardcodé
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  useEffect(() => {
    // Charger le fichier OpenAPI depuis la route API
    fetch('/api/v1/docs')
      .then(res => res.json())
      .then(data => setOpenApiSpec(data))
      .catch(err => logger.error('Failed to load OpenAPI spec:', err))
  }, [])

  const examples = {
    listTemplates: `curl -X GET "${baseUrl}/api/v1/document-templates?type=attestation&page=1&limit=20" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
    getTemplate: `curl -X GET "${baseUrl}/api/v1/document-templates/{id}" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
    createTemplate: `curl -X POST "${baseUrl}/api/v1/document-templates" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Attestation de scolarité",
    "type": "attestation",
    "body": {
      "content": "<p>Bonjour {eleve_nom} {eleve_prenom}</p>"
    },
    "variables": {
      "eleve_nom": "string",
      "eleve_prenom": "string"
    }
  }'`,
    generateDocument: `curl -X POST "${baseUrl}/api/v1/documents/generate" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "uuid-here",
    "variables": {
      "eleve_nom": "Dupont",
      "eleve_prenom": "Jean",
      "date_emission": "2024-01-15"
    },
    "format": "PDF"
  }'`,
  }

  const swaggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Charger Swagger UI dynamiquement
    if (typeof window !== 'undefined' && swaggerRef.current) {
      // Importer le CSS (fichier unique dans swagger-ui-dist)
      // @ts-ignore - CSS import doesn't have type definitions
      import('swagger-ui-dist/swagger-ui.css').catch(() => {})
      
      Promise.all([
        // @ts-ignore - swagger-ui-dist doesn't have type definitions
        import('swagger-ui-dist/swagger-ui-bundle.js'),
        // @ts-ignore - swagger-ui-dist doesn't have type definitions
        import('swagger-ui-dist/swagger-ui-standalone-preset.js'),
      ]).then(([SwaggerUIBundle, SwaggerUIStandalonePreset]) => {
        if (swaggerRef.current) {
          const SwaggerUI = (SwaggerUIBundle as any).default || SwaggerUIBundle
          const StandalonePreset = (SwaggerUIStandalonePreset as any).default || SwaggerUIStandalonePreset
          
          SwaggerUI({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            presets: [
              SwaggerUI.presets.apis,
              StandalonePreset,
            ],
            layout: 'StandaloneLayout',
          })
        }
      }).catch((err) => {
        logger.error('Erreur lors du chargement de Swagger UI:', err)
      })
    }
  }, [])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Documentation API</h1>
        <p className="text-gray-600">
          API REST complète pour la gestion et la génération de documents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Démarrage rapide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Authentification</h3>
              <p className="text-sm text-gray-600 mb-2">
                Utilisez votre token JWT Supabase dans l'en-tête Authorization:
              </p>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                Authorization: Bearer YOUR_JWT_TOKEN
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                {baseUrl}/api/v1
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Endpoints principaux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong>GET</strong> /document-templates
              <p className="text-gray-600">Liste les templates</p>
            </div>
            <div className="text-sm">
              <strong>POST</strong> /document-templates
              <p className="text-gray-600">Crée un template</p>
            </div>
            <div className="text-sm">
              <strong>GET</strong> /document-templates/:id
              <p className="text-gray-600">Récupère un template</p>
            </div>
            <div className="text-sm">
              <strong>PUT</strong> /document-templates/:id
              <p className="text-gray-600">Met à jour un template</p>
            </div>
            <div className="text-sm">
              <strong>DELETE</strong> /document-templates/:id
              <p className="text-gray-600">Supprime un template</p>
            </div>
            <div className="text-sm">
              <strong>POST</strong> /documents/generate
              <p className="text-gray-600">Génère un document</p>
            </div>
          </CardContent>
        </Card>

        {/* Formats */}
        <Card>
          <CardHeader>
            <CardTitle>Formats supportés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                  PDF
                </span>
                <span className="text-sm">Portable Document Format</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                  DOCX
                </span>
                <span className="text-sm">Microsoft Word</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                  ODT
                </span>
                <span className="text-sm">OpenDocument Text</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
                  HTML
                </span>
                <span className="text-sm">HyperText Markup Language</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exemples de code */}
      <Card>
        <CardHeader>
          <CardTitle>Exemples de code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(examples).map(([key, code]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(code, key)}
                >
                  {copied === key ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{code}</code>
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* OpenAPI Specification */}
      <Card>
        <CardHeader>
          <CardTitle>Spécification OpenAPI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              La spécification OpenAPI complète est disponible au format JSON. Vous pouvez l'utiliser avec des outils comme Swagger UI, Postman, ou Insomnia.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open('/api/v1/docs', '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ouvrir spécification OpenAPI
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (openApiSpec) {
                    copyToClipboard(JSON.stringify(openApiSpec, null, 2), 'openapi')
                  }
                }}
              >
                {copied === 'openapi' ? (
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copier la spécification
              </Button>
            </div>
            {openApiSpec && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Aperçu de la spécification :</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  <pre>{JSON.stringify(openApiSpec, null, 2)}</pre>
                </div>
              </div>
            )}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Outils recommandés :</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>
                  <a href="https://editor.swagger.io/" target="_blank" className="text-brand-blue hover:underline">
                    Swagger Editor
                  </a> - Éditeur en ligne pour visualiser et tester l'API
                </li>
                <li>
                  <a href="https://www.postman.com/" target="_blank" className="text-brand-blue hover:underline">
                    Postman
                  </a> - Client API pour tester les endpoints
                </li>
                <li>
                  <a href="https://insomnia.rest/" target="_blank" className="text-brand-blue hover:underline">
                    Insomnia
                  </a> - Alternative à Postman
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}






