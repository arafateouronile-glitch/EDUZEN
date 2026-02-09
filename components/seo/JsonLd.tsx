'use client'

import Script from 'next/script'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.app'

// Données structurées pour l'organisation
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'EduZen',
  url: baseUrl,
  logo: `${baseUrl}/logo.png`,
  description: 'Plateforme de gestion pour organismes de formation. Conformité Qualiopi, émargement numérique, facturation CPF.',
  foundingDate: '2024',
  sameAs: [
    'https://twitter.com/eduzen_app',
    'https://www.linkedin.com/company/eduzen',
    'https://www.facebook.com/eduzen',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+33-1-XX-XX-XX-XX',
    contactType: 'customer service',
    availableLanguage: ['French'],
    areaServed: 'FR',
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'FR',
  },
}

// Données structurées pour le produit SaaS
const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'EduZen',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: baseUrl,
  description: 'Logiciel de gestion pour organismes de formation. Simplifiez votre conformité Qualiopi, gérez vos émargements numériques et votre facturation CPF.',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '39',
    highPrice: '349',
    priceCurrency: 'EUR',
    offerCount: 3,
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '39',
        priceCurrency: 'EUR',
        priceValidUntil: '2025-12-31',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/#tarifs`,
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '84',
        priceCurrency: 'EUR',
        priceValidUntil: '2025-12-31',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/#tarifs`,
      },
      {
        '@type': 'Offer',
        name: 'Enterprise',
        price: '349',
        priceCurrency: 'EUR',
        priceValidUntil: '2025-12-31',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/#tarifs`,
      },
    ],
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '12',
    bestRating: '5',
    worstRating: '1',
  },
  featureList: [
    'Conformité Qualiopi automatique',
    'Émargement numérique QR Code',
    'Signature électronique eIDAS',
    'Facturation CPF intégrée',
    'Gestion des formations',
    'Portail e-learning',
    'Génération de documents automatique',
    'Dashboard analytics',
  ],
}

// Données structurées pour la page web
const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'EduZen - Logiciel de Gestion pour Organismes de Formation',
  description: 'Simplifiez la gestion de votre organisme de formation avec EduZen. Conformité Qualiopi automatique, émargement numérique, facturation CPF.',
  url: baseUrl,
  inLanguage: 'fr-FR',
  isPartOf: {
    '@type': 'WebSite',
    name: 'EduZen',
    url: baseUrl,
  },
  about: {
    '@type': 'Thing',
    name: 'Gestion des organismes de formation',
  },
  mainEntity: softwareSchema,
}

// FAQ Schema pour les rich snippets FAQ
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'EduZen est-il conforme avec les normes Qualiopi et Datadock ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui, EduZen génère automatiquement tous les documents nécessaires à la conformité Qualiopi (contrats de formation, feuilles de présence, évaluations, etc.) et est compatible avec les exigences Datadock pour la certification.',
      },
    },
    {
      '@type': 'Question',
      name: 'Comment fonctionne l\'intégration avec le CPF ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'EduZen s\'intègre avec les plateformes CPF pour générer automatiquement les factures et gérer les subrogations de paiement. Les stagiaires peuvent consulter leurs formations directement depuis leur espace CPF.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mes données sont-elles conformes au RGPD ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolument. EduZen est entièrement conforme au RGPD. Vos données sont hébergées en Europe, cryptées de bout en bout, et vous gardez le contrôle total. Nous réalisons des sauvegardes quotidiennes automatiques.',
      },
    },
    {
      '@type': 'Question',
      name: 'Y a-t-il une période d\'engagement ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Non, tous nos plans sont sans engagement. Vous pouvez annuler votre abonnement à tout moment sans frais cachés. Nous proposons également un essai gratuit de 14 jours pour tester la plateforme.',
      },
    },
  ],
}

// Breadcrumb schema
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Accueil',
      item: baseUrl,
    },
  ],
}

export function JsonLd() {
  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        strategy="afterInteractive"
      />
      <Script
        id="software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        strategy="afterInteractive"
      />
      <Script
        id="webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
        strategy="afterInteractive"
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        strategy="afterInteractive"
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        strategy="afterInteractive"
      />
    </>
  )
}
