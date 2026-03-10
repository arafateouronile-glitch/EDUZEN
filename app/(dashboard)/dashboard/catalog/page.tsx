/**
 * Page d'administration - Gestion du catalogue public
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { publicCatalogService } from '@/lib/services/public-catalog.service'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { useToast } from '@/components/ui/toast'
import { Plus, Globe, Eye, Edit, CheckCircle, XCircle, ExternalLink, BookOpen, FileText, Users, Sparkles, Settings } from 'lucide-react'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

// Type pour un programme (aligné sur ce qui est affiché sur le catalogue public)
type ProgramCatalog = {
  id: string
  name: string
  code: string
  is_public?: boolean
  is_active?: boolean
  description?: string | null
  public_description?: string | null
  [key: string]: unknown
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

  // Programmes (ce qui est affiché sur le catalogue public /cataloguepublic et /programmes)
  const { data: programs, isLoading } = useQuery<ProgramCatalog[]>({
    queryKey: ['programs-catalog', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await programService.getAllPrograms(user.organization_id, { isActive: undefined })
      return (result || []) as ProgramCatalog[]
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

  const updateProgramPublicMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      return programService.updateProgram(id, { is_public: isPublic })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-catalog'] })
      addToast({
        title: 'Succès',
        description: 'Visibilité du programme mise à jour',
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

  const publicPrograms = programs?.filter((p) => p.is_public && p.is_active !== false) || []

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
          <p className="text-gray-600 mt-2">Gérez la visibilité de vos programmes sur le catalogue public</p>
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
          <Link href="/dashboard/catalog/settings">
            <Button variant="outline" className="border-brand-blue/20 hover:bg-brand-blue/5">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </Link>
          <Link href="/dashboard/programs/new">
            <Button className="bg-brand-blue hover:bg-brand-blue-dark shadow-lg shadow-brand-blue/20">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau programme
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Statistiques (alignées sur le catalogue public : programmes) */}
      <BentoGrid columns={4} gap="md">
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-brand-blue">{programs?.length ?? 0}</div>
                <div className="text-sm text-gray-600 mt-1">Total programmes</div>
              </div>
              <BookOpen className="w-8 h-8 text-brand-blue/30" />
            </div>
          </GlassCard>
        </BentoCard>
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-green-500/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{publicPrograms.length}</div>
                <div className="text-sm text-gray-600 mt-1">Sur le catalogue public</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/30" />
            </div>
          </GlassCard>
        </BentoCard>
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-gray-400/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-600">{programs?.filter((p) => !p.is_public).length ?? 0}</div>
                <div className="text-sm text-gray-600 mt-1">Non visibles (brouillons)</div>
              </div>
              <FileText className="w-8 h-8 text-gray-400/30" />
            </div>
          </GlassCard>
        </BentoCard>
        <BentoCard span={1}>
          <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-brand-cyan/10 transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-brand-cyan">{enrollments?.length ?? 0}</div>
                <div className="text-sm text-gray-600 mt-1">Inscriptions en attente</div>
              </div>
              <Users className="w-8 h-8 text-brand-cyan/30" />
            </div>
          </GlassCard>
        </BentoCard>
      </BentoGrid>

      {/* Programmes visibles sur le catalogue public */}
      {publicPrograms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand-blue" />
            <h2 className="text-xl font-bold">Programmes sur le catalogue public</h2>
          </div>
          <BentoGrid columns={3} gap="md">
            {publicPrograms.map((program) => (
              <BentoCard key={program.id} span={1}>
                <ProgramCard
                  program={program}
                  onTogglePublic={(isPublic) =>
                    updateProgramPublicMutation.mutate({ id: program.id, isPublic })
                  }
                />
              </BentoCard>
            ))}
          </BentoGrid>
        </motion.div>
      )}

      {/* Programmes non visibles (brouillons) */}
      {programs && programs.filter((p) => !p.is_public).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4 mt-8">
            <FileText className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl font-bold">Programmes non visibles sur le catalogue</h2>
          </div>
          <BentoGrid columns={3} gap="md">
            {programs.filter((p) => !p.is_public).map((program) => (
              <BentoCard key={program.id} span={1}>
                <ProgramCard
                  program={program}
                  onTogglePublic={(isPublic) =>
                    updateProgramPublicMutation.mutate({ id: program.id, isPublic })
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
      ) : programs && programs.length === 0 ? (
        <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-6 text-lg">Aucun programme. Créez des programmes dans la Bibliothèque puis affichez-les ici sur le catalogue public.</p>
          <Link href="/dashboard/programs">
            <Button className="bg-brand-blue hover:bg-brand-blue-dark shadow-lg shadow-brand-blue/20">
              <BookOpen className="w-4 h-4 mr-2" />
              Voir la Bibliothèque des programmes
            </Button>
          </Link>
        </GlassCard>
      ) : null}
    </div>
  )
}

interface ProgramCardProps {
  program: ProgramCatalog
  onTogglePublic: (isPublic: boolean) => void
}

function ProgramCard({ program, onTogglePublic }: ProgramCardProps) {
  return (
    <GlassCard 
      variant="premium" 
      className="p-6 h-full flex flex-col border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500"
    >
      <div className="flex-1">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg line-clamp-2 flex-1 pr-2">
            {program.name}
          </h3>
        </div>

        {program.code && (
          <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
            {program.code}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          {program.is_public ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Visible sur le catalogue</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Non visible</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Link href={`/programmes/${program.id}`} target="_blank" className="flex-1">
          <Button variant="outline" size="sm" className="w-full border-brand-blue/20 hover:bg-brand-blue/5">
            <Eye className="w-3 h-3 mr-1" />
            Voir sur le catalogue
          </Button>
        </Link>
        <Link href={`/dashboard/programs/${program.id}`}>
          <Button variant="outline" size="sm" className="border-brand-blue/20 hover:bg-brand-blue/5">
            <Edit className="w-3 h-3" />
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTogglePublic(!program.is_public)}
          className={cn(
            "border-brand-blue/20 hover:bg-brand-blue/5",
            program.is_public ? "hover:border-red-300" : "hover:border-green-300"
          )}
        >
          {program.is_public ? (
            <XCircle className="w-3 h-3 text-red-600" />
          ) : (
            <CheckCircle className="w-3 h-3 text-green-600" />
          )}
        </Button>
      </div>
    </GlassCard>
  )
}

