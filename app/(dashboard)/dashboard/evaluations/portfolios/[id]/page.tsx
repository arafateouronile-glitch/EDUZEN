'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, Save, Eye, Download, CheckCircle2, Clock,
  User, Calendar, Star, Award, FileText, Send, Upload
} from 'lucide-react'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { formatDate, cn } from '@/lib/utils'

export default function EditPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const portfolioId = params.id as string

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [teacherNotes, setTeacherNotes] = useState('')
  const [isVisibleToStudent, setIsVisibleToStudent] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Récupérer le portfolio
  const { data: portfolio, isLoading } = useQuery<{
    id: string;
    teacher_notes?: string | null;
    is_visible_to_student?: boolean;
    content?: Record<string, any>;
    [key: string]: any;
  } | null>({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_portfolios')
        .select(`
          *,
          template:learning_portfolio_templates(*),
          student:students(id, first_name, last_name, email, phone, photo_url),
          session:sessions(id, name, start_date, end_date, formations(id, name))
        `)
        .eq('id', portfolioId)
        .single()

      if (error) throw error
      return data as any
    },
    enabled: !!portfolioId,
  })

  // Récupérer les entrées existantes
  const { data: entries } = useQuery({
    queryKey: ['portfolio-entries', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_portfolio_entries')
        .select('*')
        .eq('portfolio_id', portfolioId)

      if (error) {
        console.log('Erreur ou table inexistante:', error)
        return []
      }
      return data || []
    },
    enabled: !!portfolioId,
  })

  // Charger les données existantes
  useEffect(() => {
    if (portfolio) {
      setTeacherNotes(portfolio.teacher_notes || '')
      setIsVisibleToStudent(portfolio.is_visible_to_student || false)
      
      // Charger le contenu existant
      if (portfolio.content) {
        setFormData(portfolio.content)
      }
    }
  }, [portfolio])

  // Charger les entrées dans le formulaire
  useEffect(() => {
    if (entries && entries.length > 0) {
      const entriesData: Record<string, any> = {}
      entries.forEach((entry: any) => {
        const key = `${entry.section_id}.${entry.field_id}`
        entriesData[key] = entry.value
        if (entry.teacher_comment) {
          entriesData[`${key}_comment`] = entry.teacher_comment
        }
      })
      setFormData(prev => ({ ...prev, ...entriesData }))
    }
  }, [entries])

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (data: { content: Record<string, any>, status: string }) => {
      // Mettre à jour le portfolio
      const { error: portfolioError } = await (supabase
        .from('learning_portfolios') as any)
        .update({
          content: data.content,
          status: data.status,
          teacher_notes: teacherNotes,
          is_visible_to_student: isVisibleToStudent,
          last_modified_by: user?.id,
          ...(data.status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', portfolioId)

      if (portfolioError) throw portfolioError

      // Sauvegarder les entrées individuelles
      const entriesToUpsert: any[] = []
      const template = portfolio?.template

      template?.template_structure?.forEach((section: any) => {
        section.fields?.forEach((field: any) => {
          const key = `${section.id}.${field.id}`
          const value = data.content[key]
          if (value !== undefined) {
            entriesToUpsert.push({
              portfolio_id: portfolioId,
              section_id: section.id,
              field_id: field.id,
              value: value,
              teacher_comment: data.content[`${key}_comment`] || null,
              evaluated_by: user?.id,
              evaluated_at: new Date().toISOString(),
            })
          }
        })
      })

      if (entriesToUpsert.length > 0) {
        const { error: entriesError } = await (supabase
          .from('learning_portfolio_entries') as any)
          .upsert(entriesToUpsert, { onConflict: 'portfolio_id,section_id,field_id' })

        if (entriesError) {
          console.error('Erreur sauvegarde entrées:', entriesError)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-entries', portfolioId] })
      addToast({ type: 'success', title: 'Livret sauvegardé', description: 'Les modifications ont été enregistrées.' })
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible de sauvegarder.' })
    },
  })

  const handleSave = (status: string = 'in_progress') => {
    saveMutation.mutate({ content: formData, status })
  }

  const handleValidate = () => {
    if (confirm('Êtes-vous sûr de vouloir valider ce livret ? Il sera visible par l\'apprenant.')) {
      saveMutation.mutate({ content: formData, status: 'validated' })
      setIsVisibleToStudent(true)
    }
  }

  const updateField = (sectionId: string, fieldId: string, value: any) => {
    const key = `${sectionId}.${fieldId}`
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const getFieldValue = (sectionId: string, fieldId: string) => {
    const key = `${sectionId}.${fieldId}`
    return formData[key]
  }

  // Rendu d'un champ selon son type
  const renderField = (section: any, field: any) => {
    const value = getFieldValue(section.id, field.id)
    const key = `${section.id}.${field.id}`

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateField(section.id, field.id, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => updateField(section.id, field.id, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={4}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateField(section.id, field.id, parseFloat(e.target.value))}
            min={field.min}
            max={field.max}
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => updateField(section.id, field.id, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue"
          >
            <option value="">Sélectionner...</option>
            {field.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateField(section.id, field.id, e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">{field.description || 'Oui'}</span>
          </div>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => updateField(section.id, field.id, e.target.value)}
          />
        )

      case 'rating':
        const maxRating = field.max || 5
        const minRating = field.min || 1
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRating - minRating + 1 }, (_, i) => i + minRating).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateField(section.id, field.id, rating)}
                className={cn(
                  'p-1 rounded transition-colors',
                  (value || 0) >= rating ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                )}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {value ? `${value}/${maxRating}` : 'Non noté'}
            </span>
          </div>
        )

      case 'competency':
        const levels = field.competencyLevels || ['Non acquis', 'En cours', 'Acquis', 'Maîtrisé']
        return (
          <div className="flex flex-wrap gap-2">
            {levels.map((level: string, index: number) => (
              <button
                key={level}
                type="button"
                onClick={() => updateField(section.id, field.id, level)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  value === level
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        )

      case 'file':
        return (
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Glissez un fichier ici ou cliquez pour sélectionner
            </p>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                // TODO: Implémenter l'upload de fichier
                const file = e.target.files?.[0]
                if (file) {
                  updateField(section.id, field.id, { name: file.name, size: file.size })
                }
              }}
            />
          </div>
        )

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateField(section.id, field.id, e.target.value)}
          />
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Livret non trouvé</h3>
            <Link href="/dashboard/evaluations/portfolios">
              <Button>Retour à la liste</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const template = portfolio.template
  const student = portfolio.student

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/evaluations/portfolios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {template?.name || 'Livret d\'apprentissage'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {student?.first_name} {student?.last_name}
              </span>
              {portfolio.session && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {portfolio.session.name}
                </span>
              )}
              <Badge variant={portfolio.status === 'validated' ? 'default' : 'secondary'}>
                {portfolio.status === 'draft' && 'Brouillon'}
                {portfolio.status === 'in_progress' && 'En cours'}
                {portfolio.status === 'completed' && 'Terminé'}
                {portfolio.status === 'validated' && 'Validé'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSave('in_progress')} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
            <Button onClick={handleValidate} disabled={saveMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Valider
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Info apprenant */}
      <Card className="mb-6" style={{ borderLeftColor: template?.primary_color, borderLeftWidth: 4 }}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-medium"
              style={{ backgroundColor: template?.primary_color || '#335ACF' }}
            >
              {student?.photo_url ? (
                <img src={student.photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                `${student?.first_name?.[0]}${student?.last_name?.[0]}`
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{student?.first_name} {student?.last_name}</h3>
              <p className="text-sm text-gray-600">{student?.email}</p>
              {portfolio.session?.formations && (
                <p className="text-sm text-gray-500">{portfolio.session.formations.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Progression</p>
              <p className="text-2xl font-bold" style={{ color: template?.primary_color }}>
                {Math.round(portfolio.progress_percentage || 0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections du livret */}
      <div className="space-y-6">
        {template?.template_structure?.map((section: any, sectionIndex: number) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <Card>
              <CardHeader style={{ borderBottomColor: template?.primary_color, borderBottomWidth: 2 }}>
                <CardTitle className="flex items-center gap-2">
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: template?.primary_color }}
                  >
                    {sectionIndex + 1}
                  </span>
                  {section.title}
                </CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {section.fields?.map((field: any) => (
                    <div key={field.id}>
                      <Label className="flex items-center gap-2 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {renderField(section, field)}
                      
                      {/* Commentaire enseignant optionnel */}
                      {(field.type === 'competency' || field.type === 'rating') && (
                        <div className="mt-2">
                          <Input
                            placeholder="Commentaire (optionnel)"
                            value={formData[`${section.id}.${field.id}_comment`] || ''}
                            onChange={(e) => {
                              const key = `${section.id}.${field.id}_comment`
                              setFormData(prev => ({ ...prev, [key]: e.target.value }))
                            }}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Notes et options */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Notes et options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Notes du formateur</Label>
            <Textarea
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Notes internes (non visibles par l'apprenant)..."
              rows={4}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Visibilité apprenant</p>
              <p className="text-sm text-gray-600">
                Permettre à l'apprenant de consulter et télécharger son livret
              </p>
            </div>
            <Switch
              checked={isVisibleToStudent}
              onCheckedChange={setIsVisibleToStudent}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions finales */}
      <div className="mt-6 flex justify-between">
        <Link href="/dashboard/evaluations/portfolios">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave('in_progress')} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
          <Button onClick={handleValidate} disabled={saveMutation.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Valider et rendre visible
          </Button>
        </div>
      </div>
    </div>
  )
}

