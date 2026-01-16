'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Download, BookOpen, Calendar, CheckCircle2, 
  Clock, User, Award, Star, FileText, Printer
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'

export default function ViewPortfolioPage() {
  const params = useParams()
  const { user } = useAuth()
  const supabase = createClient()
  const portfolioId = params.id as string

  // Récupérer le portfolio
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['view-portfolio', portfolioId],
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
        .eq('is_visible_to_student', true)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!portfolioId,
  })

  // Récupérer les entrées
  const { data: entries } = useQuery({
    queryKey: ['view-portfolio-entries', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_portfolio_entries')
        .select('*')
        .eq('portfolio_id', portfolioId)

      if (error) return []
      return data || []
    },
    enabled: !!portfolioId,
  })

  // Créer un map des entrées pour un accès facile
  const entriesMap: Record<string, any> = {}
  entries?.forEach((entry: any) => {
    const key = `${entry.section_id}.${entry.field_id}`
    entriesMap[key] = entry
  })

  const getFieldValue = (sectionId: string, fieldId: string) => {
    const key = `${sectionId}.${fieldId}`
    return entriesMap[key]?.value || portfolio?.content?.[key]
  }

  const getFieldComment = (sectionId: string, fieldId: string) => {
    const key = `${sectionId}.${fieldId}`
    return entriesMap[key]?.teacher_comment
  }

  // Rendu d'une valeur selon le type
  const renderValue = (field: any, sectionId: string) => {
    const value = getFieldValue(sectionId, field.id)
    const comment = getFieldComment(sectionId, field.id)

    if (value === undefined || value === null || value === '') {
      return <span className="text-gray-400 italic">Non renseigné</span>
    }

    switch (field.type) {
      case 'checkbox':
        return value ? (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Oui
          </span>
        ) : (
          <span className="text-gray-500">Non</span>
        )

      case 'rating':
        const maxRating = field.max || 5
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <Star 
                key={i} 
                className={cn(
                  'h-5 w-5',
                  i < value ? 'text-yellow-500 fill-current' : 'text-gray-300'
                )} 
              />
            ))}
            <span className="ml-2 text-gray-600">{value}/{maxRating}</span>
          </div>
        )

      case 'competency':
        const levels = field.competencyLevels || ['Non acquis', 'En cours', 'Acquis', 'Maîtrisé']
        const levelIndex = levels.indexOf(value)
        const levelColors = ['bg-red-100 text-red-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700']
        return (
          <Badge className={cn('text-sm', levelColors[levelIndex] || 'bg-gray-100 text-gray-700')}>
            {value}
          </Badge>
        )

      case 'date':
        return <span>{formatDate(value)}</span>

      case 'select':
        return <span className="font-medium">{value}</span>

      default:
        return <span className="whitespace-pre-wrap">{value}</span>
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
            <p className="text-gray-600 mb-4">Ce livret n'existe pas ou n'est pas accessible.</p>
            <Link href="/portal/portfolios">
              <Button>Retour à mes livrets</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const template = portfolio.template
  const student = portfolio.student

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl print:max-w-none print:py-0">
      {/* Header - masqué à l'impression */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 print:hidden"
      >
        <div className="flex items-center gap-4 mb-4">
          <Link href="/portal/portfolios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {template?.name || 'Livret d\'apprentissage'}
            </h1>
            {portfolio.session?.formations && (
              <p className="text-gray-600">{portfolio.session.formations.name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            {portfolio.pdf_url && (
              <a href={portfolio.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* En-tête du livret */}
      <Card 
        className="mb-6 print:border-0 print:shadow-none"
        style={{ borderTopWidth: 4, borderTopColor: template?.primary_color || '#335ACF' }}
      >
        <CardContent className="py-6">
          <div className="flex items-center gap-6">
            {/* Logo/Avatar */}
            <div 
              className="w-20 h-20 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ backgroundColor: template?.primary_color || '#335ACF' }}
            >
              {student?.photo_url ? (
                <img src={student.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                `${student?.first_name?.[0]}${student?.last_name?.[0]}`
              )}
            </div>

            {/* Informations */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {student?.first_name} {student?.last_name}
              </h2>
              <p className="text-gray-600">{student?.email}</p>
              {portfolio.session && (
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {portfolio.session.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(portfolio.session.start_date)} - {formatDate(portfolio.session.end_date)}
                  </span>
                </div>
              )}
            </div>

            {/* Statut et progression */}
            <div className="text-right">
              <Badge 
                className={cn(
                  'mb-2',
                  portfolio.status === 'validated' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                )}
              >
                {portfolio.status === 'validated' ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Validé</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> En cours</>
                )}
              </Badge>
              <div className="text-3xl font-bold" style={{ color: template?.primary_color }}>
                {Math.round(portfolio.progress_percentage || 0)}%
              </div>
              <p className="text-xs text-gray-500">Progression</p>
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
            className="print:break-inside-avoid"
          >
            <Card className="print:border print:shadow-none">
              <CardHeader 
                className="print:py-3"
                style={{ borderBottomWidth: 2, borderBottomColor: template?.primary_color }}
              >
                <CardTitle className="flex items-center gap-3">
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium print:border print:border-gray-300 print:bg-white print:text-gray-700"
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
              <CardContent className="pt-6 print:pt-4">
                <div className="space-y-6 print:space-y-4">
                  {section.fields?.map((field: any) => {
                    const value = getFieldValue(section.id, field.id)
                    const comment = getFieldComment(section.id, field.id)
                    
                    return (
                      <div key={field.id} className="print:break-inside-avoid">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                              {field.label}
                            </label>
                            <div className="text-gray-900">
                              {renderValue(field, section.id)}
                            </div>
                          </div>
                        </div>
                        
                        {comment && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 italic">
                            <span className="font-medium">Commentaire :</span> {comment}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Date de validation */}
      {portfolio.validated_at && (
        <Card className="mt-6 bg-green-50 border-green-200 print:bg-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Livret validé</p>
                  <p className="text-sm text-green-700">
                    Ce livret a été validé le {formatDate(portfolio.validated_at)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer d'impression */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>Document généré le {new Date().toLocaleDateString('fr-FR')} - {template?.name}</p>
      </div>
    </div>
  )
}

