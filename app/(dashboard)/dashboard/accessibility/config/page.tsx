'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { accessibilityService } from '@/lib/services/accessibility.service'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import { Settings, Save, ArrowLeft, User, FileText, Link as LinkIcon, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function AccessibilityConfigPage() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const supabase = createClient()

  // State local pour les partenaires personnalisés
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerContact, setNewPartnerContact] = useState('')

  // Query configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['accessibility-config', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await accessibilityService.getConfiguration(user.organization_id)
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Query pour récupérer les utilisateurs de l'organisation
  const { data: users = [] } = useQuery<Array<{ id: string; full_name: string | null; email: string | null }>>({
    queryKey: ['organization-users', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // State du formulaire
  const [formData, setFormData] = useState({
    referent_user_id: config?.referent_user_id || '',
    referent_training_date: config?.referent_training_date || '',
    referent_training_certificate: config?.referent_training_certificate || '',
    accessibility_policy: config?.accessibility_policy || '',
    physical_accessibility_statement: config?.physical_accessibility_statement || '',
    digital_accessibility_statement: config?.digital_accessibility_statement || '',
    partner_agefiph: config?.partner_agefiph || false,
    partner_cap_emploi: config?.partner_cap_emploi || false,
    partner_fiphfp: config?.partner_fiphfp || false,
    partner_other: config?.partner_other || [],
  })

  // Synchroniser le state local avec la config chargée
  useEffect(() => {
    if (config) {
      setFormData({
        referent_user_id: config.referent_user_id || '',
        referent_training_date: config.referent_training_date || '',
        referent_training_certificate: config.referent_training_certificate || '',
        accessibility_policy: config.accessibility_policy || '',
        physical_accessibility_statement: config.physical_accessibility_statement || '',
        digital_accessibility_statement: config.digital_accessibility_statement || '',
        partner_agefiph: config.partner_agefiph || false,
        partner_cap_emploi: config.partner_cap_emploi || false,
        partner_fiphfp: config.partner_fiphfp || false,
        partner_other: config.partner_other || [],
      })
    }
  }, [config])

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID required')
      return await accessibilityService.updateConfiguration(user.organization_id, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-config'] })
      addToast({
        type: 'success',
        title: 'Configuration sauvegardée',
        description: 'La configuration d\'accessibilité a été mise à jour avec succès.',
      })
      router.push('/dashboard/accessibility')
    },
    onError: (error: any) => {
      logger.error('[AccessibilityConfig] Erreur complète:', error)
      logger.error('[AccessibilityConfig] Détails:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || error?.details || 'Impossible de sauvegarder la configuration.',
      })
    },
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddPartner = () => {
    if (!newPartnerName.trim()) return

    const newPartner = {
      name: newPartnerName.trim(),
      contact: newPartnerContact.trim(),
    }

    setFormData((prev) => ({
      ...prev,
      partner_other: [...(prev.partner_other as any[]), newPartner],
    }))

    setNewPartnerName('')
    setNewPartnerContact('')
  }

  const handleRemovePartner = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      partner_other: (prev.partner_other as any[]).filter((_, i) => i !== index),
    }))
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/dashboard/accessibility">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-8 w-8 text-brand-blue" />
          Configuration Accessibilité
        </h1>
        <p className="text-muted-foreground">
          Configurez la politique d'accessibilité de votre organisme de formation
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
        className="space-y-6"
      >
        {/* Référent Handicap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Référent Handicap
            </CardTitle>
            <CardDescription>Désignation obligatoire du référent handicap (critère Qualiopi)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="referent_user_id">Référent handicap *</Label>
              <select
                id="referent_user_id"
                value={formData.referent_user_id || ''}
                onChange={(e) => handleInputChange('referent_user_id', e.target.value)}
                className="w-full px-4 py-3 border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="">Sélectionner un référent...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email || u.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Utilisateur désigné comme référent handicap de l'organisation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="referent_training_date">Date de formation</Label>
                <Input
                  id="referent_training_date"
                  type="date"
                  value={formData.referent_training_date}
                  onChange={(e) => handleInputChange('referent_training_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="referent_training_certificate">Certificat de formation (URL)</Label>
                <Input
                  id="referent_training_certificate"
                  type="url"
                  placeholder="https://..."
                  value={formData.referent_training_certificate}
                  onChange={(e) => handleInputChange('referent_training_certificate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Politiques et Registres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Politiques et Registres
            </CardTitle>
            <CardDescription>Documents requis pour la conformité réglementaire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accessibility_policy">Politique d'accessibilité</Label>
              <Textarea
                id="accessibility_policy"
                placeholder="Décrivez votre politique globale d'accessibilité..."
                rows={4}
                value={formData.accessibility_policy}
                onChange={(e) => handleInputChange('accessibility_policy', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Engagement de l'organisme en matière d'accessibilité
              </p>
            </div>

            <div>
              <Label htmlFor="physical_accessibility_statement">Registre d'accessibilité physique</Label>
              <Textarea
                id="physical_accessibility_statement"
                placeholder="Décrivez l'accessibilité de vos locaux (rampes, ascenseurs, sanitaires adaptés...)..."
                rows={4}
                value={formData.physical_accessibility_statement}
                onChange={(e) => handleInputChange('physical_accessibility_statement', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Description des aménagements physiques des locaux
              </p>
            </div>

            <div>
              <Label htmlFor="digital_accessibility_statement">Registre d'accessibilité numérique</Label>
              <Textarea
                id="digital_accessibility_statement"
                placeholder="Décrivez l'accessibilité de vos contenus numériques (RGAA, sous-titres, transcriptions...)..."
                rows={4}
                value={formData.digital_accessibility_statement}
                onChange={(e) => handleInputChange('digital_accessibility_statement', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Description de l'accessibilité des supports pédagogiques numériques
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Partenariats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Partenariats
            </CardTitle>
            <CardDescription>Réseaux et organismes partenaires pour l'accompagnement handicap</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partner_agefiph"
                  checked={formData.partner_agefiph}
                  onCheckedChange={(checked) => handleInputChange('partner_agefiph', checked)}
                />
                <label
                  htmlFor="partner_agefiph"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Agefiph (Association de gestion du fonds pour l'insertion professionnelle des personnes handicapées)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partner_cap_emploi"
                  checked={formData.partner_cap_emploi}
                  onCheckedChange={(checked) => handleInputChange('partner_cap_emploi', checked)}
                />
                <label
                  htmlFor="partner_cap_emploi"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Cap emploi (Réseau d'organismes de placement spécialisés)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partner_fiphfp"
                  checked={formData.partner_fiphfp}
                  onCheckedChange={(checked) => handleInputChange('partner_fiphfp', checked)}
                />
                <label
                  htmlFor="partner_fiphfp"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  FIPHFP (Fonds pour l'insertion des personnes handicapées dans la fonction publique)
                </label>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="mb-3 block">Autres partenaires</Label>

              {/* Liste des partenaires existants */}
              {formData.partner_other && (formData.partner_other as any[]).length > 0 && (
                <div className="space-y-2 mb-4">
                  {(formData.partner_other as any[]).map((partner: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{partner.name}</p>
                        {partner.contact && <p className="text-xs text-muted-foreground">{partner.contact}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePartner(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire ajout partenaire */}
              <div className="space-y-3">
                <Input
                  placeholder="Nom du partenaire"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                />
                <Input
                  placeholder="Contact (email ou téléphone)"
                  value={newPartnerContact}
                  onChange={(e) => setNewPartnerContact(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPartner}
                  disabled={!newPartnerName.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un partenaire
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/accessibility">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
