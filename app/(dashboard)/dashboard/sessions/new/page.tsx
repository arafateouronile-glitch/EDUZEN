'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { sessionService } from '@/lib/services/session.service.client'
import { programService } from '@/lib/services/program.service.client'
import { formationService } from '@/lib/services/formation.service.client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { LocationSelect } from '@/components/ui/location-select'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { AppError, ErrorCode } from '@/lib/errors'
import { PaywallModal } from '@/components/quota/paywall-modal'
import type { OrganizationUsage } from '@/lib/services/quota.service'

const sessionSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  start_date: z.string().min(1, 'La date de début est requise'),
  end_date: z.string().min(1, 'La date de fin est requise'),
  start_time: z.string().transform((val) => (val ? val : undefined)).optional(),
  end_time: z.string().transform((val) => (val ? val : undefined)).optional(),
  location: z.string().optional(),
  capacity_max: z.string().transform((val) => (val ? parseInt(val, 10) : undefined)).optional(),
  status: z.enum(['planned', 'ongoing', 'completed', 'cancelled']).default('planned'),
})

type SessionFormData = z.infer<typeof sessionSchema>

export default function NewSessionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [selectedFormations, setSelectedFormations] = useState<string[]>([])
  const [paywallUsage, setPaywallUsage] = useState<OrganizationUsage | null>(null)

  // Récupérer les programmes
  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await programService.getAllPrograms(user.organization_id, { isActive: true })
      return Array.isArray(result) ? result : result.data
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les formations
  const { data: formations } = useQuery({
    queryKey: ['formations', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await formationService.getAllFormations(user.organization_id, { isActive: true })
      return Array.isArray(result) ? result : result.data
    },
    enabled: !!user?.organization_id,
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      status: 'planned',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      if (!user?.organization_id) throw new Error('Organisation manquante')

      return sessionService.createIndependentSession(
        {
          ...data,
          capacity_max: data.capacity_max,
          organization_id: user.organization_id,
        },
        selectedPrograms,
        selectedFormations
      )
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Session créée',
        description: 'La session a été créée avec succès.',
      })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      router.push('/dashboard/sessions')
    },
    onError: (error: Error) => {
      if (error instanceof AppError && error.code === ErrorCode.QUOTA_EXCEEDED && error.context.usage) {
        setPaywallUsage(error.context.usage as OrganizationUsage)
        return
      }
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de la session',
      })
    },
  })

  const onSubmit = (data: SessionFormData) => {
    createMutation.mutate(data)
  }

  const programOptions = programs?.map(p => ({ label: p.name, value: p.id })) || []
  const formationOptions = formations?.map(f => ({ label: f.name, value: f.id })) || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-4xl mx-auto p-6"
    >
      <div className="flex items-center gap-4">
        <Link href="/dashboard/sessions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nouvelle session</h1>
          <p className="text-gray-500 mt-1">Créez une nouvelle session de formation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <GlassCard variant="premium" className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Informations générales</h2>
              
              <div>
                <Label htmlFor="name">Nom de la session *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Ex: Session Hiver 2024"
                  className={cn(errors.name && "border-red-500")}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Date de début *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register('start_date')}
                    className={cn(errors.start_date && "border-red-500")}
                  />
                  {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date.message}</p>}
                </div>
                <div>
                  <Label htmlFor="end_date">Date de fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...register('end_date')}
                    className={cn(errors.end_date && "border-red-500")}
                  />
                  {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Heure de début</Label>
                  <Input
                    id="start_time"
                    type="time"
                    {...register('start_time')}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">Heure de fin</Label>
                  <Input
                    id="end_time"
                    type="time"
                    {...register('end_time')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Lieu</Label>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <LocationSelect
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="capacity_max">Capacité maximale</Label>
                  <Input
                    id="capacity_max"
                    type="number"
                    min="1"
                    {...register('capacity_max')}
                    placeholder="Ex: 20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="planned">Planifiée</option>
                  <option value="ongoing">En cours</option>
                  <option value="completed">Terminée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>
            </div>

            {/* Associations pédagogiques */}
            <div className="space-y-4 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Associations pédagogiques</h2>
              
              <div>
                <Label className="mb-2 block">Programmes associés (Contenus)</Label>
                <MultiSelect
                  options={programOptions}
                  selected={selectedPrograms}
                  onChange={setSelectedPrograms}
                  placeholder="Sélectionner des programmes..."
                />
                <p className="text-xs text-gray-500 mt-1">Sélectionnez les programmes qui composent cette session.</p>
              </div>

              <div>
                <Label className="mb-2 block">Formations associées (Parcours)</Label>
                <MultiSelect
                  options={formationOptions}
                  selected={selectedFormations}
                  onChange={setSelectedFormations}
                  placeholder="Sélectionner des formations..."
                />
                <p className="text-xs text-gray-500 mt-1">Sélectionnez les formations auxquelles cette session appartient.</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/sessions">
            <Button variant="ghost" type="button">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white shadow-lg shadow-brand-blue/20"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Créer la session
              </>
            )}
          </Button>
        </div>
      </form>

      {paywallUsage && (
        <PaywallModal
          open={!!paywallUsage}
          onOpenChange={(open) => !open && setPaywallUsage(null)}
          usage={paywallUsage}
          actionType="session"
        />
      )}
    </motion.div>
  )
}





