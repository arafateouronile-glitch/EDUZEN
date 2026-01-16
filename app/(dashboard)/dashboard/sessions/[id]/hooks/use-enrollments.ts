'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import type { EnrollmentFormData } from './use-session-detail'

export function useEnrollments(sessionId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentFormData>({
    student_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'confirmed',
    payment_status: 'pending',
    total_amount: '',
    paid_amount: '0',
  })

  const createEnrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!enrollmentForm.student_id) {
        throw new Error('Élève requis')
      }

      // Vérifier si l'inscription existe déjà
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', enrollmentForm.student_id)
        .maybeSingle()

      if (existing) {
        throw new Error('Cet élève est déjà inscrit à cette session')
      }

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          student_id: enrollmentForm.student_id,
          session_id: sessionId,
          enrollment_date: enrollmentForm.enrollment_date,
          status: enrollmentForm.status,
          payment_status: enrollmentForm.payment_status,
          total_amount: parseFloat(enrollmentForm.total_amount) || 0,
          paid_amount: parseFloat(enrollmentForm.paid_amount) || 0,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Cet élève est déjà inscrit à cette session')
        }
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionId] })
      addToast({
        type: 'success',
        title: 'Inscription créée',
        description: 'L\'apprenant a été inscrit avec succès à la session.',
      })
      setEnrollmentForm({
        student_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        payment_status: 'pending',
        total_amount: '',
        paid_amount: '0',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création de l\'inscription.',
      })
    },
  })

  return {
    enrollmentForm,
    setEnrollmentForm,
    createEnrollmentMutation,
  }
}

