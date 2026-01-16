'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'
import {
  Users,
  CreditCard,
  FileText,
  BarChart3,
  ShieldCheck,
  Smartphone,
  GraduationCap,
  Calendar,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  Calculator
} from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const features = [
  {
    icon: GraduationCap,
    title: "Gestion Complète des Formations",
    description: "Gagnez 20h par semaine en automatisant toutes vos tâches administratives. Concentrez-vous sur l'essentiel : la pédagogie. Réduction drastique du temps passé sur la gestion des sessions, stagiaires et formateurs.",
    color: "bg-brand-blue-pale text-brand-blue"
  },
  {
    icon: BookOpen,
    title: "E-Learning Intégré",
    description: "Augmentez vos revenus en proposant des formations en ligne 24/7 sans coûts supplémentaires. Multipliez vos sessions, diversifiez vos sources de revenus et atteignez plus de stagiaires grâce à notre plateforme intégrée.",
    color: "bg-brand-cyan-pale text-brand-cyan-dark"
  },
  {
    icon: ClipboardCheck,
    title: "Évaluations & Certifications",
    description: "Garantissez la réussite de vos stagiaires en suivant leur progression en temps réel. Identifiez les difficultés rapidement, augmentez vos taux de réussite et générez automatiquement des certificats conformes.",
    color: "bg-brand-blue-ghost text-brand-blue-darker"
  },
  {
    icon: Calculator,
    title: "Fonctions Financières Avancées",
    description: "Maîtrisez votre trésorerie au quotidien. Plus jamais de factures en retard grâce aux relances automatiques. Suivez vos encaissements en temps réel et prévoyez votre trésorerie avec des rapports financiers précis.",
    color: "bg-brand-cyan-ghost text-brand-cyan-darker"
  },
  {
    icon: MessageSquare,
    title: "Messagerie Intégrée",
    description: "Améliorez la satisfaction de vos stagiaires en réduisant de 80% le temps de réponse aux demandes. Communication centralisée, notifications automatiques et historique complet pour une relation client exceptionnelle.",
    color: "bg-brand-blue-pale text-brand-blue"
  },
  {
    icon: CreditCard,
    title: "Facturation & CPF",
    description: "Réduisez les erreurs de facturation à zéro. Facturation CPF et subrogations de paiement gérées automatiquement. Fini les erreurs coûteuses et les litiges. Conformité garantie, tranquillité d'esprit assurée.",
    color: "bg-brand-cyan-pale text-brand-cyan-dark"
  },
  {
    icon: FileText,
    title: "Conformité Qualiopi & Datadock",
    description: "Passez vos audits Qualiopi en toute sérénité. Tous vos documents sont générés automatiquement et conformes aux normes. Économisez des semaines de préparation et obtenez votre certification sans stress.",
    color: "bg-brand-blue-ghost text-brand-blue-darker"
  },
  {
    icon: ShieldCheck,
    title: "Conformité RGPD & Sécurité",
    description: "Protégez-vous contre les risques juridiques. Conformité RGPD garantie, données sécurisées et sauvegardées automatiquement. Évitez les amendes et les problèmes juridiques. Vos données sont entre de bonnes mains.",
    color: "bg-brand-cyan-ghost text-brand-cyan-darker"
  },
  {
    icon: BarChart3,
    title: "Reporting & Statistiques",
    description: "Prenez des décisions stratégiques éclairées. Identifiez vos formations les plus rentables, optimisez vos ressources et démontrez votre ROI aux financeurs avec des tableaux de bord en temps réel.",
    color: "bg-brand-blue-pale text-brand-blue"
  }
]

export function Features() {
  const { ref: bgRef, y: bgY } = useParallax(60)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="features" className="relative py-32 md:py-40 lg:py-48 overflow-hidden bg-white">
      {/* Background Parallax */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Animated mesh gradient */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />

        <motion.div
          ref={bgRef}
          style={{ y: bgY }}
          className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-gradient-radial-blue rounded-full blur-[100px] opacity-30 animate-wave"
        />

        <motion.div
          className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] bg-gradient-radial-cyan rounded-full blur-[100px] opacity-25 animate-bounce-slow"
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20 md:mb-24 lg:mb-28">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tightest text-gray-900 mb-8 leading-tighter font-display"
          >
            <span className="font-extralight italic tracking-luxe">Tout ce dont vous avez besoin pour</span>{' '}
            <span className="text-gradient-animated font-black not-italic">
              réussir
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl md:text-2xl text-gray-600 leading-relaxed"
          >
            Découvrez comment EduZen transforme la gestion de votre organisme pour générer plus de revenus, économiser du temps et améliorer la satisfaction de vos stagiaires.
          </motion.p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="group bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 border-gray-100 hover:border-brand-blue-pale hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-600"
            >
              <motion.div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${feature.color}`}
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <feature.icon className="w-8 h-8" />
              </motion.div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 font-display leading-tight">{feature.title}</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
