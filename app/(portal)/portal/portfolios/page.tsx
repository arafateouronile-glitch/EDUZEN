'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Download, Eye, Calendar, CheckCircle2,
  Clock, FileText, ArrowRight, User, Award
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function StudentPortfoliosPage() {
  const { user } = useAuth()
  const supabase = createClient()

  // Récupérer l'ID étudiant de l'utilisateur (via email)
  const { data: studentId } = useQuery({
    queryKey: ['student-id', user?.email],
    queryFn: async () => {
      if (!user?.email) return null
      
      // Chercher l'étudiant lié à cet utilisateur via email
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single()

      if (error) {
        logger.warn('Portal Portfolios - Student not found', {
          error: sanitizeError(error),
        })
        return null
      }
      return data?.id
    },
    enabled: !!user?.email,
  })

  // Récupérer les livrets visibles pour l'apprenant
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['student-portfolios', studentId],
    queryFn: async () => {
      if (!studentId) return []

      const { data, error } = await supabase
        .from('learning_portfolios')
        .select(`
          *,
          template:learning_portfolio_templates(id, name, description, primary_color, secondary_color),
          session:sessions(id, name, start_date, end_date, formations(id, name))
        `)
        .eq('student_id', studentId)
        .eq('is_visible_to_student', true)
        .order('updated_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          logger.info('Portal Portfolios - Table does not exist yet')
          return []
        }
        logger.error('Portal Portfolios - Error fetching portfolios', error, {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return []
      }
      return data || []
    },
    enabled: !!studentId,
  })

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      draft: { label: 'En préparation', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> },
      in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-4 w-4" /> },
      completed: { label: 'Terminé', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-4 w-4" /> },
      validated: { label: 'Validé', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-4 w-4" /> },
    }
    return statuses[status] || statuses.draft
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-brand-blue" />
          Mes livrets d'apprentissage
        </h1>
        <p className="text-gray-600">
          Consultez et téléchargez vos livrets d'apprentissage validés par vos formateurs
        </p>
      </motion.div>

      {/* Liste des livrets */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      ) : portfolios?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun livret disponible
            </h3>
            <p className="text-gray-600">
              Vos livrets d'apprentissage apparaîtront ici une fois qu'ils auront été complétés et validés par vos formateurs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {portfolios?.map((portfolio: any, index: number) => {
            const statusInfo = getStatusInfo(portfolio.status)
            const template = portfolio.template
            
            return (
              <motion.div
                key={portfolio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                  style={{ borderLeftWidth: 4, borderLeftColor: template?.primary_color || '#335ACF' }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icône */}
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${template?.primary_color || '#335ACF'}15` }}
                      >
                        <BookOpen 
                          className="h-7 w-7" 
                          style={{ color: template?.primary_color || '#335ACF' }} 
                        />
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {template?.name || 'Livret d\'apprentissage'}
                            </h3>
                            {portfolio.session && (
                              <p className="text-sm text-gray-600 mt-1">
                                {portfolio.session.formations?.name} - {portfolio.session.name}
                              </p>
                            )}
                          </div>
                          <Badge className={cn('flex items-center gap-1', statusInfo.color)}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Informations */}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                          {portfolio.session?.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(portfolio.session.start_date)} - {formatDate(portfolio.session.end_date)}
                            </span>
                          )}
                          {portfolio.validated_at && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Validé le {formatDate(portfolio.validated_at)}
                            </span>
                          )}
                        </div>

                        {/* Barre de progression */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">Progression</span>
                            <span 
                              className="font-medium"
                              style={{ color: template?.primary_color || '#335ACF' }}
                            >
                              {Math.round(portfolio.progress_percentage || 0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${portfolio.progress_percentage || 0}%`,
                                backgroundColor: template?.primary_color || '#335ACF'
                              }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-4">
                          <Link href={`/portal/portfolios/${portfolio.id}`}>
                            <Button size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Consulter
                            </Button>
                          </Link>
                          {portfolio.pdf_url && (
                            <a href={portfolio.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger PDF
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Information */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Award className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">À propos des livrets d'apprentissage</h4>
              <p className="text-sm text-blue-700 mt-1">
                Vos livrets d'apprentissage documentent votre progression et l'acquisition de vos compétences 
                tout au long de votre formation. Ils sont remplis par vos formateurs et constituent un 
                document officiel attestant de votre parcours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

