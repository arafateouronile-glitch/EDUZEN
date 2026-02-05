'use client'

/**
 * Page Ajout d'une preuve manuelle Qualiopi
 * Formulaire : critère → indicateur, titre, description, type, fichier optionnel.
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { qualiopiService } from '@/lib/services/qualiopi.service'
import { QUALIOPI_REFERENTIAL } from '@/lib/services/auditor-portal.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select'
import { ArrowLeft, Save, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/utils/logger'

const EVIDENCE_TYPES = [
  { value: 'document', label: 'Document' },
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Vidéo' },
  { value: 'report', label: 'Rapport' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'data', label: 'Données' },
  { value: 'testimony', label: 'Témoignage' },
  { value: 'other', label: 'Autre' },
] as const

// Code indicateur (ex: "1.1" ou "1") → numéro référentiel 1-32
function indicatorCodeToReferentialNumber(code: string): number | null {
  const parts = code.split('.')
  const c = parseInt(parts[0], 10)
  const i = parts[1] != null ? parseInt(parts[1], 10) : NaN
  // Format "1.1", "1.2", "2.1" : critère.indicateur
  if (!Number.isNaN(c) && !Number.isNaN(i)) {
    const criterion = QUALIOPI_REFERENTIAL.find((cr) => cr.number === c)
    if (!criterion) return null
    const ind = criterion.indicators[i - 1]
    return ind?.number ?? null
  }
  // Format "1", "2", ... "32" : numéro référentiel direct
  if (parts.length === 1 && !Number.isNaN(c) && c >= 1 && c <= 32) {
    return c
  }
  return null
}

export default function QualiopiEvidenceAddPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const criterionFromUrl = searchParams.get('criterion')
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [selectedCriterion, setSelectedCriterion] = useState<string>('')
  const [indicatorId, setIndicatorId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceType, setEvidenceType] = useState<QualiopiEvidenceType>('document')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  type QualiopiEvidenceType = 'document' | 'photo' | 'video' | 'testimony' | 'data' | 'report' | 'certificate' | 'other'

  // Initialiser le critère depuis l'URL si présent
  useEffect(() => {
    if (criterionFromUrl && /^[1-7]$/.test(criterionFromUrl)) {
      setSelectedCriterion(criterionFromUrl)
    }
  }, [criterionFromUrl])

  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ['qualiopi-indicators-add', user?.organization_id],
    queryFn: () => qualiopiService.getIndicators(user!.organization_id!),
    enabled: !!user?.organization_id,
  })

  const criterionOptions = useMemo(
    () =>
      QUALIOPI_REFERENTIAL.map((c) => ({
        value: String(c.number),
        label: `Critère ${c.number} – ${c.name}`,
      })),
    []
  )

  const indicatorsForSelectedCriterion = useMemo(() => {
    if (!selectedCriterion) return []
    const cNum = parseInt(selectedCriterion, 10)
    const criterion = QUALIOPI_REFERENTIAL.find((c) => c.number === cNum)
    if (!criterion) return []
    const refNumbers = new Set(criterion.indicators.map((i) => i.number))
    return indicators.filter((ind) => {
      const refNum = indicatorCodeToReferentialNumber(ind.indicator_code)
      return refNum != null && refNumbers.has(refNum)
    })
  }, [selectedCriterion, indicators])

  const indicatorOptions = useMemo(
    () =>
      indicatorsForSelectedCriterion.map((ind) => ({
        value: ind.id,
        label: `Ind. ${ind.indicator_code} – ${ind.indicator_name}`,
      })),
    [indicatorsForSelectedCriterion]
  )

  const handleCriterionChange = (value: string) => {
    setSelectedCriterion(value)
    setIndicatorId('')
  }

  const addEvidenceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      if (!indicatorId) throw new Error('Veuillez sélectionner un indicateur')
      if (!title.trim()) throw new Error('Le titre est obligatoire')

      let file_url: string | undefined
      let file_type: string | undefined
      let file_size: number | undefined

      if (file) {
        const ext = file.name.split('.').pop() || 'bin'
        const fileName = `qualiopi-evidence/${user.organization_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          logger.error('Qualiopi evidence upload error', uploadError)
          throw new Error(`Erreur d'upload : ${uploadError.message}`)
        }
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
        file_url = urlData.publicUrl
        file_type = file.type || ext
        file_size = file.size
      }

      return qualiopiService.addEvidence({
        organization_id: user.organization_id,
        indicator_id: indicatorId,
        evidence_type: evidenceType,
        title: title.trim(),
        description: description.trim() || undefined,
        file_url,
        file_type,
        file_size,
        uploaded_by: user.id,
        is_valid: true,
        status: 'pending',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-evidence-manual'] })
      queryClient.invalidateQueries({ queryKey: ['compliance-evidence-list'] })
      queryClient.invalidateQueries({ queryKey: ['qualiopi-dashboard-premium'] })
      addToast({
        title: 'Preuve enregistrée',
        description: 'La preuve manuelle a été ajoutée au coffre.',
        type: 'success',
      })
      router.push('/dashboard/qualiopi/evidence')
    },
    onError: (err: Error) => {
      setError(err.message)
      addToast({
        title: 'Erreur',
        description: err.message,
        type: 'error',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    addEvidenceMutation.mutate()
  }

  if (!user?.organization_id) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/qualiopi/evidence">
          <Button variant="ghost" size="sm" className="mb-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour au coffre des preuves
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-[#274472]" />
          Ajouter une preuve manuelle
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choisissez le critère et l’indicateur concernés, puis renseignez la preuve. Vous pouvez joindre un document (optionnel).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulaire</CardTitle>
          <CardDescription>
            Choisissez le critère puis l’indicateur Qualiopi concerné, puis le titre, le type et éventuellement un fichier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                {error}
              </div>
            )}

            {/* Liste déroulante Critère puis Indicateur */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-4">
              <p className="text-sm font-medium text-slate-700">Critère et indicateur Qualiopi</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="criterion">Critère *</Label>
                  <SelectField
                    id="criterion"
                    value={selectedCriterion}
                    onChange={(e) => handleCriterionChange(e.target.value)}
                    options={criterionOptions}
                    placeholder="Choisir un critère (1 à 7)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="indicator">Indicateur *</Label>
                  <SelectField
                    id="indicator"
                    value={indicatorId}
                    onChange={(e) => setIndicatorId(e.target.value)}
                    options={indicatorOptions}
                    placeholder={
                      !selectedCriterion
                        ? 'Sélectionnez d\'abord un critère'
                        : loadingIndicators
                        ? 'Chargement…'
                        : indicatorOptions.length === 0
                        ? 'Aucun indicateur pour ce critère'
                        : 'Choisir un indicateur'
                    }
                    disabled={!selectedCriterion || loadingIndicators || indicatorOptions.length === 0}
                  />
                </div>
              </div>
              {selectedCriterion && (
                <p className="text-xs text-muted-foreground">
                  {indicatorsForSelectedCriterion.length} indicateur(s) pour le critère {selectedCriterion}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. : Règlement intérieur 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Précisions sur la preuve..."
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence_type">Type de preuve</Label>
              <SelectField
                id="evidence_type"
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value as QualiopiEvidenceType)}
                options={EVIDENCE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Fichier (optionnel)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
                {file && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {file.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PDF, Word, Excel, images. Taille max recommandée : 10 Mo.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="bg-[#274472] hover:bg-[#1a2f4a]"
                disabled={addEvidenceMutation.isPending || !indicatorId || !title.trim()}
              >
                {addEvidenceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer la preuve
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/qualiopi/evidence">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
