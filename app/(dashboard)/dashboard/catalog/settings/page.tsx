'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { publicCatalogSettingsService, type PublicCatalogSettingsFormData } from '@/lib/services/public-catalog-settings.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { Save, Upload, Image as ImageIcon, Palette, Globe, FileText, Mail, Settings, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CatalogSettingsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [formData, setFormData] = useState<PublicCatalogSettingsFormData>({
    is_enabled: false,
    primary_color: '#274472',
    background_color: '#ffffff',
    text_color: '#000000',
    hero_button_text: 'Découvrir nos formations',
    show_contact_form: true,
  })

  // Récupérer l'organisation pour pré-remplir les données
  const { data: organization } = useQuery<Record<string, any> | null>({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .maybeSingle()
      if (error) throw error
      return data as Record<string, any> | null
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les settings existants
  const { data: settings, isLoading } = useQuery<Record<string, any> | null>({
    queryKey: ['public-catalog-settings', user?.organization_id],
    queryFn: async () => {
      const result = await publicCatalogSettingsService.getSettings(user?.organization_id!)
      return result as Record<string, any> | null
    },
    enabled: !!user?.organization_id,
  })

  // Initialiser le formulaire avec les données existantes et les données de l'organisation
  useEffect(() => {
    if (settings || organization) {
      setFormData({
        is_enabled: settings?.is_enabled ?? false,
        // Informations de base - pré-remplies depuis l'organisation
        site_title: settings?.site_title ?? organization?.name ?? undefined,
        site_description: settings?.site_description ?? undefined,
        site_keywords: settings?.site_keywords ?? undefined,
        // Couleurs
        primary_color: settings?.primary_color ?? '#274472',
        secondary_color: settings?.secondary_color ?? undefined,
        accent_color: settings?.accent_color ?? undefined,
        background_color: settings?.background_color ?? '#ffffff',
        text_color: settings?.text_color ?? '#000000',
        // Logo - pré-rempli depuis l'organisation
        logo_url: settings?.logo_url ?? organization?.logo_url ?? undefined,
        favicon_url: settings?.favicon_url ?? undefined,
        cover_image_url: settings?.cover_image_url ?? undefined,
        footer_image_url: settings?.footer_image_url ?? undefined,
        // Hero - pré-rempli avec le nom de l'organisation
        hero_title: settings?.hero_title ?? organization?.name ?? undefined,
        hero_subtitle: settings?.hero_subtitle ?? undefined,
        hero_description: settings?.hero_description ?? undefined,
        hero_button_text: settings?.hero_button_text ?? 'Découvrir nos formations',
        hero_button_link: settings?.hero_button_link ?? '/programmes',
        // À propos
        about_title: settings?.about_title ?? undefined,
        about_content: settings?.about_content ?? undefined,
        about_image_url: settings?.about_image_url ?? undefined,
        // Contact - pré-rempli depuis l'organisation
        contact_email: settings?.contact_email ?? organization?.email ?? undefined,
        contact_phone: settings?.contact_phone ?? organization?.phone ?? undefined,
        contact_address: settings?.contact_address ?? organization?.address ?? undefined,
        show_contact_form: settings?.show_contact_form ?? true,
        // Footer
        footer_text: settings?.footer_text ?? undefined,
        footer_links: settings?.footer_links as any ?? undefined,
        social_links: settings?.social_links as any ?? undefined,
        // SEO
        google_analytics_id: settings?.google_analytics_id ?? undefined,
        google_tag_manager_id: settings?.google_tag_manager_id ?? undefined,
        meta_title: settings?.meta_title ?? organization?.name ?? undefined,
        meta_description: settings?.meta_description ?? undefined,
        meta_image_url: settings?.meta_image_url ?? organization?.logo_url ?? undefined,
        custom_domain: settings?.custom_domain ?? undefined,
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
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la sauvegarde.',
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
    } catch (error: any) {
      addToast({
        title: 'Erreur d\'upload',
        description: error.message || 'Erreur lors de l\'upload de l\'image',
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
                      <img src={formData.logo_url} alt="Logo" className="h-20 w-auto object-contain border rounded" />
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
                      <img src={formData.cover_image_url} alt="Cover" className="h-32 w-auto object-cover border rounded" />
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
        </Tabs>
      </form>
    </div>
  )
}

