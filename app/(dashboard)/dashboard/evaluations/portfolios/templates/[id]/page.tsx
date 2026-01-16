'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { learningPortfolioService, type TemplateSection, type TemplateField } from '@/lib/services/learning-portfolio.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  FileText, Type, AlignLeft, Hash, List, CheckSquare, Calendar, 
  Upload, Star, Award, Eye, Settings, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

const FIELD_TYPES = [
  { value: 'text', label: 'Texte court', icon: Type },
  { value: 'textarea', label: 'Texte long', icon: AlignLeft },
  { value: 'number', label: 'Nombre', icon: Hash },
  { value: 'select', label: 'Liste déroulante', icon: List },
  { value: 'checkbox', label: 'Case à cocher', icon: CheckSquare },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'file', label: 'Fichier', icon: Upload },
  { value: 'rating', label: 'Note (étoiles)', icon: Star },
  { value: 'competency', label: 'Compétence', icon: Award },
]

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primary_color: '#335ACF',
    secondary_color: '#34B9EE',
    formation_id: '',
    is_default: false,
  })

  const [sections, setSections] = useState<TemplateSection[]>([])
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  // Charger le template existant
  const { data: template, isLoading } = useQuery<{
    id: string;
    name?: string;
    description?: string;
    primary_color?: string;
    secondary_color?: string;
    formation_id?: string | null;
    formation?: { id: string; name: string } | null;
    [key: string]: any;
  } | null>({
    queryKey: ['portfolio-template', templateId],
    queryFn: async () => {
      try {
        // Récupérer le template sans jointure pour éviter les erreurs 400
        const { data: templateData, error: templateError } = await supabase
          .from('learning_portfolio_templates')
          .select('*')
          .eq('id', templateId)
          .single()
        
        if (templateError) {
          // Si la table n'existe pas, retourner null
          if (templateError.code === 'PGRST116' || templateError.code === '42P01' || templateError.message?.includes('does not exist')) {
            console.warn('Table learning_portfolio_templates non disponible')
            return null
          }
          throw templateError
        }
        
        if (!templateData) return null
        
        const typedTemplateData = templateData as { id: string; formation_id?: string | null; [key: string]: any }
        
        // Si formation_id existe, récupérer la formation séparément
        if (typedTemplateData.formation_id) {
          try {
            const { data: formationData } = await supabase
              .from('formations')
              .select('id, name')
              .eq('id', typedTemplateData.formation_id)
              .single()
            
            return { ...typedTemplateData, formation: formationData || null }
          } catch (formationError: any) {
            // Si la table formations n'existe pas ou erreur, continuer sans formation
            console.warn('Impossible de récupérer la formation:', formationError)
            return { ...typedTemplateData, formation: null }
          }
        }
        
        return { ...typedTemplateData, formation: null }
      } catch (error: any) {
        // Si la table n'existe pas, retourner null
        if (error?.code === 'PGRST116' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.warn('Table learning_portfolio_templates non disponible')
          return null
        }
        throw error
      }
    },
    enabled: !!templateId,
  })

  // Initialiser les données quand le template est chargé
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        primary_color: template.primary_color || '#335ACF',
        secondary_color: template.secondary_color || '#34B9EE',
        formation_id: template.formation_id || '',
        is_default: template.is_default || false,
      })
      
      if (template.template_structure && Array.isArray(template.template_structure)) {
        setSections(template.template_structure as TemplateSection[])
        setExpandedSections((template.template_structure as TemplateSection[]).map(s => s.id))
      }
    }
  }, [template])

  // Récupérer les formations pour le select
  const { data: formations } = useQuery({
    queryKey: ['formations-select', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('formations')
        .select('id, name')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
      if (error) return []
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour mettre à jour le template
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase
        .from('learning_portfolio_templates') as any)
        .update({
          name: formData.name,
          description: formData.description,
          template_structure: sections,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          formation_id: formData.formation_id || null,
          is_default: formData.is_default,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Modèle mis à jour', description: 'Le modèle de livret a été mis à jour avec succès.' })
      router.push('/dashboard/evaluations/portfolios/templates')
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible de mettre à jour le modèle.' })
    },
  })

  // Ajouter une section
  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: 'Nouvelle section',
      description: '',
      fields: [],
    }
    setSections([...sections, newSection])
    setExpandedSections([...expandedSections, newSection.id])
  }

  // Supprimer une section
  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId))
  }

  // Mettre à jour une section
  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s))
  }

  // Ajouter un champ à une section
  const addField = (sectionId: string) => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      label: 'Nouveau champ',
      type: 'text',
      required: false,
    }
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, fields: [...s.fields, newField] }
        : s
    ))
  }

  // Supprimer un champ
  const removeField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
        : s
    ))
  }

  // Mettre à jour un champ
  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }
        : s
    ))
  }

  // Basculer l'expansion d'une section
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      addToast({ type: 'error', title: 'Erreur', description: 'Le nom du modèle est requis.' })
      return
    }
    if (sections.length === 0) {
      addToast({ type: 'error', title: 'Erreur', description: 'Ajoutez au moins une section.' })
      return
    }
    updateMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Modèle introuvable
            </h3>
            <p className="text-gray-600 mb-6">
              Le modèle que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Link href="/dashboard/evaluations/portfolios/templates">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux modèles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/evaluations/portfolios/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Modifier le modèle
            </h1>
            <p className="text-gray-600">
              Modifiez le modèle de livret d'apprentissage
            </p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Paramètres généraux */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paramètres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du modèle *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Livret de suivi formation"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du modèle..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="formation">Formation associée (optionnel)</Label>
                  <select
                    id="formation"
                    value={formData.formation_id}
                    onChange={(e) => setFormData({ ...formData, formation_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="">Aucune (modèle générique)</option>
                    {formations?.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_color">Couleur principale</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="primary_color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary_color">Couleur secondaire</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="secondary_color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_default">Modèle par défaut</Label>
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? 'Mise à jour...' : 'Enregistrer les modifications'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Éditeur de sections */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Structure du livret ({sections.length} section{sections.length > 1 ? 's' : ''})
              </h2>
              <Button type="button" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une section
              </Button>
            </div>

            {sections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune section
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Ajoutez des sections pour structurer votre livret d'apprentissage.
                  </p>
                  <Button type="button" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une section
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {sections.map((section, sectionIndex) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: sectionIndex * 0.05 }}
                  >
                    <Card className="border-l-4" style={{ borderLeftColor: formData.primary_color }}>
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                          <div className="flex-1">
                            <Input
                              value={section.title}
                              onChange={(e) => updateSection(section.id, { title: e.target.value })}
                              className="font-semibold text-lg border-none p-0 h-auto focus:ring-0"
                              placeholder="Titre de la section"
                            />
                            <Input
                              value={section.description || ''}
                              onChange={(e) => updateSection(section.id, { description: e.target.value })}
                              className="text-sm text-gray-500 border-none p-0 h-auto focus:ring-0 mt-1"
                              placeholder="Description (optionnel)"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {section.fields.length} champ{section.fields.length > 1 ? 's' : ''}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection(section.id)}
                            >
                              {expandedSections.includes(section.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSection(section.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <AnimatePresence>
                        {expandedSections.includes(section.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                {section.fields.map((field, fieldIndex) => (
                                  <div
                                    key={field.id}
                                    className="p-3 bg-gray-50 rounded-lg border"
                                  >
                                    <div className="grid grid-cols-12 gap-3">
                                      <div className="col-span-5">
                                        <Label className="text-xs">Label</Label>
                                        <Input
                                          value={field.label}
                                          onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                                          placeholder="Nom du champ"
                                        />
                                      </div>
                                      <div className="col-span-4">
                                        <Label className="text-xs">Type</Label>
                                        <select
                                          value={field.type}
                                          onChange={(e) => updateField(section.id, field.id, { type: e.target.value as any })}
                                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue text-sm"
                                        >
                                          {FIELD_TYPES.map(ft => (
                                            <option key={ft.value} value={ft.value}>{ft.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="col-span-2 flex items-end justify-center">
                                        <label className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                                            className="rounded"
                                          />
                                          Requis
                                        </label>
                                      </div>
                                      <div className="col-span-1 flex items-end justify-end">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeField(section.id, field.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Options pour certains types */}
                                    {(field.type === 'select' || field.type === 'competency') && (
                                      <div className="mt-3">
                                        <Label className="text-xs">
                                          {field.type === 'competency' ? 'Niveaux de compétence' : 'Options'} (séparées par des virgules)
                                        </Label>
                                        <Input
                                          value={field.type === 'competency' 
                                            ? (field.competencyLevels || ['Non acquis', 'En cours', 'Acquis', 'Maîtrisé']).join(', ')
                                            : (field.options || []).join(', ')
                                          }
                                          onChange={(e) => {
                                            const values = e.target.value.split(',').map(v => v.trim())
                                            if (field.type === 'competency') {
                                              updateField(section.id, field.id, { competencyLevels: values })
                                            } else {
                                              updateField(section.id, field.id, { options: values })
                                            }
                                          }}
                                          placeholder={field.type === 'competency' 
                                            ? 'Non acquis, En cours, Acquis, Maîtrisé'
                                            : 'Option 1, Option 2, Option 3'
                                          }
                                        />
                                      </div>
                                    )}
                                    
                                    {field.type === 'rating' && (
                                      <div className="mt-3 grid grid-cols-2 gap-3">
                                        <div>
                                          <Label className="text-xs">Note min</Label>
                                          <Input
                                            type="number"
                                            value={field.min || 1}
                                            onChange={(e) => updateField(section.id, field.id, { min: parseInt(e.target.value) })}
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Note max</Label>
                                          <Input
                                            type="number"
                                            value={field.max || 5}
                                            onChange={(e) => updateField(section.id, field.id, { max: parseInt(e.target.value) })}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addField(section.id)}
                                className="mt-3 w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter un champ
                              </Button>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

