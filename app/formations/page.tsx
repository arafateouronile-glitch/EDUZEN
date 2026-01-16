/**
 * Page publique - Catalogue des formations (REDIRIGE VERS /programmes)
 * Route: /formations
 * Redirige vers /programmes pour le nouveau système basé sur les programmes
 */

import { redirect } from 'next/navigation'

export default function FormationsPage() {
  // Rediriger vers /programmes
  redirect('/programmes')
}

