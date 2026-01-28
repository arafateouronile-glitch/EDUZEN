'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { learningPortfolioService } from '@/lib/services/learning-portfolio.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  FileText, Plus, Search, Edit, Trash2, Copy, 
  MoreVertical, CheckCircle2, ArrowLeft, Eye
} from 'lucide-react'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { formatDate } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function PortfolioTemplatesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')

  // Récupérer les templates (organisation + modèles système)
  const { data: templates, isLoading } = useQuery({
    queryKey: ['portfolio-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      try {
        // Récupérer les templates de l'organisation ET les modèles système (organization_id IS NULL)
        const { data, error } = await supabase
          .from('learning_portfolio_templates')
          .select('*')
          .or(`organization_id.eq.${user.organization_id},organization_id.is.null`)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
        
        if (error) {
          // Si erreur de relation, essayer sans jointure
          const errorStatus = (error as any).status;
          if (error.code === 'PGRST116' || error.message?.includes('relationship') || error.message?.includes('Could not find') || errorStatus === 400) {
            const { data: simpleData, error: simpleError } = await supabase
              .from('learning_portfolio_templates')
              .select('*')
              .or(`organization_id.eq.${user.organization_id},organization_id.is.null`)
              .order('is_default', { ascending: false })
              .order('created_at', { ascending: false })
            
            if (simpleError) {
              if (simpleError.code === 'PGRST116' || simpleError.message?.includes('does not exist')) {
                logger.debug('Table learning_portfolio_templates n\'existe pas encore')
                return []
              }
              throw simpleError
            }
            
            // Récupérer les formations séparément si nécessaire
            const templatesWithFormations = await Promise.all(
              (simpleData || []).map(async (template: any) => {
                if (template.formation_id) {
                  const { data: formationData } = await supabase
                    .from('formations')
                    .select('id, name')
                    .eq('id', template.formation_id)
                    .single()
                  
                  return { ...template, formation: formationData || null }
                }
                return template
              })
            )
            
            return templatesWithFormations
          }
          
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            logger.debug('Table learning_portfolio_templates n\'existe pas encore')
            return []
          }
          throw error
        }
        return data || []
      } catch (error: any) {
        if (error?.code === 'PGRST116' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
          logger.debug('Table learning_portfolio_templates n\'existe pas encore')
          return []
        }
        logger.error('Erreur:', error)
        return []
      }
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour supprimer un template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('learning_portfolio_templates') as any)
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-templates'] })
      addToast({ type: 'success', title: 'Modèle supprimé', description: 'Le modèle a été supprimé avec succès.' })
    },
    onError: () => {
      addToast({ type: 'error', title: 'Erreur', description: 'Impossible de supprimer le modèle.' })
    },
  })

  // Mutation pour dupliquer un template
  const duplicateMutation = useMutation({
    mutationFn: async (template: any) => {
      const { data, error } = await (supabase
        .from('learning_portfolio_templates') as any)
        .insert({
          organization_id: template.organization_id,
          name: `${template.name} (copie)`,
          description: template.description,
          template_structure: template.template_structure,
          primary_color: template.primary_color,
          secondary_color: template.secondary_color,
          created_by: user?.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-templates'] })
      addToast({ type: 'success', title: 'Modèle dupliqué', description: 'Le modèle a été dupliqué avec succès.' })
    },
    onError: () => {
      addToast({ type: 'error', title: 'Erreur', description: 'Impossible de dupliquer le modèle.' })
    },
  })

  const filteredTemplates = templates?.filter((t: any) => 
    t.is_active && (
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-brand-blue" />
              Modèles de livrets
            </h1>
            <p className="text-gray-600">
              Créez et gérez vos modèles de livrets d'apprentissage personnalisables
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Link href="/dashboard/evaluations/portfolios/templates/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau modèle
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Liste des templates */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun modèle de livret
            </h3>
            <p className="text-gray-600 mb-6">
              Créez votre premier modèle de livret d'apprentissage pour commencer.
            </p>
            <Link href="/dashboard/evaluations/portfolios/templates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer un modèle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates?.map((template: any, index: number) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${template.primary_color}20` }}
                    >
                      <FileText className="h-6 w-6" style={{ color: template.primary_color }} />
                    </div>
                    <div className="flex items-center gap-1">
                      {template.is_default && (
                        <Badge variant="secondary">Par défaut</Badge>
                      )}
                      <Badge variant="outline">v{template.version}</Badge>
                    </div>
                  </div>
                  <CardTitle className="mt-3">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Sections</span>
                      <span className="font-medium">{template.template_structure?.length || 0}</span>
                    </div>
                    {template.formation && (
                      <div className="flex items-center justify-between">
                        <span>Formation</span>
                        <span className="font-medium truncate max-w-[150px]">{template.formation.name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Créé le</span>
                      <span className="font-medium">{formatDate(template.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Link href={`/dashboard/evaluations/portfolios/templates/${template.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => duplicateMutation.mutate(template)}
                      disabled={duplicateMutation.isPending}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
                          deleteMutation.mutate(template.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

