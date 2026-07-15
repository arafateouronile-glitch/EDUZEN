'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { publicCatalogSettingsService, type PublicCatalogSettingsFormData } from '@/lib/services/public-catalog-settings.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { Save, Upload, Image as ImageIcon, Palette, Globe, FileText, Mail, Settings, ExternalLink, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { BRAND_COLORS } from '@/lib/config/app-config'

export default function CatalogSettingsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [formData, setFormData] = useState<PublicCatalogSettingsFormData>({
    is_enabled: false,
    primary_color: BRAND_COLORS.primary,
    background_color: '#ffffff',
    text_color: '#000000',
    hero_button_text: 'Découvrir nos formations',
    show_contact_form: true,
    stats_trained_students: 1200,
    stats_satisfaction_rate: 98,
    stats_success_rate: 95,
  })

  // Récupérer l'organisation pour pré-remplir les données
  const { data: organization } = useQuery<Record<string, unknown> | null>({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .maybeSingle()
      if (error) throw error
      return data as Record<string, unknown> | null
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les settings existants
  const { data: settings, isLoading } = useQuery<Record<string, unknown> | null>({
    queryKey: ['public-catalog-settings', user?.organization_id],
    queryFn: async () => {
      const result = await publicCatalogSettingsService.getSettings(user?.organization_id ?? '')
      return result as Record<string, unknown> | null
    },
    enabled: !!user?.organization_id,
  })

  // Initialiser le formulaire avec les données existantes et les données de l'organisation
  useEffect(() => {
    if (settings || organization) {
      const s = settings as Partial<PublicCatalogSettingsFormData> | null | undefined
      const o = organization as { name?: string; logo_url?: string; email?: string; phone?: string; address?: string } | null | undefined
      setFormData({
        is_enabled: Boolean(s?.is_enabled ?? false),
        site_title: (s?.site_title ?? o?.name ?? undefined) as string | undefined,
        site_description: (s?.site_description ?? undefined) as string | undefined,
        site_keywords: (Array.isArray(s?.site_keywords) ? s.site_keywords : undefined) as string[] | undefined,
        primary_color: (s?.primary_color ?? '#274472') as string,
        secondary_color: (s?.secondary_color ?? undefined) as string | undefined,
        accent_color: (s?.accent_color ?? undefined) as string | undefined,
        background_color: (s?.background_color ?? '#ffffff') as string,
        text_color: (s?.text_color ?? '#000000') as string,
        logo_url: (s?.logo_url ?? o?.logo_url ?? undefined) as string | undefined,
        favicon_url: (s?.favicon_url ?? undefined) as string | undefined,
        cover_image_url: (s?.cover_image_url ?? undefined) as string | undefined,
        footer_image_url: (s?.footer_image_url ?? undefined) as string | undefined,
        hero_title: (s?.hero_title ?? o?.name ?? undefined) as string | undefined,
        hero_subtitle: (s?.hero_subtitle ?? undefined) as string | undefined,
        hero_description: (s?.hero_description ?? undefined) as string | undefined,
        hero_button_text: (s?.hero_button_text ?? 'Découvrir nos formations') as string,
        hero_button_link: (s?.hero_button_link ?? '/programmes') as string,
        about_title: (s?.about_title ?? undefined) as string | undefined,
        about_content: (s?.about_content ?? undefined) as string | undefined,
        about_image_url: (s?.about_image_url ?? undefined) as string | undefined,
        contact_email: (s?.contact_email ?? o?.email ?? undefined) as string | undefined,
        contact_phone: (s?.contact_phone ?? o?.phone ?? undefined) as string | undefined,
        contact_address: (s?.contact_address ?? o?.address ?? undefined) as string | undefined,
        show_contact_form: Boolean(s?.show_contact_form ?? true),
        footer_text: (s?.footer_text ?? undefined) as string | undefined,
        footer_links: (s?.footer_links ?? undefined) as PublicCatalogSettingsFormData['footer_links'],
        social_links: (s?.social_links ?? undefined) as PublicCatalogSettingsFormData['social_links'],
        google_analytics_id: (s?.google_analytics_id ?? undefined) as string | undefined,
        google_tag_manager_id: (s?.google_tag_manager_id ?? undefined) as string | undefined,
        meta_title: (s?.meta_title ?? o?.name ?? undefined) as string | undefined,
        meta_description: (s?.meta_description ?? undefined) as string | undefined,
        meta_image_url: (s?.meta_image_url ?? o?.logo_url ?? undefined) as string | undefined,
        custom_domain: (s?.custom_domain ?? undefined) as string | undefined,
        stats_trained_students: Number(s?.stats_trained_students ?? 1200),
        stats_satisfaction_rate: Number(s?.stats_satisfaction_rate ?? 98),
        stats_success_rate: Number(s?.stats_success_rate ?? 95),
      })
    }
  }, [settings, organization])

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (data: PublicCatalogSettingsFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return publicCatalogSettingsService.upsertSettings(user.organization_id, data)
    },
    onSuccess: () => {
      addToast({
        title: 'Paramètres sauvegardés',
        description: 'Les paramètres du catalogue public ont été sauvegardés avec succès.',
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['public-catalog-settings'] })
      // Rafraîchit immédiatement la page catalogue publique (sinon ISR 60s avant que ça apparaisse).
      fetch('/api/catalog/revalidate', { method: 'POST' }).catch(() => {})
    },
    onError: (error: unknown) => {
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la sauvegarde.',
        type: 'error',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleImageUpload = async (field: 'logo_url' | 'favicon_url' | 'cover_image_url' | 'footer_image_url' | 'about_image_url' | 'meta_image_url', file: File) => {
    if (!user?.organization_id) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.organization_id}/catalog/${field}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('organizations')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('organizations')
        .getPublicUrl(fileName)

      setFormData((prev) => ({ ...prev, [field]: publicUrl }))
    } catch (error: unknown) {
      addToast({
        title: 'Erreur d\'upload',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'upload de l\'image',
        type: 'error',
      })
    }
  }

  if (isLoading) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres du site vitrine</h1>
          <p className="text-gray-600 mt-1">
            Personnalisez votre catalogue public et votre site vitrine
          </p>
        </div>
        <div className="flex items-center gap-4">
          {organization && (
            <Link 
              href={`/cataloguepublic/${organization.code || organization.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir le site public
              </Button>
            </Link>
          )}
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Settings className="w-4 h-4 mr-2" />
              Général
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 mr-2" />
              Apparence
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-2" />
              Contenu
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Mail className="w-4 h-4 mr-2" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Globe className="w-4 h-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Award className="w-4 h-4 mr-2" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {/* Général */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activation</CardTitle>
                <CardDescription>Activez votre site vitrine pour le rendre accessible publiquement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Site vitrine actif</Label>
                    <p className="text-sm text-gray-500">Rendre le site vitrine accessible publiquement</p>
                  </div>
                  <Switch
                    checked={formData.is_enabled}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_enabled: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informations de base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="site_title">Titre du site</Label>
                  <Input
                    id="site_title"
                    value={formData.site_title || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, site_title: e.target.value }))}
                    placeholder="Ex: Formations Professionnelles - Mon Organisme"
                  />
                </div>
                <div>
                  <Label htmlFor="site_description">Description</Label>
                  <Textarea
                    id="site_description"
                    value={formData.site_description || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, site_description: e.target.value }))}
                    placeholder="Description du site pour le SEO"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Apparence */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Couleurs</CardTitle>
                <CardDescription>Personnalisez les couleurs de votre site vitrine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_color">Couleur principale</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="primary_color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#274472"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary_color">Couleur secondaire</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={formData.secondary_color || '#ffffff'}
                        onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={formData.secondary_color || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accent_color">Couleur d'accent</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="accent_color"
                        type="color"
                        value={formData.accent_color || '#274472'}
                        onChange={(e) => setFormData((prev) => ({ ...prev, accent_color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={formData.accent_color || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, accent_color: e.target.value }))}
                        placeholder="#274472"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="background_color">Couleur de fond</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="background_color"
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, background_color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={formData.background_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, background_color: e.target.value }))}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Logo</Label>
                  <div className="flex gap-4 mt-2">
                    {formData.logo_url && (
                      <div className="relative h-20 w-20">
                        <Image
                          src={formData.logo_url}
                          alt="Logo"
                          fill
                          className="object-contain border rounded"
                        />
                      </div>
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('logo_url', file)
                        }}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {formData.logo_url ? 'Changer le logo' : 'Uploader un logo'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Image de couverture (Hero)</Label>
                  <div className="flex gap-4 mt-2">
                    {formData.cover_image_url && (
                      <div className="relative h-32 w-48">
                        <Image
                          src={formData.cover_image_url}
                          alt="Cover"
                          fill
                          className="object-cover border rounded"
                        />
                      </div>
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('cover_image_url', file)
                        }}
                        className="hidden"
                        id="cover-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('cover-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {formData.cover_image_url ? 'Changer l\'image' : 'Uploader une image'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenu */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Section Hero</CardTitle>
                <CardDescription>En-tête principal de votre site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="hero_title">Titre principal</Label>
                  <Input
                    id="hero_title"
                    value={formData.hero_title || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hero_title: e.target.value }))}
                    placeholder="Ex: Formations Professionnelles de Qualité"
                  />
                </div>
                <div>
                  <Label htmlFor="hero_subtitle">Sous-titre</Label>
                  <Input
                    id="hero_subtitle"
                    value={formData.hero_subtitle || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hero_subtitle: e.target.value }))}
                    placeholder="Ex: Développez vos compétences"
                  />
                </div>
                <div>
                  <Label htmlFor="hero_description">Description</Label>
                  <Textarea
                    id="hero_description"
                    value={formData.hero_description || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hero_description: e.target.value }))}
                    placeholder="Description de votre organisme"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hero_button_text">Texte du bouton</Label>
                    <Input
                      id="hero_button_text"
                      value={formData.hero_button_text || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hero_button_text: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hero_button_link">Lien du bouton</Label>
                    <Input
                      id="hero_button_link"
                      value={formData.hero_button_link || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hero_button_link: e.target.value }))}
                      placeholder="/programmes"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Section À propos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="about_title">Titre</Label>
                  <Input
                    id="about_title"
                    value={formData.about_title || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, about_title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="about_content">Contenu</Label>
                  <Textarea
                    id="about_content"
                    value={formData.about_content || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, about_content: e.target.value }))}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations de contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Téléphone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_address">Adresse</Label>
                  <Textarea
                    id="contact_address"
                    value={formData.contact_address || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact_address: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Formulaire de contact</Label>
                    <p className="text-sm text-gray-500">Afficher un formulaire de contact sur le site</p>
                  </div>
                  <Switch
                    checked={formData.show_contact_form ?? true}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, show_contact_form: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Métadonnées SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meta_title">Titre SEO</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="meta_description">Description SEO</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                  <Input
                    id="google_analytics_id"
                    value={formData.google_analytics_id || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, google_analytics_id: e.target.value }))}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistiques */}
          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques du catalogue</CardTitle>
                <CardDescription>
                  Configurez les statistiques affichées sur votre catalogue public
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stats_trained_students">Apprenants formés</Label>
                  <Input
                    id="stats_trained_students"
                    type="number"
                    min="0"
                    value={formData.stats_trained_students || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stats_trained_students: parseInt(e.target.value) || 0 }))}
                    placeholder="1200"
                  />
                  <p className="text-sm text-gray-500 mt-1">Nombre d'apprenants formés à afficher</p>
                </div>
                <div>
                  <Label htmlFor="stats_satisfaction_rate">Taux de satisfaction (%)</Label>
                  <Input
                    id="stats_satisfaction_rate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.stats_satisfaction_rate || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stats_satisfaction_rate: parseInt(e.target.value) || 0 }))}
                    placeholder="98"
                  />
                  <p className="text-sm text-gray-500 mt-1">Taux de satisfaction en pourcentage (0-100)</p>
                </div>
                <div>
                  <Label htmlFor="stats_success_rate">Taux de réussite (%)</Label>
                  <Input
                    id="stats_success_rate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.stats_success_rate || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stats_success_rate: parseInt(e.target.value) || 0 }))}
                    placeholder="95"
                  />
                  <p className="text-sm text-gray-500 mt-1">Taux de réussite en pourcentage (0-100)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}

