/**
 * Page d'administration - Gestion du catalogue public
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { publicCatalogService } from '@/lib/services/public-catalog.service'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { useToast } from '@/components/ui/toast'
import { Plus, Globe, Eye, Edit, Trash2, CheckCircle, XCircle, Mail, ExternalLink, BookOpen, FileText, Users, Sparkles } from 'lucide-react'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import type { TableRow } from '@/lib/types/supabase-helpers'

// Type pour les formations publiques (catalogue)
type PublicFormation = {
  id: string
  formation_id?: string
  is_published?: boolean
  is_public?: boolean
  published_at?: string
  public_title?: string
  is_featured?: boolean
  [key: string]: any
}

export default function CatalogPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <CatalogPageContent />
    </RoleGuard>
  )
}

function CatalogPageContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const supabase = createClient()

  // Récupérer le code de l'organisation pour le lien public
  const { data: organization } = useQuery<{ id: string; code: string | null } | null>({
    queryKey: ['organization-code', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('id, code')
        .eq('id', user.organization_id)
        .maybeSingle()
      if (error) throw error
      return data as { id: string; code: string | null } | null
    },
    enabled: !!user?.organization_id,
  })

  const { data: formations, isLoading } = useQuery<PublicFormation[]>({
    queryKey: ['public-formations', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await publicCatalogService.getAll(user.organization_id)
      return result as unknown as PublicFormation[]
    },
    enabled: !!user?.organization_id,
  })

  const { data: enrollments } = useQuery({
    queryKey: ['public-enrollments', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return publicCatalogService.getEnrollments(user.organization_id, { status: 'pending' })
    },
    enabled: !!user?.organization_id,
  })

  const publishMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      return publicCatalogService.update(id, { is_public: isPublic })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-formations'] })
      addToast({
        title: 'Succès',
        description: 'Formation mise à jour avec succès',
        type: 'success',
      })
    },
  })

  if (!user?.organization_id) {
    return (
      <div className="p-6">
        <p>Aucune organisation</p>
      </div>
    )
  }

  const publicFormations = formations?.filter((f) => f.is_public) || []
  const draftFormations = formations?.filter((f) => !f.is_public) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
            Catalogue Public
          </h1>
          <p className="text-gray-600 mt-2">Gérez vos formations publiques et inscriptions en ligne</p>
        </div>
        <div className="flex gap-3">
          {organization && (
            <Link href={`/cataloguepublic/${organization.code || organization.id}`} target="_blank">
              <Button variant="outline" className="border-brand-blue/20 hover:bg-brand-blue/5">
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir le site public
              </Button>
            </Link>
          )}
          <Button className="bg-brand-blue hover:bg-brand-blue-dark shadow-lg shadow-brand-blue/20">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle formation
          </Button>
        </div>
      </motion.div>

      {/* Statistiques */}
      <BentoGrid columns={4} gap="md">
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-brand-blue">{formations?.length || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Total formations</div>
              </div>
              <BookOpen className="w-8 h-8 text-brand-blue/30" />
            </div>
          </GlassCard>
        </BentoCard>
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-green-500/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{publicFormations.length}</div>
                <div className="text-sm text-gray-600 mt-1">Publiées</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/30" />
            </div>
          </GlassCard>
        </BentoCard>
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-gray-400/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-600">{draftFormations.length}</div>
                <div className="text-sm text-gray-600 mt-1">Brouillons</div>
              </div>
              <FileText className="w-8 h-8 text-gray-400/30" />
            </div>
          </GlassCard>
        </BentoCard>
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-brand-cyan/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-brand-cyan">{enrollments?.length || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Inscriptions en attente</div>
              </div>
              <Users className="w-8 h-8 text-brand-cyan/30" />
            </div>
          </GlassCard>
        </BentoCard>
      </BentoGrid>

      {/* Formations publiées */}
      {publicFormations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand-blue" />
            <h2 className="text-xl font-bold">Formations publiées</h2>
          </div>
          <BentoGrid columns={3} gap="md">
            {publicFormations.map((formation) => (
              <BentoCard key={formation.id} span={1}>
                <FormationCard
                  formation={formation}
                  onTogglePublish={(isPublic) =>
                    publishMutation.mutate({ id: formation.id, isPublic })
                  }
                />
              </BentoCard>
            ))}
          </BentoGrid>
        </motion.div>
      )}

      {/* Brouillons */}
      {draftFormations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4 mt-8">
            <FileText className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl font-bold">Brouillons</h2>
          </div>
          <BentoGrid columns={3} gap="md">
            {draftFormations.map((formation) => (
              <BentoCard key={formation.id} span={1}>
                <FormationCard
                  formation={formation}
                  onTogglePublish={(isPublic) =>
                    publishMutation.mutate({ id: formation.id, isPublic })
                  }
                />
              </BentoCard>
            ))}
          </BentoGrid>
        </motion.div>
      )}

      {isLoading ? (
        <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
          <div className="animate-pulse">Chargement...</div>
        </GlassCard>
      ) : formations && formations.length === 0 ? (
        <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-6 text-lg">Aucune formation dans le catalogue</p>
          <Button className="bg-brand-blue hover:bg-brand-blue-dark shadow-lg shadow-brand-blue/20">
            <Plus className="w-4 h-4 mr-2" />
            Créer la première formation
          </Button>
        </GlassCard>
      ) : null}
    </div>
  )
}

interface FormationCardProps {
  formation: PublicFormation
  onTogglePublish: (isPublic: boolean) => void
}

function FormationCard({ formation, onTogglePublish }: FormationCardProps) {
  return (
    <GlassCard 
      variant="premium" 
      className="p-6 h-full flex flex-col border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500"
    >
      <div className="flex-1">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg line-clamp-2 flex-1 pr-2">
            {formation.public_title}
          </h3>
        </div>
        
        {formation.is_featured && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 rounded-full mb-3 border border-yellow-200">
            <Sparkles className="w-3 h-3" />
            Mise en avant
          </span>
        )}

        <div className="flex items-center gap-2 mb-3">
          {formation.is_public ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Publiée</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Brouillon</span>
            </>
          )}
        </div>

        {formation.slug && (
          <div className="text-xs text-gray-500 mb-4 font-mono bg-gray-50 px-2 py-1 rounded">
            /formations/{formation.slug}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Link href={`/formations/${formation.slug || formation.id}`} target="_blank" className="flex-1">
          <Button variant="outline" size="sm" className="w-full border-brand-blue/20 hover:bg-brand-blue/5">
            <Eye className="w-3 h-3 mr-1" />
            Voir
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="border-brand-blue/20 hover:bg-brand-blue/5">
          <Edit className="w-3 h-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTogglePublish(!formation.is_public)}
          className={cn(
            "border-brand-blue/20 hover:bg-brand-blue/5",
            formation.is_public ? "hover:border-red-300" : "hover:border-green-300"
          )}
        >
          {formation.is_public ? (
            <XCircle className="w-3 h-3 text-red-600" />
          ) : (
            <CheckCircle className="w-3 h-3 text-green-600" />
          )}
        </Button>
      </div>
    </GlassCard>
  )
}

