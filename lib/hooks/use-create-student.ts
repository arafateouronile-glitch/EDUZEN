/**
 * Hook personnalisé pour créer un étudiant
 * Extrait la logique métier de la page de création d'étudiant
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'
import { studentSchema, type StudentFormData } from '@/lib/validations/schemas'
import { useToast } from '@/components/ui/toast'
import { useConversionTracking } from './use-page-analytics'

export function useCreateStudent() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const trackConversion = useConversionTracking()

  return useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (!user?.organization_id) {
        throw new Error('Organization ID manquant')
      }

      // 1. Créer le tuteur
      const { data: guardian, error: guardianError } = await supabase
        .from('guardians' as any)
        .insert({
          organization_id: user.organization_id,
          first_name: data.guardian_first_name,
          last_name: data.guardian_last_name,
          relationship: data.guardian_relationship,
          phone_primary: data.guardian_phone_primary,
          phone_secondary: data.guardian_phone_secondary || null,
          email: data.guardian_email || null,
          address: data.guardian_address || null,
        })
        .select()
        .single()

      if (guardianError) throw guardianError

      // 2. Générer un numéro étudiant unique
      const { data: organization } = await supabase
        .from('organizations')
        .select('code')
        .eq('id', user.organization_id)
        .single()

      const orgCode = organization?.code || 'EDUZEN'
      const year = new Date().getFullYear().toString().slice(-2)
      const prefix = `${orgCode}${year}`

      const { data: lastStudent } = await supabase
        .from('students')
        .select('student_number')
        .eq('organization_id', user.organization_id)
        .like('student_number', `${prefix}%`)
        .order('student_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      let sequence = 1
      if (lastStudent?.student_number) {
        const lastSequence = parseInt(lastStudent.student_number.slice(-4)) || 0
        sequence = lastSequence + 1
      }

      let studentNumber = `${prefix}${String(sequence).padStart(4, '0')}`

      // Double vérification
      const { data: existingCheck } = await supabase
        .from('students')
        .select('id')
        .eq('organization_id', user.organization_id)
        .eq('student_number', studentNumber)
        .maybeSingle()

      if (existingCheck) {
        let attempts = 0
        while (attempts < 100) {
          sequence++
          studentNumber = `${prefix}${String(sequence).padStart(4, '0')}`

          const { data: check } = await supabase
            .from('students')
            .select('id')
            .eq('organization_id', user.organization_id)
            .eq('student_number', studentNumber)
            .maybeSingle()

          if (!check) break
          attempts++
        }

        if (attempts >= 100) {
          throw new Error('Impossible de générer un numéro d\'élève unique. Veuillez réessayer.')
        }
      }

      // 3. Créer l'élève
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          organization_id: user.organization_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone: data.phone || null,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          address: data.address || null,
          student_number: studentNumber,
          status: 'active',
        })
        .select()
        .single()

      if (studentError) {
        if (studentError.code === '23505') {
          throw new Error(
            `Un élève avec le numéro "${studentNumber}" existe déjà dans votre organisation. Veuillez réessayer ou contacter le support.`
          )
        }
        throw new Error(
          studentError.message ||
          'Une erreur est survenue lors de la création de l\'élève'
        )
      }

      // 4. Lier le tuteur à l'élève
      const { error: linkError } = await supabase
        .from('student_guardians')
        .insert({
          student_id: student.id,
          guardian_id: (guardian as any).id,
          is_primary: true,
        })

      if (linkError) {
        throw new Error('Erreur lors de la liaison du tuteur à l\'élève')
      }

      // 5. Créer l'inscription si une session est sélectionnée
      if (data.class_id) {
        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .insert({
            student_id: student.id,
            session_id: data.class_id,
            enrollment_date: data.enrollment_date || new Date().toISOString(),
            status: 'confirmed',
            payment_status: 'pending',
          } as any)

        if (enrollmentError) {
          // Ne pas faire échouer la création de l'élève si l'inscription échoue
          console.warn('L\'élève a été créé mais l\'inscription à la session a échoué')
        }
      }

      return student
    },
    onSuccess: (student) => {
      // Invalider les queries pour rafraîchir les listes
      queryClient.invalidateQueries({ queryKey: ['students', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['student', student.id] })

      // Track conversion
      trackConversion('student_created', {
        student_id: student.id,
        has_guardian: true,
        class_id: student.class_id,
      })

      // Toast de succès
      addToast({
        type: 'success',
        title: 'Étudiant créé',
        description: `${student.first_name} ${student.last_name} a été créé avec succès.`,
      })

      // Redirection
      router.push(`/dashboard/students/${student.id}`)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de l\'élève.',
      })
    },
  })
}



