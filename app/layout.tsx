import type { Metadata } from 'next'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/inter/900.css'
import '@fontsource/space-grotesk/300.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
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
    default: "eduzen - Gestion Scolaire pour l'Afrique",
    template: "%s | eduzen"
  },
  description: "Solution SaaS complète pour digitaliser la gestion des établissements d'enseignement africains. Gestion des étudiants, paiements, formations et bien plus.",
  keywords: ['gestion scolaire', 'afrique', 'éducation', 'saas', 'mobile money', 'école', 'université', 'formation'],
  authors: [{ name: 'eduzen' }],
  creator: 'eduzen',
  publisher: 'eduzen',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  ...(process.env.NEXT_PUBLIC_APP_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) } : {}),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
    siteName: 'eduzen',
    title: "eduzen - Gestion Scolaire pour l'Afrique",
    description: "Solution SaaS complète pour digitaliser la gestion des établissements d'enseignement africains",
    images: [
      {
        url: '/og-image.svg', // Utilise og-image.svg (1200x630px), peut être remplacé par og-image.jpg
        width: 1200,
        height: 630,
        alt: 'eduzen - Gestion Scolaire pour l\'Afrique',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "eduzen - Gestion Scolaire pour l'Afrique",
    description: "Solution SaaS complète pour digitaliser la gestion des établissements d'enseignement africains",
    images: ['/og-image.svg'], // Utilise og-image.svg, peut être remplacé par og-image.jpg
    creator: '@eduzen', // À mettre à jour avec votre compte Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // À ajouter quand vous aurez les codes de vérification
    // google: 'votre-code-google',
    // yandex: 'votre-code-yandex',
    // yahoo: 'votre-code-yahoo',
  },
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
    <html lang={locale} className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
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
        {/* Note: Polices chargées localement via @fontsource (pas de fetch au build) */}
      </head>
      <body className={cn('smooth-scroll-premium')}>
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
