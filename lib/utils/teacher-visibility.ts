/**
 * Logique de visibilité du planning ("ces séances et leur planning") pour un
 * formateur — partagée entre le formulaire admin (config-intervenants.tsx) et
 * tous les points d'accès personnels de l'enseignant (dashboard, calendrier,
 * émargement) qui filtrent ses sessions via session_teachers.visibility_date.
 *
 * Par défaut (colonne NULL), le planning est visible immédiatement — miroir
 * exact de la fonction RLS is_session_teacher() côté base (visibility_date
 * IS NULL OR visibility_date <= now()).
 */
export function isVisibleNow(visibilityDate: string | null | undefined): boolean {
  if (!visibilityDate) return true
  return new Date(visibilityDate).getTime() <= Date.now()
}
