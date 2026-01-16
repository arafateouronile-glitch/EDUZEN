'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'

interface StudentNeedFormProps {
  studentId: string
  organizationId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function StudentNeedForm({ studentId, organizationId, onSuccess, onCancel }: StudentNeedFormProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const totalSteps = 5

  // Charger les types de handicap
  const { data: disabilityTypes = [] } = useQuery({
    queryKey: ['disability-types'],
    queryFn: () => accessibilityService.getDisabilityTypes(),
    retry: false,
  })

  // Charger les besoins existants
  const { data: existingNeed } = useQuery({
    queryKey: ['student-need', studentId],
    queryFn: () => accessibilityService.getStudentNeedByStudentId(studentId),
    retry: false,
  })

  // State du formulaire
  const [formData, setFormData] = useState({
    has_disability: existingNeed?.has_disability || false,
    disability_type_ids: existingNeed?.disability_type_ids || [],
    disability_description: existingNeed?.disability_description || '',
    has_mdph_recognition: existingNeed?.has_mdph_recognition || false,
    mdph_number: existingNeed?.mdph_number || '',
    mdph_expiry_date: existingNeed?.mdph_expiry_date || '',
    needs_physical_accommodations: existingNeed?.needs_physical_accommodations || false,
    physical_accommodations_detail: existingNeed?.physical_accommodations_detail || '',
    needs_pedagogical_accommodations: existingNeed?.needs_pedagogical_accommodations || false,
    pedagogical_accommodations_detail: existingNeed?.pedagogical_accommodations_detail || '',
    needs_exam_accommodations: existingNeed?.needs_exam_accommodations || false,
    exam_accommodations_detail: existingNeed?.exam_accommodations_detail || '',
    needs_technical_aids: existingNeed?.needs_technical_aids || false,
    technical_aids_detail: existingNeed?.technical_aids_detail || '',
    external_referent_name: existingNeed?.external_referent_name || '',
    external_referent_contact: existingNeed?.external_referent_contact || '',
    consent_share_info: existingNeed?.consent_share_info || false,
  })

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        organization_id: organizationId,
        student_id: studentId,
        ...formData,
      }

