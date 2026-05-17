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
import { Noise } from '@/components/ui/Noise'
import { Preloader } from '@/components/ui/Preloader'

export const metadata: Metadata = {
  title: {
    default: "EduZen | Le Logiciel N°1 des Organismes de Formation en France",
    template: "%s | EduZen - Gestion Formation Professionnelle"
  },
  description: "Gagnez 10h/semaine sur l'administratif. EduZen automatise votre conformité Qualiopi, émargement numérique, facturation CPF et génération de documents. Conçu par des formateurs, pour des formateurs. Essai gratuit 14 jours.",
  keywords: [
    'logiciel organisme de formation',
    'logiciel gestion formation professionnelle',
    'conformité Qualiopi automatique',
    'émargement numérique formation',
    'signature électronique eIDAS',
    'facturation CPF EDOF',
    'logiciel formation professionnelle France',
    'gestion stagiaires formation',
    'attestation de formation automatique',
    'feuille de présence dématérialisée',
    'financement OPCO formation',
    'certification Qualiopi logiciel',
    'plateforme e-learning formation',
    'logiciel formateur indépendant',
    'gestion centre de formation'
  ],
  authors: [{ name: 'EduZen', url: 'https://eduzen.io' }],
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
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io',
    siteName: 'EduZen',
    title: "EduZen | Simplifiez la Gestion de Votre Organisme de Formation",
    description: "Fini les heures perdues sur l'administratif. Conformité Qualiopi automatique, émargement digital, facturation CPF en 1 clic. Rejoignez les formateurs qui ont choisi la sérénité.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EduZen - La plateforme tout-en-un pour les organismes de formation en France',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "EduZen | Le Logiciel qui Libère les Formateurs",
    description: "Conformité Qualiopi automatique, émargement numérique, facturation CPF. Gagnez 10h/semaine. Essai gratuit 14 jours.",
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
      <head suppressHydrationWarning>
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="shortcut icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EDUZEN" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* DNS prefetch pour améliorer les performances */}
        <link rel="dns-prefetch" href="https://*.supabase.co" />
        <link rel="dns-prefetch" href="https://*.sentry.io" />
        {/* Google Analytics 4 */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q2F5169TSG" nonce={nonce} suppressHydrationWarning />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-Q2F5169TSG');`
          }}
        />
        {/* Google Tag Manager */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-5L6NJZ5P');`
          }}
        />
        {/* Apollo website tracker — doit être dans <head> selon les instructions Apollo */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"69d0f88d36754e001939badf"})},document.head.appendChild(o)}initApollo();`
          }}
        />
        {/* Meta Pixel */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','977662918296647');fbq('track','PageView');`
          }}
        />
      </head>
      <body className={cn('smooth-scroll-premium relative selection:bg-brand-blue-pale/50 selection:text-brand-blue-darker')}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5L6NJZ5P" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
        </noscript>
        {/* Meta Pixel (noscript) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <noscript><img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=977662918296647&ev=PageView&noscript=1" alt="" /></noscript>
        <Preloader />
        <Noise />
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
