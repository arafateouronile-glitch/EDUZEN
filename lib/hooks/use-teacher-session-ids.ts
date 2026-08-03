'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * IDs des sessions assignées à l'enseignant connecté (via session_teachers,
 * avec repli sur sessions.teacher_id si session_teachers n'est pas encore
 * synchronisé). `undefined` tant que non chargé, `[]` si aucune session.
 */
export function useTeacherSessionIds() {
  const { user } = useAuth()
  const supabase = createClient()
  const isTeacher = user?.role === 'teacher'

  const query = useQuery({
    queryKey: ['teacher-session-ids', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return []

      const { data: sessionTeachers, error: sessionTeachersError } = await supabase
        .from('session_teachers')
        .select('session_id')
        .eq('teacher_id', user.id)

      if (sessionTeachersError) {
        logger.error('useTeacherSessionIds - Erreur récupération session_teachers', sanitizeError(sessionTeachersError))
      }

      if (sessionTeachers && sessionTeachers.length > 0) {
        return sessionTeachers
          .map((st: { session_id: string | null }) => st.session_id)
          .filter((id): id is string => id != null)
      }

      // Fallback : session_teachers pas encore synchronisé
      const { data: sessionsByTeacherId, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('teacher_id', user.id)

      if (sessionsError) {
        logger.error('useTeacherSessionIds - Erreur récupération sessions via teacher_id', sanitizeError(sessionsError))
        return []
      }

      return (sessionsByTeacherId || []).map((s: { id: string }) => s.id)
    },
    enabled: !!user?.id && isTeacher,
  })

  return { isTeacher, teacherSessionIds: query.data, isLoading: query.isLoading }
}
