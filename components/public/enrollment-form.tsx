'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { publicCatalogService } from '@/lib/services/public-catalog.service'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { Loader2 } from 'lucide-react'

type PublicFormation = TableRow<'public_formations'>

const enrollmentSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('FR'),
  candidate_notes: z.string().optional(),
  site_id: z.string().uuid().optional().nullable(),
})

type EnrollmentFormData = z.infer<typeof enrollmentSchema>

interface EnrollmentFormProps {
  formation: PublicFormation
  onSuccess?: () => void
  onCancel?: () => void
}

export function EnrollmentForm({ formation, onSuccess, onCancel }: EnrollmentFormProps) {
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      country: 'FR',
    },
  })

  const onSubmit = async (data: EnrollmentFormData) => {
    setIsSubmitting(true)

    try {
      await publicCatalogService.createEnrollment({
        organization_id: formation.organization_id,
        public_formation_id: formation.id,
        site_id: data.site_id || null,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country,
        candidate_notes: data.candidate_notes || null,
        status: 'pending',
      })

      addToast({
        title: 'Inscription réussie',
        description: 'Votre demande d\'inscription a été envoyée. Un responsable vous contactera prochainement.',
        type: 'success',
      })

      reset()
      onSuccess?.()
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error)
      addToast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Informations personnelles */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">
            Prénom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="first_name"
            {...register('first_name')}
            placeholder="Jean"
            disabled={isSubmitting}
          />
          {errors.first_name && (
            <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="last_name">
            Nom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="last_name"
            {...register('last_name')}
            placeholder="Dupont"
            disabled={isSubmitting}
          />
          {errors.last_name && (
            <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="jean.dupont@example.com"
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          placeholder="+33 6 12 34 56 78"
          disabled={isSubmitting}
        />
        {errors.phone && (
          <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
        )}
      </div>

      {/* Adresse */}
      <div>
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          {...register('address')}
          placeholder="123 rue de la République"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="postal_code">Code postal</Label>
          <Input
            id="postal_code"
            {...register('postal_code')}
            placeholder="75001"
            disabled={isSubmitting}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            {...register('city')}
            placeholder="Paris"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="candidate_notes">Message (optionnel)</Label>
        <Textarea
          id="candidate_notes"
          {...register('candidate_notes')}
          placeholder="Informations complémentaires, questions..."
          rows={4}
          disabled={isSubmitting}
        />
      </div>

      {/* Boutons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-blue hover:bg-brand-blue-dark"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer l'inscription"
          )}
        </Button>
      </div>
    </form>
  )
}



