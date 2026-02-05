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
  Calculator,
  PenTool,
  UserCheck,
  Clock,
  Scale,
  Lock
} from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const features = [
  {
    icon: PenTool,
    title: "Signature Électronique eIDAS",
    description: "Signez vos documents en ligne avec une valeur juridique équivalente à un acte notarié. Conformité eIDAS garantie, horodatage certifié et preuve de signature infalsifiable. Gagnez 3 jours par contrat et éliminez les allers-retours papier.",
    color: "bg-green-100 text-green-700",
    badges: ["Valeur légale", "Gain de temps", "Sécurisé"]
  },
  {
    icon: UserCheck,
    title: "Émargements Numériques",
    description: "Fini les feuilles de présence papier ! Émargement par QR code, signature tactile ou géolocalisation. Vos stagiaires signent en 2 secondes, vous économisez 5h/semaine en gestion administrative. 100% conforme Qualiopi.",
    color: "bg-brand-cyan-pale text-brand-cyan-dark",
    badges: ["Conforme Qualiopi", "5h/semaine gagnées", "Zéro papier"]
  },
  {
    icon: Lock,
    title: "Sécurité Maximale",
    description: "Vos données sont protégées par un cryptage AES-256, les mêmes standards que les banques. Hébergement certifié ISO 27001, sauvegardes automatiques et 992 tests de sécurité quotidiens. Conformité RGPD totale.",
    color: "bg-blue-100 text-blue-700",
    badges: ["Cryptage bancaire", "ISO 27001", "RGPD"]
  },
  {
    icon: GraduationCap,
    title: "Gestion Complète des Formations",
    description: "Gagnez 20h par semaine en automatisant toutes vos tâches administratives. Concentrez-vous sur l'essentiel : la pédagogie. Réduction drastique du temps passé sur la gestion des sessions, stagiaires et formateurs.",
    color: "bg-brand-blue-pale text-brand-blue"
  },
  {
    icon: Scale,
    title: "Conformité Légale Garantie",
    description: "Tous vos documents respectent les normes en vigueur : conventions, attestations, certificats. Génération automatique conforme au Code du Travail et aux exigences des financeurs (OPCO, CPF, Pôle Emploi).",
    color: "bg-amber-100 text-amber-700",
    badges: ["Code du Travail", "OPCO", "CPF"]
  },
  {
    icon: Clock,
    title: "Gain de Temps Massif",
    description: "Réduisez de 80% le temps passé sur les tâches administratives. Documents générés en 1 clic, emails automatiques, relances programmées. Ce qui prenait des heures ne prend plus que quelques minutes.",
    color: "bg-purple-100 text-purple-700",
    badges: ["-80% admin", "1 clic", "Automatisé"]
  },
  {
    icon: BookOpen,
    title: "E-Learning Intégré",
    description: "Augmentez vos revenus en proposant des formations en ligne 24/7 sans coûts supplémentaires. Multipliez vos sessions, diversifiez vos sources de revenus et atteignez plus de stagiaires.",
    color: "bg-brand-cyan-pale text-brand-cyan-dark"
  },
  {
    icon: FileText,
    title: "Conformité Qualiopi & Datadock",
    description: "Passez vos audits Qualiopi en toute sérénité. Tous vos documents sont générés automatiquement et conformes aux normes. Économisez des semaines de préparation et obtenez votre certification sans stress.",
    color: "bg-brand-blue-ghost text-brand-blue-darker"
  },
  {
    icon: CreditCard,
    title: "Facturation & CPF",
    description: "Réduisez les erreurs de facturation à zéro. Facturation CPF et subrogations de paiement gérées automatiquement. Fini les erreurs coûteuses et les litiges. Conformité garantie, tranquillité d'esprit assurée.",
    color: "bg-brand-cyan-ghost text-brand-cyan-darker"
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
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
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
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
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
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              whileHover={{ y: -12, scale: 1.02 }}
              className={`relative group bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 transition-all duration-600 ${
                index < 3
                  ? 'border-brand-blue/20 hover:border-brand-blue hover:shadow-2xl hover:shadow-brand-blue/20 ring-1 ring-brand-blue/10'
                  : 'border-gray-100 hover:border-brand-blue-pale hover:shadow-2xl hover:shadow-brand-blue/10'
              }`}
            >
              {/* Badge "Populaire" pour les 3 premières features */}
              {index < 3 && (
                <div className="absolute -top-3 right-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-lg">
                    Essentiel
                  </span>
                </div>
              )}

              <motion.div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${feature.color}`}
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <feature.icon className="w-8 h-8" />
              </motion.div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 font-display leading-tight">{feature.title}</h3>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                {feature.description}
              </p>

              {/* Badges pour les features avec badges */}
              {'badges' in feature && feature.badges && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {feature.badges.map((badge, badgeIndex) => (
                    <span
                      key={badgeIndex}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
