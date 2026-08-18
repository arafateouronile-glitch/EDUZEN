'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import type { DocumentType, DocumentTemplate, SignZoneTemplate } from '@/lib/types/document-templates'
import type { SignZone } from '@/lib/types/sign-zones'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2, MousePointer2, RefreshCw, FileWarning } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { getDocumentTypeConfig } from '../edit/utils/document-type-config'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { BRAND_COLORS } from '@/lib/config/app-config'
import { getSampleDocumentVariables } from '@/lib/utils/document-generation/sample-variables'
import dynamic from 'next/dynamic'

const SignZonePicker = dynamic(() => import('@/components/sign/SignZonePicker').then(mod => ({ default: mod.SignZonePicker })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[420px]"><Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND_COLORS.secondary }} /></div>
})

function toSignZones(raw: SignZoneTemplate[] | unknown): SignZone[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((z): z is SignZoneTemplate => z != null && typeof z === 'object' && typeof (z as { id?: unknown }).id === 'string')
    .map((z) => ({
      id: z.id,
      page: z.page,
      x: z.x,
      y: z.y,
      w: z.w,
      h: z.h,
      label: z.label,
    }))
}

export default function SignZonesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const documentType = (params?.type as DocumentType) ?? 'convention'
  const templateIdParam = searchParams.get('template_id')
  const docConfig = getDocumentTypeConfig(documentType)

  const [zones, setZones] = useState<SignZone[]>([])

  const { data: template, isLoading } = useQuery({
    queryKey: ['document-template', user?.organization_id, documentType, templateIdParam],
    queryFn: async () => {
      if (!user?.organization_id) return null
      if (templateIdParam) {
        const t = await documentTemplateService.getTemplateById(templateIdParam)
        if (t && t.type === documentType) return t as DocumentTemplate & { sign_zones?: SignZoneTemplate[] }
      }
      const def = await documentTemplateService.getDefaultTemplate(user.organization_id, documentType)
      if (def) return def as DocumentTemplate & { sign_zones?: SignZoneTemplate[] }
      const all = await documentTemplateService.getAllTemplates(user.organization_id, { type: documentType })
      return (all[0] ?? null) as (DocumentTemplate & { sign_zones?: SignZoneTemplate[] }) | null
    },
    enabled: !!user?.organization_id,
  })

  const initialZones = toSignZones(template?.sign_zones ?? [])

  useEffect(() => {
    if (!template?.id) return
    const next = toSignZones(template.sign_zones ?? [])
    if (next.length > 0) setZones(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sync zones when template.id or sign_zones change
  }, [template?.id])

  // Aperçu PDF généré automatiquement à partir du contenu actuel du template
  // (données fictives), pour ne plus exiger d'import manuel avant de placer
  // les zones de signature.
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [useCustomUpload, setUseCustomUpload] = useState(false)
  const previewUrlRef = useRef<string | null>(null)

  const generatePreviewPdf = useCallback(async () => {
    if (!template || !user?.organization_id) return
    setIsGeneratingPreview(true)
    setPreviewError(null)
    try {
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          variables: getSampleDocumentVariables(),
          organizationId: user.organization_id,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = url
      setPreviewPdfUrl(url)
    } catch (e) {
      logger.error('SignZones preview generation:', e)
      setPreviewError(e instanceof Error ? e.message : 'Impossible de générer l\'aperçu du document.')
    } finally {
      setIsGeneratingPreview(false)
    }
  }, [template, user?.organization_id])

  useEffect(() => {
    if (template && !useCustomUpload) {
      generatePreviewPdf()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne régénérer qu'au changement de template ou de mode, pas à chaque re-render de generatePreviewPdf
  }, [template?.id, useCustomUpload])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const saveMutation = useMutation({
    mutationFn: async (payload: SignZone[]) => {
      if (!template?.id) throw new Error('Template non trouvé')
      await documentTemplateService.updateTemplate({
        id: template.id,
        sign_zones: payload as SignZoneTemplate[],
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-template', user?.organization_id, documentType, templateIdParam] })
      addToast({ title: 'Zones enregistrées', description: 'Les zones de signature ont été sauvegardées.', type: 'success' })
    },
    onError: (e) => {
      logger.error('SignZones save:', e)
      addToast({
        title: 'Erreur',
        description: (sanitizeError(e)?.message as string) || 'Impossible d\'enregistrer les zones.',
        type: 'error',
      })
    },
  })

  const handleZonesChange = useCallback((next: SignZone[]) => {
    setZones(next)
  }, [])

  const editHref = `/dashboard/settings/document-templates/${documentType}/edit${templateIdParam ? `?template_id=${templateIdParam}` : ''}`

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={editHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <MousePointer2 className="h-6 w-6" style={{ color: BRAND_COLORS.secondary }} />
              Zones de signature
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {docConfig.name} – Définir où la signature doit apparaître sur le PDF
            </p>
          </div>
        </div>
        {template && (
          <Button
            onClick={() => saveMutation.mutate(zones)}
            disabled={saveMutation.isPending || zones.length === 0}
            style={{ 
              backgroundColor: BRAND_COLORS.secondary, 
              color: BRAND_COLORS.textOnPrimary 
            }}
            className="hover:opacity-90 transition-opacity"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        )}
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND_COLORS.secondary }} />
          </CardContent>
        </Card>
      )}

      {!isLoading && !template && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun template pour ce type. Créez-en un depuis l’éditeur.</p>
            <Button asChild className="mt-4">
              <Link href={editHref}>Ouvrir l’éditeur</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && template && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Template : {template.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  L'aperçu ci-dessous est généré automatiquement à partir du contenu actuel du template. Insérez la zone de signature client et la zone signature organisme de formation, puis enregistrez : la signature sera tamponnée exactement là lors du scellement.
                </p>
              </div>
              {!useCustomUpload && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generatePreviewPdf}
                  disabled={isGeneratingPreview}
                  className="shrink-0"
                >
                  {isGeneratingPreview ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Régénérer l'aperçu
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setUseCustomUpload((v) => !v)}
              className="mt-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground w-fit"
            >
              {useCustomUpload ? 'Revenir à l\'aperçu automatique' : 'Utiliser un PDF importé à la place'}
            </button>
          </CardHeader>
          <CardContent className="p-6">
            {previewError && !useCustomUpload && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <FileWarning className="h-5 w-5 shrink-0 text-amber-600" />
                <span className="text-sm text-amber-800">{previewError}</span>
              </div>
            )}
            {isGeneratingPreview && !previewPdfUrl && !useCustomUpload ? (
              <div className="flex items-center justify-center gap-2 py-16">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND_COLORS.secondary }} />
                <span className="text-sm text-muted-foreground">Génération de l'aperçu…</span>
              </div>
            ) : (
              <SignZonePicker
                key={useCustomUpload ? 'upload' : 'auto'}
                file={useCustomUpload ? undefined : previewPdfUrl}
                zones={zones.length ? zones : initialZones}
                onChange={handleZonesChange}
                className="min-h-[420px]"
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
