'use client'

import dynamic from 'next/dynamic'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Car, Building2, ShieldCheck, School, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/landing/Navbar'
import { JsonLd } from '@/components/seo/JsonLd'

// ============================================
// PERFORMANCE OPTIMIZATIONS
// - Hero: SSR + CSS animations (no Framer Motion)
// - Below-fold: Lazy loaded with Suspense
// - Parallax: Loaded only after initial render
// ============================================

// ParallaxProvider - chargé en différé (pas critique pour LCP)
const ParallaxProvider = dynamic(
  () => import('@/components/providers/ParallaxProvider').then(mod => ({ default: mod.ParallaxProvider })),
  { ssr: false }
)

// Hero optimisé - SSR activé, CSS animations uniquement
const Hero = dynamic(
  () => import('@/components/landing/Hero').then(mod => ({ default: mod.Hero })),
  {
    ssr: true,
    loading: () => (
      <section className="relative pt-40 pb-32 md:pt-56 md:pb-48 lg:pt-72 lg:pb-72 overflow-hidden bg-gradient-to-b from-white via-gray-50/30 to-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center max-w-7xl mx-auto">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-tightest font-display text-gray-900 mb-12">
              Gérez votre organisme de formation avec simplicité
            </h1>
          </div>
        </div>
      </section>
    ),
  }
)

// Skeleton pour les sections below-the-fold
const SectionSkeleton = () => (
  <div className="min-h-[50vh] bg-gradient-to-b from-white to-gray-50/30 animate-pulse" />
)

// Sections lazy-loaded - chargées uniquement quand visibles
const LogoCloud = dynamic(
  () => import('@/components/landing/LogoCloud').then(mod => ({ default: mod.LogoCloud })),
  { loading: () => <SectionSkeleton /> }
)

const Features = dynamic(
  () => import('@/components/landing/Features').then(mod => ({ default: mod.Features })),
  { loading: () => <SectionSkeleton /> }
)

const BentoShowcase = dynamic(
  () => import('@/components/landing/BentoShowcase').then(mod => ({ default: mod.BentoShowcase })),
  { loading: () => <SectionSkeleton /> }
)

const ProductShowcase = dynamic(
  () => import('@/components/landing/ProductShowcase').then(mod => ({ default: mod.ProductShowcase })),
  { loading: () => <SectionSkeleton /> }
)


const AiAgent = dynamic(
  () => import('@/components/landing/AiAgent').then(mod => ({ default: mod.AiAgent })),
  { loading: () => <SectionSkeleton /> }
)

const HowItWorks = dynamic(
  () => import('@/components/landing/HowItWorks').then(mod => ({ default: mod.HowItWorks })),
  { loading: () => <SectionSkeleton /> }
)

const Testimonials = dynamic(
  () => import('@/components/landing/Testimonials').then(mod => ({ default: mod.Testimonials })),
  { loading: () => <SectionSkeleton /> }
)

const Pricing = dynamic(
  () => import('@/components/landing/Pricing').then(mod => ({ default: mod.Pricing })),
  { loading: () => <SectionSkeleton /> }
)

const ComparisonTable = dynamic(
  () => import('@/components/landing/ComparisonTable').then(mod => ({ default: mod.ComparisonTable })),
  { loading: () => <SectionSkeleton /> }
)

const FAQ = dynamic(
  () => import('@/components/landing/FAQ').then(mod => ({ default: mod.FAQ })),
  { loading: () => <SectionSkeleton /> }
)

const Footer = dynamic(
  () => import('@/components/landing/Footer').then(mod => ({ default: mod.Footer })),
  { loading: () => <div className="min-h-[200px] bg-gray-900" /> }
)

type DeferredSectionProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
  minHeightClassName?: string
}

