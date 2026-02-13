import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/dashboard/',      // Zone privée admin
          '/portal/',         // Portail formateur
          '/learner/',        // Espace apprenant
          '/api/',            // API endpoints
          '/auth/callback',   // OAuth callbacks
          '/auth/reset-password', // Réinitialisation mot de passe
          '/_next/',          // Assets Next.js
          '/.well-known/',    // Configuration
          '/admin/',          // Zone admin
          '/*.json$',         // Fichiers JSON sensibles
        ],
      },
      // Autoriser Googlebot à tout indexer (sauf zones privées)
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/blog/',
          '/auth/login',
          '/auth/register',
        ],
        disallow: [
          '/dashboard/',
          '/portal/',
          '/learner/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
