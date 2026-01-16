'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef, useState } from 'react'
import { LayoutDashboard, GraduationCap, Users, Play, BookOpen, Award, TrendingUp, Calendar } from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const showcases = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard Admin',
    subtitle: 'Pilotez votre activité en temps réel',
    description: 'Visualisez vos KPIs, gérez vos formations et suivez la performance de votre organisme depuis une interface intuitive.',
    color: 'from-brand-blue to-brand-blue-dark',
    stats: [
      { label: 'Stagiaires actifs', value: '247', icon: Users },
      { label: 'Sessions en cours', value: '18', icon: Calendar },
      { label: 'Taux de réussite', value: '94%', icon: Award },
      { label: 'CA mensuel', value: '127k€', icon: TrendingUp },
    ],
    features: [
      'Vue d\'ensemble complète',
      'Statistiques en temps réel',
      'Gestion des inscriptions',
      'Rapports financiers',
    ],
  },
  {
    id: 'pedagogique',
    icon: BookOpen,
    title: 'Espace Pédagogique',
    subtitle: 'Créez et gérez vos contenus de formation',
    description: 'Construisez des parcours personnalisés, uploadez vos ressources et suivez la progression de vos apprenants.',
    color: 'from-brand-cyan to-brand-cyan-dark',
    stats: [
      { label: 'Modules créés', value: '156', icon: BookOpen },
      { label: 'Ressources', value: '2.3k', icon: Award },
      { label: 'Heures de contenu', value: '450h', icon: Play },
      { label: 'Formateurs', value: '24', icon: GraduationCap },
    ],
    features: [
      'Éditeur de cours intuitif',
      'Bibliothèque de ressources',
      'Quiz et évaluations',
      'Suivi de progression',
    ],
  },
  {
    id: 'apprenant',
    icon: GraduationCap,
    title: 'Espace Apprenant',
    subtitle: 'Une expérience d\'apprentissage moderne',
    description: 'Interface élégante et intuitive pour que vos apprenants accèdent à leurs formations, ressources et suivent leur progression.',
    color: 'from-brand-blue-light to-brand-cyan',
    stats: [
      { label: 'Formations suivies', value: '12', icon: BookOpen },
      { label: 'Progression', value: '67%', icon: TrendingUp },
      { label: 'Certificats', value: '8', icon: Award },
      { label: 'Heures complétées', value: '124h', icon: Play },
    ],
    features: [
      'Parcours personnalisé',
      'Accès multi-device',
      'Badges et certificats',
      'Forum et messagerie',
    ],
  },
]

