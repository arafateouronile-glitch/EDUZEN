/**
 * Logique de statut d'expiration partagée pour les documents formateurs
 * (remplace les copies dupliquées dans settings/teachers et teacher/documents).
 */

export type ExpiryStatus = 'expired' | 'soon' | 'warning' | 'ok'
export type ComplianceStatus = 'missing' | 'expired' | 'expiring_soon' | 'ok'

export function expiryStatus(expiryDate: string | null | undefined): ExpiryStatus | null {
  if (!expiryDate) return null
  const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return 'expired'
  if (days < 30) return 'soon'
  if (days < 90) return 'warning'
  return 'ok'
}

/** Date d'expiration calculée pour un document sans expiry_date explicite mais dont
 * le type requiert un renouvellement périodique (ex: Kbis tous les 3 mois). */
export function computeRenewalExpiry(uploadedAt: string, renewalMonths: number | null): string | null {
  if (!renewalMonths) return null
  const d = new Date(uploadedAt)
  d.setMonth(d.getMonth() + renewalMonths)
  return d.toISOString().split('T')[0]
}

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  missing: 'Manquant',
  expired: 'Expiré',
  expiring_soon: 'Expire bientôt',
  ok: 'À jour',
}