      if (existingNeed) {
        return await accessibilityService.updateStudentNeed(existingNeed.id, data)
      } else {
        return await accessibilityService.createStudentNeed(data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-need'] })
      queryClient.invalidateQueries({ queryKey: ['accessibility-needs'] })
      toast({
        title: 'Déclaration enregistrée',
        description: 'Vos besoins spécifiques ont été enregistrés avec succès.',
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'enregistrer la déclaration.',
        variant: 'destructive',
      })
    },
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleDisabilityType = (typeId: string) => {
    setFormData((prev) => {
      const current = prev.disability_type_ids as string[]
      if (current.includes(typeId)) {
        return { ...prev, disability_type_ids: current.filter((id) => id !== typeId) }
      } else {
        return { ...prev, disability_type_ids: [...current, typeId] }
      }
    })
  }

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i + 1 <= step ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`flex-1 h-1 ${i + 1 < step ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">Déclaration</span>
            <span className="text-xs text-muted-foreground">Types</span>
            <span className="text-xs text-muted-foreground">Besoins</span>
            <span className="text-xs text-muted-foreground">Référent</span>
            <span className="text-xs text-muted-foreground">Consentement</span>
          </div>
        </div>
      </div>

      {/* Step 1: Déclaration initiale */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Déclaration de besoins spécifiques</CardTitle>
            <CardDescription>Indiquez si vous avez des besoins spécifiques liés à un handicap</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_disability"
                checked={formData.has_disability}
                onCheckedChange={(checked) => handleInputChange('has_disability', checked)}
              />
              <label htmlFor="has_disability" className="text-sm font-medium">
                Je déclare une situation de handicap ou des besoins spécifiques
              </label>
            </div>

            {formData.has_disability && (
              <>
                <div>
                  <Label htmlFor="disability_description">Description (optionnel)</Label>
                  <Textarea
                    id="disability_description"
                    placeholder="Décrivez brièvement votre situation si vous le souhaitez..."
                    rows={4}
                    value={formData.disability_description}
                    onChange={(e) => handleInputChange('disability_description', e.target.value)}
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="has_mdph_recognition"
                      checked={formData.has_mdph_recognition}
                      onCheckedChange={(checked) => handleInputChange('has_mdph_recognition', checked)}
                    />
                    <label htmlFor="has_mdph_recognition" className="text-sm font-medium">
                      J'ai une reconnaissance MDPH / RQTH
                    </label>
                  </div>

                  {formData.has_mdph_recognition && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div>
                        <Label htmlFor="mdph_number">Numéro de dossier MDPH</Label>
                        <Input
                          id="mdph_number"
                          value={formData.mdph_number}
                          onChange={(e) => handleInputChange('mdph_number', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mdph_expiry_date">Date d'expiration</Label>
                        <Input
                          id="mdph_expiry_date"
                          type="date"
                          value={formData.mdph_expiry_date}
                          onChange={(e) => handleInputChange('mdph_expiry_date', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Types de handicap */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Types de handicap</CardTitle>
            <CardDescription>
              Sélectionnez le ou les types de handicap qui correspondent à votre situation (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disabilityTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    (formData.disability_type_ids as string[]).includes(type.id)
                      ? 'border-brand-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleDisabilityType(type.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={(formData.disability_type_ids as string[]).includes(type.id)}
                      onCheckedChange={() => toggleDisabilityType(type.id)}
                    />
                    <div>
                      <p className="font-medium">{type.name_fr}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Besoins détaillés */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Besoins spécifiques</CardTitle>
            <CardDescription>Indiquez vos besoins pour faciliter votre parcours de formation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Aménagements physiques */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needs_physical_accommodations"
                  checked={formData.needs_physical_accommodations}
                  onCheckedChange={(checked) => handleInputChange('needs_physical_accommodations', checked)}
                />
                <label htmlFor="needs_physical_accommodations" className="text-sm font-medium">
                  Aménagements physiques (accès, mobilité)
                </label>
              </div>
              {formData.needs_physical_accommodations && (
                <Textarea
                  placeholder="Ex: Besoin d'une salle accessible en fauteuil roulant, place de parking réservée..."
                  rows={3}
                  value={formData.physical_accommodations_detail}
                  onChange={(e) => handleInputChange('physical_accommodations_detail', e.target.value)}
                  className="ml-6"
                />
              )}
            </div>

            {/* Aménagements pédagogiques */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needs_pedagogical_accommodations"
                  checked={formData.needs_pedagogical_accommodations}
                  onCheckedChange={(checked) => handleInputChange('needs_pedagogical_accommodations', checked)}
                />
                <label htmlFor="needs_pedagogical_accommodations" className="text-sm font-medium">
                  Aménagements pédagogiques
                </label>
              </div>
              {formData.needs_pedagogical_accommodations && (
                <Textarea
                  placeholder="Ex: Documents en gros caractères, supports audio, interprète LSF..."
                  rows={3}
                  value={formData.pedagogical_accommodations_detail}
                  onChange={(e) => handleInputChange('pedagogical_accommodations_detail', e.target.value)}
                  className="ml-6"
                />
              )}
            </div>

            {/* Aménagements examens */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needs_exam_accommodations"
                  checked={formData.needs_exam_accommodations}
                  onCheckedChange={(checked) => handleInputChange('needs_exam_accommodations', checked)}
                />
                <label htmlFor="needs_exam_accommodations" className="text-sm font-medium">
                  Aménagements pour les examens
                </label>
              </div>
              {formData.needs_exam_accommodations && (
                <Textarea
                  placeholder="Ex: Temps supplémentaire, salle isolée, assistance humaine..."
                  rows={3}
                  value={formData.exam_accommodations_detail}
                  onChange={(e) => handleInputChange('exam_accommodations_detail', e.target.value)}
                  className="ml-6"
                />
              )}
            </div>

            {/* Aides techniques */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needs_technical_aids"
                  checked={formData.needs_technical_aids}
                  onCheckedChange={(checked) => handleInputChange('needs_technical_aids', checked)}
                />
                <label htmlFor="needs_technical_aids" className="text-sm font-medium">
                  Aides techniques / matériel adapté
                </label>
              </div>
              {formData.needs_technical_aids && (
                <Textarea
                  placeholder="Ex: Logiciel de grossissement, clavier braille, ordinateur adapté..."
                  rows={3}
                  value={formData.technical_aids_detail}
                  onChange={(e) => handleInputChange('technical_aids_detail', e.target.value)}
                  className="ml-6"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Référent externe */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Référent externe</CardTitle>
            <CardDescription>
              Personne à contacter en cas de besoin (médecin, référent MDPH, etc.) - Optionnel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="external_referent_name">Nom du référent</Label>
              <Input
                id="external_referent_name"
                placeholder="Dr. Dupont, Référent MDPH..."
                value={formData.external_referent_name}
                onChange={(e) => handleInputChange('external_referent_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="external_referent_contact">Contact (email ou téléphone)</Label>
              <Input
                id="external_referent_contact"
                placeholder="contact@exemple.fr ou 01 23 45 67 89"
                value={formData.external_referent_contact}
                onChange={(e) => handleInputChange('external_referent_contact', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Consentement */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Consentement</CardTitle>
            <CardDescription>Autorisation de partage des informations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 mb-4">
                Vos informations sont confidentielles et protégées. Le partage avec les formateurs permet de mieux
                adapter votre parcours de formation.
              </p>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent_share_info"
                  checked={formData.consent_share_info}
                  onCheckedChange={(checked) => handleInputChange('consent_share_info', checked)}
                />
                <label htmlFor="consent_share_info" className="text-sm">
                  J'autorise le partage de mes besoins spécifiques avec les formateurs et le personnel pédagogique
                  afin de bénéficier des aménagements nécessaires.
                </label>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Conformément au RGPD, vous disposez d'un droit d'accès, de modification et de suppression de vos données.</p>
              <p className="mt-1">
                Ces informations seront conservées pendant la durée de votre formation et archivées ensuite selon les
                obligations légales.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <div>
          {step > 1 && (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          {step < totalSteps ? (
            <Button type="button" onClick={nextStep}>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer la déclaration'}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
