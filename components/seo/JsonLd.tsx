'use client'

import Script from 'next/script'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io'

// Données structurées pour l'organisation
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'EduZen',
  url: baseUrl,
  logo: `${baseUrl}/logo.png`,
  description: 'EduZen est le logiciel de gestion n°1 pour les organismes de formation en France. Conçu par des formateurs, pour des formateurs. Conformité Qualiopi automatique, émargement numérique, facturation CPF.',
  foundingDate: '2024',
  slogan: 'Libérez-vous de l\'administratif, concentrez-vous sur la formation',
  sameAs: [
    'https://twitter.com/eduzen_app',
    'https://www.linkedin.com/company/eduzen-app',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@eduzen.io',
    contactType: 'customer service',
    availableLanguage: ['French'],
    areaServed: 'FR',
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'FR',
  },
  knowsAbout: [
    'Gestion des organismes de formation',
    'Conformité Qualiopi',
    'Formation professionnelle continue',
    'Financement CPF et OPCO',
  ],
}

// Données structurées pour le produit SaaS
const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'EduZen',
  alternateName: 'EduZen - Logiciel Organisme de Formation',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Training Management Software',
  operatingSystem: 'Web',
  url: baseUrl,
  description: 'Le logiciel tout-en-un pour les organismes de formation en France. Gagnez 10h/semaine : conformité Qualiopi automatique, émargement numérique par QR Code, facturation CPF/OPCO, signature électronique eIDAS. Créé par des formateurs.',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '39',
    highPrice: '349',
    priceCurrency: 'EUR',
    offerCount: 3,
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter - Formateurs indépendants',
        description: 'Idéal pour les formateurs indépendants et petits organismes',
        price: '39',
        priceCurrency: 'EUR',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/#tarifs`,
      },
      {
        '@type': 'Offer',
        name: 'Pro - Organismes en croissance',
        description: 'Pour les organismes de formation en développement',
        price: '84',
        priceCurrency: 'EUR',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/#tarifs`,
      },
      {
        '@type': 'Offer',
        name: 'Enterprise - Grands centres',
        description: 'Solution complète pour les grands centres de formation',
        price: '349',
        priceCurrency: 'EUR',
        priceValidUntil: '2026-12-31',
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
    'Conformité Qualiopi 100% automatique',
    'Émargement numérique par QR Code',
    'Signature électronique certifiée eIDAS',
    'Facturation CPF et OPCO intégrée',
    'Gestion complète des formations',
    'Portail e-learning intégré',
    'Génération automatique de tous les documents',
    'Tableau de bord et analytics en temps réel',
    'Suivi des stagiaires et des évaluations',
    'Export comptable automatisé',
  ],
  screenshot: `${baseUrl}/og-image.png`,
  softwareHelp: {
    '@type': 'CreativeWork',
    url: `${baseUrl}/aide`,
  },
}

// Données structurées pour la page web
const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'EduZen | Le Logiciel N°1 des Organismes de Formation en France',
  description: 'Gagnez 10h/semaine sur l\'administratif. EduZen automatise votre conformité Qualiopi, émargement numérique, facturation CPF. Conçu par des formateurs, pour des formateurs.',
  url: baseUrl,
  inLanguage: 'fr-FR',
  isPartOf: {
    '@type': 'WebSite',
    name: 'EduZen - Gestion Formation Professionnelle',
    url: baseUrl,
    description: 'Plateforme de gestion tout-en-un pour les organismes de formation professionnelle en France',
  },
  about: {
    '@type': 'Thing',
    name: 'Logiciel de gestion pour organismes de formation professionnelle',
    description: 'Solution SaaS complète pour digitaliser et automatiser la gestion des centres de formation en France',
  },
  mainEntity: softwareSchema,
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.hero-description'],
  },
  specialty: 'Formation professionnelle continue en France',
}

// FAQ Schema pour les rich snippets FAQ
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Quel est le meilleur logiciel pour gérer un organisme de formation en France ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'EduZen est le logiciel de référence pour les organismes de formation en France. Conçu par des professionnels de la formation, il automatise la conformité Qualiopi, l\'émargement numérique, la facturation CPF/OPCO et la génération de documents. Les utilisateurs gagnent en moyenne 10h/semaine sur l\'administratif.',
      },
    },
    {
      '@type': 'Question',
      name: 'EduZen permet-il de passer l\'audit Qualiopi facilement ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui, EduZen génère automatiquement 100% des documents exigés par Qualiopi : contrats de formation, conventions, feuilles de présence signées électroniquement, évaluations à chaud et à froid, attestations. Votre taux de conformité est suivi en temps réel dans le tableau de bord.',
      },
    },
    {
      '@type': 'Question',
      name: 'Comment fonctionne la facturation CPF et OPCO avec EduZen ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'EduZen s\'intègre avec Mon Compte Formation (CPF) et les OPCO pour générer automatiquement les factures conformes, gérer les subrogations de paiement et suivre les encaissements. Vous pouvez facturer en 1 clic et exporter vers votre comptabilité.',
      },
    },
    {
      '@type': 'Question',
      name: 'EduZen est-il adapté aux formateurs indépendants ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolument. EduZen propose une offre Starter à 39€/mois spécialement conçue pour les formateurs indépendants. Elle inclut la gestion illimitée des formations, l\'émargement numérique, la génération de documents et la conformité Qualiopi. Sans engagement.',
      },
    },
    {
      '@type': 'Question',
      name: 'Les données sont-elles sécurisées et conformes au RGPD ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'EduZen est 100% conforme au RGPD. Vos données sont hébergées en France sur des serveurs sécurisés, chiffrées de bout en bout avec des sauvegardes quotidiennes automatiques. La signature électronique est certifiée eIDAS.',
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