function DeferredSection({
  children,
  fallback = <SectionSkeleton />,
  minHeightClassName = 'min-h-[45vh]',
}: DeferredSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      {
        root: null,
        // Précharge légèrement avant affichage pour éviter tout pop visuel
        rootMargin: '500px 0px',
        threshold: 0.01,
      }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={minHeightClassName}>
      {isVisible ? children : fallback}
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      {/* JSON-LD hors du ParallaxProvider (ssr:false) pour être dans le HTML initial */}
      <JsonLd />
      <ParallaxProvider>
      <main className="min-h-screen bg-white selection:bg-brand-blue-pale selection:text-brand-blue-darker antialiased">
        {/* Navbar - critique, pas de lazy load */}
        <Navbar />

        {/* Hero - SSR activé, critique pour LCP */}
        <Hero />

        {/*
          Contenu SEO structuré — rendu en SSR, invisible visuellement (sr-only),
          accessible aux lecteurs d'écran et indexé par Google.
          Ne pas supprimer : c'est le contenu textuel principal pour le référencement.
        */}
        <div className="sr-only" role="region" aria-label="Présentation complète d'EduZen">
          <h2>EduZen : Le Logiciel de Gestion Tout-en-Un pour Organismes de Formation</h2>
          <p>
            EduZen est la plateforme SaaS de gestion de la formation professionnelle conçue pour
            les organismes de formation en France. Que vous soyez formateur indépendant, centre de
            formation ou organisme en pleine croissance, EduZen automatise l'ensemble de vos tâches
            administratives pour vous faire gagner jusqu'à 10 heures par semaine. Conçu par des
            professionnels de la formation, pour des professionnels de la formation, EduZen est le
            logiciel organisme de formation de référence sur le marché français.
          </p>

          <h2>Conformité Qualiopi Automatique — Passez votre Audit Sereinement</h2>
          <p>
            La certification Qualiopi est une obligation légale pour tout organisme de formation
            souhaitant accéder aux financements publics et mutualisés : CPF (Compte Personnel de
            Formation), OPCO (Opérateurs de Compétences), France Travail et financements régionaux.
            EduZen génère automatiquement 100&nbsp;% des documents exigés par le référentiel national
            qualité Qualiopi&nbsp;: contrats de formation, conventions de formation, programmes
            pédagogiques détaillés, feuilles de présence signées électroniquement, évaluations à chaud
            et à froid, certificats de réalisation et attestations de formation. Votre tableau de bord
            de conformité Qualiopi est mis à jour en temps réel&nbsp;: vous abordez chaque audit avec
            la certitude d'être à 100&nbsp;% conforme.
          </p>

          <h2>Émargement Numérique par QR Code — Fini les Feuilles Papier</h2>
          <p>
            L'émargement numérique EduZen révolutionne la gestion des feuilles de présence pour les
            organismes de formation. Vos stagiaires signent leur présence en 2 secondes via QR code,
            signature tactile sur tablette ou smartphone, ou géolocalisation pour les formations en
            présentiel. Les feuilles de présence sont automatiquement générées, horodatées et
            archivées en PDF. Conformes aux exigences Qualiopi et reconnues par tous les OPCO, elles
            sont infalsifiables. Économisez 5 heures par semaine rien que sur la gestion de
            l'émargement&nbsp;: plus de feuilles papier perdues, de signatures manquantes ni de saisie
            manuelle. L'émargement numérique EduZen est compatible avec les formations en présentiel,
            en distanciel et en format blended learning.
          </p>

          <h2>Facturation CPF et OPCO en 1 Clic — Simplifiez votre Gestion Financière</h2>
          <p>
            La facturation des formations financées est souvent complexe et chronophage pour les
            organismes de formation. EduZen simplifie radicalement ce processus. Générez vos factures
            CPF conformes à Mon Compte Formation (EDOF) en un seul clic. Gérez les subrogations de
            paiement OPCO (AFDAS, OPCO Atlas, CONSTRUCTYS, AKTO, OCAPIAT, etc.) et suivez vos
            encaissements en temps réel. L'export comptable automatisé vers vos outils de
            comptabilité évite toute double saisie. EduZen gère également la facturation France
            Travail, les prises en charge régionales et la facturation inter-entreprises.
          </p>

          <h2>Signature Électronique Certifiée eIDAS — Valeur Juridique Garantie</h2>
          <p>
            La signature électronique EduZen est certifiée eIDAS (règlement européen 910/2014 sur
            l'identification électronique). Vos contrats de formation, conventions de formation et
            documents administratifs ont la même valeur juridique qu'un acte signé devant notaire.
            Chaque signature est horodatée, traçable et infalsifiable. Signez vos documents à
            distance sans jamais imprimer ni scanner, et gagnez 3 jours par contrat. La signature
            électronique eIDAS EduZen est reconnue par tous les OPCO, les plateformes CPF et
            France Travail. Elle répond aux exigences du Code du Travail et du Code de la
            Consommation.
          </p>

          <h2>Gestion Complète des Formations, Sessions et Stagiaires</h2>
          <p>
            EduZen centralise l'ensemble de la gestion de vos formations dans une interface
            intuitive et ergonomique. Créez vos programmes de formation avec leurs objectifs
            pédagogiques, planifiez vos sessions en présentiel ou en distanciel, gérez vos
            formateurs et vos salles de formation. Suivez les inscriptions de vos stagiaires,
            leurs progressions pédagogiques, leurs évaluations et leurs résultats. Automatisez
            vos communications&nbsp;: emails de convocation, rappels de session, enquêtes de
            satisfaction, attestations de fin de formation. Le CRM intégré vous permet de gérer
            vos prospects, vos clients entreprises et vos relations avec les financeurs.
          </p>

          <h2>Portail E-Learning et LMS Intégré — Formez en Ligne 24h/24</h2>
          <p>
            EduZen intègre un LMS (Learning Management System) complet pour proposer des
            formations 100&nbsp;% en ligne ou en format mixte (blended learning). Créez vos modules
            e-learning, déposez vos supports pédagogiques (PDF, vidéos, présentations), configurez
            des quiz et des évaluations en ligne. Vos apprenants accèdent à leur espace personnel
            24h/24, 7j/7, depuis leur ordinateur, tablette ou smartphone. Le portail apprenant
            EduZen est inclus dans tous les plans sans surcoût, vous permettant de multiplier vos
            sessions de formation sans frais supplémentaires et d'atteindre des apprenants partout
            en France.
          </p>

          <h2>Intelligence Artificielle pour Organismes de Formation</h2>
          <p>
            EduZen intègre un agent d'intelligence artificielle spécialement entraîné sur la
            formation professionnelle française. L'IA EduZen génère automatiquement vos programmes
            de formation conformes au référentiel Qualiopi, rédige vos objectifs pédagogiques selon
            la taxonomie de Bloom, crée vos supports de cours et vos évaluations. Elle analyse les
            performances de vos stagiaires et vous suggère des améliorations pédagogiques
            personnalisées. L'agent IA comprend le vocabulaire spécifique de la formation
            professionnelle française&nbsp;: ingénierie pédagogique, référentiel de compétences,
            modalités pédagogiques, évaluation des acquis.
          </p>

          <h2>Sécurité Maximale et Conformité RGPD</h2>
          <p>
            La protection des données personnelles de vos stagiaires et de votre organisme de
            formation est au cœur d'EduZen. Toutes les données sont hébergées en France et en
            Europe sur des serveurs certifiés ISO&nbsp;27001, chiffrées avec le standard bancaire
            AES-256. Plus de 992 tests de sécurité automatisés sont exécutés quotidiennement pour
            garantir l'intégrité de votre espace. EduZen est 100&nbsp;% conforme au RGPD (Règlement
            Général sur la Protection des Données), avec des sauvegardes automatiques quotidiennes,
            une politique de conservation transparente et un DPO disponible sur demande. Vous restez
            propriétaire de vos données et pouvez les exporter à tout moment au format CSV ou Excel.
          </p>

          <h2>Tarifs Adaptés à Tous les Types d'Organismes de Formation</h2>
          <p>
            EduZen propose trois plans tarifaires adaptés à chaque stade de développement de votre
            organisme de formation. Le plan Starter à 39€/mois est conçu pour les formateurs
            indépendants et les petits organismes de formation&nbsp;: gestion illimitée des formations,
            émargement numérique, génération de documents Qualiopi. Le plan Pro à 84€/mois est
            idéal pour les organismes en croissance avec plusieurs formateurs&nbsp;: toutes les
            fonctionnalités Starter plus le CRM avancé, l'API et les intégrations comptables. Le
            plan Enterprise à partir de 349€/mois offre la solution complète pour les grands centres
            de formation et les réseaux de franchise. Tous les plans incluent un essai gratuit de
            14 jours sans carte bancaire et sont sans engagement de durée.
          </p>

          <h2>Organismes de Formation Accompagnés par EduZen</h2>
          <p>
            EduZen accompagne tous les types d'organismes de formation professionnelle continue&nbsp;:
            centres de formation professionnelle continue (FPC), organismes certifiés Qualiopi,
            formateurs indépendants et consultants, CFA (Centres de Formation par Apprentissage),
            organismes de formation en management et leadership, centres de formation aux métiers
            du numérique et de l'informatique, organismes spécialisés en formation réglementaire
            (sécurité, habilitations électriques, CACES, etc.), instituts de formation continue
            universitaires, chambres consulaires et organismes de branche, organismes de formation
            spécialisés en langues étrangères, et organismes de formation sanitaire et social.
          </p>

          <h3>Questions Fréquentes sur EduZen — Logiciel Organisme de Formation</h3>

          <h4>Quel est le meilleur logiciel pour gérer un organisme de formation en France&nbsp;?</h4>
          <p>
            EduZen est le logiciel de référence pour les organismes de formation en France. Conçu
            par des professionnels de la formation, il automatise la conformité Qualiopi,
            l'émargement numérique, la facturation CPF et OPCO. Les utilisateurs gagnent en moyenne
            10 heures par semaine sur les tâches administratives.
          </p>

          <h4>Comment EduZen aide-t-il à passer l'audit Qualiopi&nbsp;?</h4>
          <p>
            EduZen génère automatiquement 100&nbsp;% des documents exigés lors d'un audit Qualiopi&nbsp;:
            contrats et conventions de formation, feuilles de présence signées électroniquement,
            évaluations à chaud et à froid, certificats de réalisation. Le tableau de bord de
            conformité Qualiopi vous permet de suivre votre taux de conformité en temps réel et de
            préparer sereinement votre audit.
          </p>

          <h4>EduZen est-il adapté aux formateurs indépendants&nbsp;?</h4>
          <p>
            Oui, le plan Starter à 39€/mois est spécialement conçu pour les formateurs indépendants.
            Il inclut la gestion illimitée des formations, l'émargement numérique par QR code, la
            génération automatique des documents Qualiopi et la signature électronique eIDAS, sans
            engagement de durée et avec un essai gratuit de 14 jours.
          </p>

          <h4>EduZen fonctionne-t-il pour les formations en distanciel et en blended learning&nbsp;?</h4>
          <p>
            Absolument. EduZen est conçu pour tous les formats de formation&nbsp;: présentiel,
            distanciel (classe virtuelle, e-learning) et blended learning. L'émargement numérique
            fonctionne pour toutes les modalités pédagogiques. Le LMS intégré permet de diffuser
            des contenus e-learning accessibles 24h/24. Les documents générés (attestations,
            feuilles de présence) sont conformes Qualiopi pour toutes les modalités.
          </p>
        </div>

        {/* Aperçu vidéo — courte présentation de l'app (~1 min) */}
        <section className="pt-4 pb-16 bg-white">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <video
              src="/videos/VIDEO LP EDUZEN 1.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </section>

        {/* Secteurs — maillage interne vers /pour */}
        <section className="py-20 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(39,68,114,0.04),transparent)]" />
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl relative">
            <div className="text-center mb-14">
              <p className="text-[11px] font-bold text-brand-blue uppercase tracking-[0.2em] mb-4">Solutions métier</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter font-display text-gray-900">
                EduZen s&apos;adapte à votre secteur
              </h2>
              <p className="text-gray-500 mt-4 text-[15px] max-w-lg mx-auto leading-relaxed">
                Une plateforme configurée pour chaque métier de la formation professionnelle.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {([
                { Icon: GraduationCap, label: 'CFA', href: '/pour/cfa', sub: 'Apprentissage · BPF · OPCO', gradient: 'from-brand-blue to-brand-blue-dark' },
                { Icon: Car, label: 'Auto-écoles', href: '/pour/auto-ecole', sub: 'Permis B · AAC · Livret', gradient: 'from-brand-blue to-brand-cyan' },
                { Icon: Building2, label: 'Formation en entreprise', href: '/pour/formation-entreprise', sub: 'PDC · Inter/Intra · OPCO', gradient: 'from-brand-blue-dark to-brand-blue' },
                { Icon: ShieldCheck, label: 'Formations réglementées', href: '/pour/organisme-securite', sub: 'SST · CACES · Habilitations', gradient: 'from-brand-cyan to-brand-blue' },
                { Icon: School, label: 'Établissements scolaires', href: '/pour/etablissement-scolaire', sub: 'Élèves · Planning · E-learning', gradient: 'from-brand-blue to-brand-cyan' },
              ] as const).map(({ Icon, label, href, sub, gradient }) => (
                <Link
                  key={href}
                  href={href}
                  className="group relative flex flex-col items-center gap-5 p-6 rounded-2xl bg-white border border-gray-200 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/10 hover:-translate-y-1 transition-all duration-500 text-center overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-brand-blue/[0.03] to-brand-cyan/[0.06]" />
                  <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg shadow-black/15`}>
                    <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div className="relative">
                    <p className="text-[15px] font-bold text-gray-900 font-display group-hover:text-brand-blue transition-colors duration-300 leading-tight">{label}</p>
                    <p className="text-[12px] text-gray-600 mt-1.5 leading-relaxed">{sub}</p>
                  </div>
                  <div className="relative mt-auto flex items-center gap-1 text-[12px] font-semibold text-brand-blue/60 group-hover:text-brand-blue group-hover:translate-y-0 transition-all duration-300">
                    Découvrir <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Sections below-the-fold rendues à l'approche viewport (qualité visuelle inchangée). */}
        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <LogoCloud />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <Features />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <BentoShowcase />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <ProductShowcase />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <AiAgent />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <HowItWorks />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <Testimonials />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <Pricing />
          </Suspense>
        </DeferredSection>

        {/* Répétition sociale avant comparatif */}
        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <LogoCloud />
          </Suspense>
        </DeferredSection>

        {/* Tableau comparatif EduZen vs concurrents */}
        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <ComparisonTable />
          </Suspense>
        </DeferredSection>

        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <FAQ />
          </Suspense>
        </DeferredSection>

        <DeferredSection
          fallback={<div className="min-h-[200px] bg-gray-900" />}
          minHeightClassName="min-h-[200px]"
        >
          <Suspense fallback={<div className="min-h-[200px] bg-gray-900" />}>
            <Footer />
          </Suspense>
        </DeferredSection>
      </main>
    </ParallaxProvider>
    </>
  )
}
