'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { organizationSetupService } from '@/lib/services/organization-setup.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import {
  Building2,
  Award,
  Palette,
  PenTool,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Search,
  Upload,
  CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

type WizardStep = 1 | 2 | 3 | 4

interface OrganizationData {
  name: string
  siret?: string
  address?: string
  postalCode?: string
  city?: string
}

interface QualiopiData {
  domains: string[]
}

interface BrandingData {
  logoUrl?: string
  primaryColor: string
}

interface SignatureData {
  enabled: boolean
}

export function OrganizationSetupWizard() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [isLoading, setIsLoading] = useState(false)

  // Données du formulaire
  const [orgData, setOrgData] = useState<OrganizationData>({
    name: '',
    siret: '',
    address: '',
    postalCode: '',
    city: '',
  })
  const [qualiopiData, setQualiopiData] = useState<QualiopiData>({
    domains: [],
  })
  const [brandingData, setBrandingData] = useState<BrandingData>({
    primaryColor: '#274472', // Bleu EDUZEN par défaut
  })
  const [signatureData, setSignatureData] = useState<SignatureData>({
    enabled: true,
  })

  const [searchingSirene, setSearchingSirene] = useState(false)

  // Recherche SIRENE
  const handleSearchSirene = async () => {
    if (!orgData.siret || orgData.siret.length !== 14) {
      addToast({
        title: 'SIRET invalide',
        description: 'Le SIRET doit contenir 14 chiffres',
        type: 'error',
      })
      return
    }

    setSearchingSirene(true)
    try {
      const response = await fetch(`/api/sirene/search?siret=${orgData.siret}`)
      const data = await response.json()

      if (response.ok) {
        setOrgData({
          name: data.name || orgData.name,
          siret: data.siret || orgData.siret,
          address: data.address || orgData.address,
          postalCode: data.postalCode || orgData.postalCode,
          city: data.city || orgData.city,
        })
        addToast({
          title: 'Informations récupérées',
          description: 'Les données de l\'entreprise ont été chargées automatiquement',
          type: 'success',
        })
      } else {
        addToast({
          title: 'Recherche échouée',
          description: data.error || 'Impossible de récupérer les informations',
          type: 'error',
        })
      }
    } catch (error) {
      logger.error('Erreur recherche SIRENE', error)
      addToast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la recherche',
        type: 'error',
      })
    } finally {
      setSearchingSirene(false)
    }
  }

  // Upload du logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.organization_id) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${user.organization_id}-${Date.now()}.${fileExt}`
      const filePath = `organizations/${user.organization_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      setBrandingData({ ...brandingData, logoUrl: publicUrl })
    } catch (error) {
      logger.error('Erreur upload logo', error)
      addToast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le logo',
        type: 'error',
      })
    }
  }

  // Finalisation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !user?.id) {
        throw new Error('Utilisateur ou organisation non trouvés')
      }

      setIsLoading(true)

      // Mettre à jour l'organisation avec les données
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          settings: {
            siret: orgData.siret,
            address: orgData.address,
            postalCode: orgData.postalCode,
            city: orgData.city,
            primaryColor: brandingData.primaryColor,
            logoUrl: brandingData.logoUrl,
            signatureEnabled: signatureData.enabled,
          },
        })
        .eq('id', user.organization_id)

      if (updateError) throw updateError

      // Initialiser l'organisation
      await organizationSetupService.initializeNewOrg({
        organizationId: user.organization_id,
        userId: user.id,
        qualiopiDomains: qualiopiData.domains,
        primaryColor: brandingData.primaryColor,
        logoUrl: brandingData.logoUrl,
      })

      // Marquer l'onboarding comme terminé
      await supabase
        .from('organizations')
        .update({
          settings: {
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          },
        })
        .eq('id', user.organization_id)
    },
    onSuccess: () => {
      addToast({
        title: 'Configuration terminée !',
        description: 'Choisissez maintenant votre plan d\'abonnement',
        type: 'success',
      })
      router.push('/dashboard/subscribe')
    },
    onError: (error) => {
      logger.error('Erreur finalisation onboarding', error)
      addToast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la configuration',
        type: 'error',
      })
      setIsLoading(false)
    },
  })

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as WizardStep)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep)
    }
  }

  const handleFinish = () => {
    finalizeMutation.mutate()
  }

  const steps = [
    { number: 1, title: 'Identité', icon: Building2 },
    { number: 2, title: 'Qualiopi', icon: Award },
    { number: 3, title: 'Charte Graphique', icon: Palette },
    { number: 4, title: 'Signature', icon: PenTool },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                        isActive
                          ? 'bg-brand-blue text-white scale-110'
                          : isCompleted
                          ? 'bg-brand-cyan text-white'
                          : 'bg-gray-200 text-gray-500'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-2 text-sm font-medium',
                        isActive ? 'text-brand-blue' : 'text-gray-500'
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'h-1 flex-1 mx-2 transition-all',
                        isCompleted ? 'bg-brand-cyan' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">
              Configuration de votre organisme
            </CardTitle>
            <CardDescription>
              Étape {currentStep} sur {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step 1: Identité */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="siret">SIRET (14 chiffres)</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="siret"
                          value={orgData.siret}
                          onChange={(e) =>
                            setOrgData({ ...orgData, siret: e.target.value })
                          }
                          placeholder="12345678901234"
                          maxLength={14}
                        />
                        <Button
                          type="button"
                          onClick={handleSearchSirene}
                          disabled={searchingSirene || !orgData.siret}
                        >
                          {searchingSirene ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Recherchez automatiquement les informations de votre entreprise
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="name">Nom de l'organisme *</Label>
                      <Input
                        id="name"
                        value={orgData.name}
                        onChange={(e) =>
                          setOrgData({ ...orgData, name: e.target.value })
                        }
                        placeholder="Mon Organisme de Formation"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        value={orgData.address}
                        onChange={(e) =>
                          setOrgData({ ...orgData, address: e.target.value })
                        }
                        placeholder="123 Rue de la Formation"
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postalCode">Code postal</Label>
                        <Input
                          id="postalCode"
                          value={orgData.postalCode}
                          onChange={(e) =>
                            setOrgData({ ...orgData, postalCode: e.target.value })
                          }
                          placeholder="75001"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">Ville</Label>
                        <Input
                          id="city"
                          value={orgData.city}
                          onChange={(e) =>
                            setOrgData({ ...orgData, city: e.target.value })
                          }
                          placeholder="Paris"
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Qualiopi */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <p className="text-gray-600">
                      Quels sont vos domaines d'actions ? Cela pré-configurera les indicateurs
                      Qualiopi de votre dashboard.
                    </p>

                    <div className="space-y-4">
                      {[
                        {
                          id: 'actions_formation',
                          label: 'Actions de formation',
                          description: 'Formations professionnelles continues',
                        },
                        {
                          id: 'vae',
                          label: 'VAE (Validation des Acquis de l\'Expérience)',
                          description: 'Accompagnement à la validation',
                        },
                        {
                          id: 'apprentissage',
                          label: 'Apprentissage',
                          description: 'Formation en alternance',
                        },
                        {
                          id: 'bilan_competences',
                          label: 'Bilan de compétences',
                          description: 'Évaluation des compétences',
                        },
                        {
                          id: 'actions_formation_apprentissage',
                          label: 'Actions de formation par apprentissage',
                          description: 'Formations en apprentissage',
                        },
                      ].map((domain) => (
                        <div
                          key={domain.id}
                          className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            id={domain.id}
                            checked={qualiopiData.domains.includes(domain.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setQualiopiData({
                                  ...qualiopiData,
                                  domains: [...qualiopiData.domains, domain.id],
                                })
                              } else {
                                setQualiopiData({
                                  ...qualiopiData,
                                  domains: qualiopiData.domains.filter((d) => d !== domain.id),
                                })
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={domain.id}
                              className="font-medium cursor-pointer"
                            >
                              {domain.label}
                            </Label>
                            <p className="text-sm text-gray-500">{domain.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Charte Graphique */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <Label>Logo de l'organisme</Label>
                      <div className="mt-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label htmlFor="logo-upload">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-blue transition-colors">
                            {brandingData.logoUrl ? (
                              <img
                                src={brandingData.logoUrl}
                                alt="Logo"
                                className="max-h-32 mx-auto"
                              />
                            ) : (
                              <>
                                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-600">
                                  Cliquez pour uploader votre logo
                                </p>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="primaryColor">Couleur primaire</Label>
                      <div className="flex gap-4 mt-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={brandingData.primaryColor}
                          onChange={(e) =>
                            setBrandingData({
                              ...brandingData,
                              primaryColor: e.target.value,
                            })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={brandingData.primaryColor}
                          onChange={(e) =>
                            setBrandingData({
                              ...brandingData,
                              primaryColor: e.target.value,
                            })
                          }
                          placeholder="#274472"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        La couleur par défaut est le Bleu EDUZEN (#274472)
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Signature */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <p className="text-gray-600">
                      Activez la signature électronique pour vos documents. Vous pourrez
                      toujours l'activer plus tard dans les paramètres.
                    </p>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="signature-enabled"
                        checked={signatureData.enabled}
                        onCheckedChange={(checked) =>
                          setSignatureData({ enabled: checked === true })
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor="signature-enabled" className="font-medium cursor-pointer">
                          Activer la signature électronique
                        </Label>
                        <p className="text-sm text-gray-500">
                          Permet de signer les documents directement depuis l'interface
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !orgData.name) ||
                    isLoading
                  }
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={isLoading || finalizeMutation.isPending}
                >
                  {isLoading || finalizeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Configuration en cours...
                    </>
                  ) : (
                    <>
                      Terminer
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
