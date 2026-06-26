/**
 * Layout pour le portail auditeur public
 * Ne nécessite pas d'authentification - accès via token
 * Note: pas de <html>/<body> ici — le root layout (app/layout.tsx) les fournit déjà
 */

export const metadata = {
  title: 'Portail Auditeur - EDUZEN',
  description: 'Accès auditeur externe à la conformité Qualiopi',
  robots: 'noindex, nofollow',
}

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
