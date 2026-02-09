import type { Metadata } from 'next'
// Fonts optimisés: seulement les weights essentiels (~50KB économisés)
import '@fontsource/inter/400.css'  // Regular - corps de texte
import '@fontsource/inter/500.css'  // Medium - labels, boutons
import '@fontsource/inter/600.css'  // Semibold - sous-titres
import '@fontsource/inter/700.css'  // Bold - titres
import '@fontsource/space-grotesk/500.css'  // Display font - titres principaux
import '@fontsource/space-grotesk/700.css'  // Display font bold
import './globals.css'
import { Providers } from './providers'
import { cn } from '@/lib/utils'
import { AnalyticsLoader } from '@/components/analytics/analytics-loader'
// Réactiver next-intl pour que les composants puissent utiliser useTranslations
import { NextIntlClientProvider } from 'next-intl'
import { headers } from 'next/headers'
import { CSP_NONCE_HEADER } from '@/lib/utils/csp'
import { NonceProvider } from '@/lib/contexts/nonce-context'

export const metadata: Metadata = {
  title: {
    default: "EduZen - Logiciel de Gestion pour Organismes de Formation | Qualiopi & CPF",
    template: "%s | EduZen"
  },
  description: "Simplifiez la gestion de votre organisme de formation avec EduZen. Conformité Qualiopi automatique, émargement numérique, facturation CPF, signature électronique eIDAS. Essai gratuit 14 jours.",
  keywords: [
    'logiciel organisme de formation',
    'gestion formation professionnelle',
    'conformité Qualiopi',
    'émargement numérique',
    'signature électronique eIDAS',
    'facturation CPF',
    'logiciel formation',
    'gestion stagiaires',
    'attestation de formation',
    'feuille de présence dématérialisée',
    'OPCO',
    'certification Qualiopi',
    'e-learning',
    'plateforme formation'
  ],
  authors: [{ name: 'EduZen' }],
  creator: 'EduZen',
  publisher: 'EduZen',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  ...(process.env.NEXT_PUBLIC_APP_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) } : {}),
  alternates: {
    canonical: '/',
    languages: {
      'fr-FR': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.app',
    siteName: 'EduZen',
    title: "EduZen - Logiciel de Gestion pour Organismes de Formation",
    description: "Simplifiez la gestion de votre organisme de formation. Conformité Qualiopi automatique, émargement numérique, facturation CPF. Essai gratuit 14 jours.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EduZen - Plateforme de gestion pour organismes de formation',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "EduZen - Gérez votre organisme de formation avec simplicité",
    description: "Conformité Qualiopi automatique, émargement numérique, facturation CPF. Essai gratuit 14 jours.",
    images: ['/og-image.png'],
    creator: '@eduzen_app',
    site: '@eduzen_app',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Ajouter votre code Google Search Console ici
    // google: 'votre-code-google-search-console',
  },
  category: 'technology',
  classification: 'Business Software',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Charger les messages pour next-intl
  const locale = 'fr'
  let messages = {}

  try {
    // Charger les messages de la locale par défaut
    messages = (await import(`../messages/fr.json`)).default
  } catch (error) {
    // En cas d'erreur, utiliser des messages vides (pas de log pour éviter spam)
    messages = {}
  }

  // Récupérer le nonce CSP depuis les headers (généré par le middleware)
  const headersList = await headers()
  const nonce = headersList.get(CSP_NONCE_HEADER) || undefined

  return (
    <html lang={locale} className="scroll-smooth relative" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="shortcut icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EDUZEN" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* DNS prefetch pour améliorer les performances */}
        <link rel="dns-prefetch" href="https://*.supabase.co" />
        <link rel="dns-prefetch" href="https://*.sentry.io" />
        {/* Preload fonts critiques pour améliorer LCP */}
        {/* Note: Les polices sont chargées via @fontsource, les preloads sont optionnels */}
        {/* Les chemins exacts seront générés au build par Next.js */}
      </head>
      <body className={cn('smooth-scroll-premium relative')}>
        <NonceProvider nonce={nonce}>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              {children}
              <AnalyticsLoader />
            </Providers>
          </NextIntlClientProvider>
        </NonceProvider>
      </body>
    </html>
  )
}