export function ProductShowcase() {
  const { ref: bgRef, y: bgY } = useParallax(80)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })
  const [activeTab, setActiveTab] = useState(0)

  return (
    <section className="relative py-32 md:py-40 lg:py-56 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Enhanced Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />

        <motion.div
          ref={bgRef}
          style={{ y: bgY }}
          className="absolute top-[15%] left-[5%] w-[600px] h-[600px] bg-gradient-radial-blue rounded-full blur-[120px] opacity-30 animate-pulse-premium"
        />

        <motion.div
          className="absolute bottom-[25%] right-[10%] w-[500px] h-[500px] bg-gradient-radial-cyan rounded-full blur-[100px] opacity-25 animate-wave"
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20 md:mb-28 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-8"
          >
            <Play className="w-4 h-4 text-brand-blue" />
            <span className="text-sm md:text-base font-medium text-brand-blue-darker">Découvrez la plateforme</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tightest text-gray-900 mb-8 leading-tighter font-display">
            <span className="font-extralight italic tracking-luxe">Une plateforme</span>{' '}
            <span className="text-gradient-animated font-black not-italic">
              tout-en-un
            </span>
          </h2>

          <p className="text-lg md:text-xl lg:text-2xl text-gray-700 leading-relaxed font-light tracking-tight">
            Explorez les différents espaces de notre plateforme à travers des{' '}
            <span className="italic font-normal text-brand-blue">captures d'écran réelles</span> avec{' '}
            <span className="font-semibold">données fictives</span>
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row justify-center gap-4 mb-16 md:mb-20"
        >
          {showcases.map((showcase, index) => {
            const Icon = showcase.icon
            return (
              <motion.button
                key={showcase.id}
                onClick={() => setActiveTab(index)}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center gap-3 px-8 py-5 rounded-2xl font-semibold transition-all duration-600 ${
                  activeTab === index
                    ? 'bg-gradient-to-r ' + showcase.color + ' text-white shadow-2xl'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-brand-blue-pale'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-base md:text-lg">{showcase.title}</span>
                {activeTab === index && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl"
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </motion.button>
            )
          })}
        </motion.div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto">
          {showcases.map((showcase, index) => (
            <motion.div
              key={showcase.id}
              initial={{ opacity: 0, y: 40 }}
              animate={activeTab === index ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={activeTab === index ? 'block' : 'hidden'}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                {/* Left: Info */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  animate={activeTab === index ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-display tracking-tight">
                      {showcase.subtitle}
                    </h3>
                    <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-light">
                      {showcase.description}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {showcase.stats.map((stat, idx) => {
                      const StatIcon = stat.icon
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={activeTab === index ? { opacity: 1, y: 0 } : {}}
                          transition={{ duration: 0.6, delay: 0.3 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          whileHover={{ y: -4, scale: 1.02 }}
                          className="p-6 rounded-2xl bg-gradient-aurora border border-gray-200 hover-glow"
                        >
                          <StatIcon className="w-5 h-5 text-brand-blue mb-3" />
                          <p className="text-3xl font-bold text-gray-900 mb-1 font-display">
                            {stat.value}
                          </p>
                          <p className="text-sm text-gray-600 font-light">{stat.label}</p>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3">
                    {showcase.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={activeTab === index ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.5 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-brand-blue" />
                        </div>
                        <span className="text-base md:text-lg text-gray-700 font-medium">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Right: Screenshot Placeholder */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={activeTab === index ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.02, rotateY: 2 }}
                  className="relative group"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Screenshot Container */}
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white border-4 border-gray-100">
                    {/* Browser Chrome */}
                    <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 mx-4 px-4 py-1 bg-white rounded-lg text-xs text-gray-500 font-mono">
                        eduzen.app/{showcase.id}
                      </div>
                    </div>

                    {/* Screenshot Placeholder - Will be replaced with actual images */}
                    <div className={`aspect-[16/10] bg-gradient-to-br ${showcase.color} relative overflow-hidden`}>
                      {/* Animated Grid Pattern */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px] animate-pulse-premium" />

                      {/* Mock UI Elements */}
                      <div className="absolute inset-0 p-8 flex flex-col gap-4">
                        {/* Header Bar */}
                        <div className="h-12 bg-white/20 backdrop-blur-md rounded-2xl animate-pulse" />

                        {/* Content Grid */}
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div className="col-span-2 space-y-4">
                            <div className="h-32 bg-white/20 backdrop-blur-md rounded-2xl animate-pulse" />
                            <div className="grid grid-cols-2 gap-4">
                              <div className="h-24 bg-white/25 backdrop-blur-md rounded-xl" />
                              <div className="h-24 bg-white/25 backdrop-blur-md rounded-xl" />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="h-20 bg-white/20 backdrop-blur-md rounded-2xl" />
                            <div className="h-20 bg-white/20 backdrop-blur-md rounded-2xl" />
                            <div className="h-20 bg-white/20 backdrop-blur-md rounded-2xl" />
                          </div>
                        </div>
                      </div>

                      {/* Floating Badge */}
                      <motion.div
                        animate={{
                          y: [0, -10, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute top-8 right-8 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-xl"
                      >
                        <span className="text-sm font-bold text-gray-900">Données fictives</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-brand-blue/20 to-brand-cyan/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                  <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-brand-cyan/20 to-brand-blue/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mt-20 md:mt-28"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group relative px-10 py-5 bg-gradient-to-r from-brand-blue to-brand-cyan text-white text-lg font-bold rounded-2xl shadow-2xl hover:shadow-brand-blue/50 transition-all duration-600 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-600" />
            <span className="relative flex items-center gap-3">
              Demander une démo personnalisée
              <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
