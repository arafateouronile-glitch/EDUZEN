'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from '@/components/ui/motion'
import { Plus, Minus, HelpCircle, ArrowRight } from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const faqs = [
  {
    question: "EduZen est-il conforme avec les normes Qualiopi et Datadock ?",
    answer: "Oui, EduZen génère automatiquement tous les documents nécessaires à la conformité Qualiopi (contrats de formation, feuilles de présence, évaluations, etc.) et est compatible avec les exigences Datadock pour la certification."
  },
  {
    question: "Comment fonctionne l'intégration avec le CPF (Compte Personnel de Formation) ?",
    answer: "EduZen s'intègre avec les plateformes CPF pour générer automatiquement les factures et gérer les subrogations de paiement. Les stagiaires peuvent consulter leurs formations directement depuis leur espace CPF."
  },
  {
    question: "Mes données sont-elles conformes au RGPD ?",
    answer: "Absolument. EduZen est entièrement conforme au RGPD. Vos données sont hébergées en Europe, cryptées de bout en bout, et vous gardez le contrôle total. Nous réalisons des sauvegardes quotidiennes automatiques."
  },
  {
    question: "Puis-je importer mes données existantes ?",
    answer: "Oui ! Vous pouvez importer vos listes de stagiaires, formateurs, sessions et programmes depuis Excel ou CSV. Notre équipe peut également vous accompagner dans la migration de vos données."
  },
  {
    question: "EduZen s'intègre-t-il avec d'autres outils (comptabilité, CRM, etc.) ?",
    answer: "Oui, EduZen propose une API REST complète pour s'intégrer avec vos outils existants (logiciels de comptabilité, CRM, outils de visioconférence, etc.). Des intégrations natives sont également disponibles pour les solutions les plus courantes."
  },
  {
    question: "Y a-t-il une période d'engagement ?",
    answer: "Non, tous nos plans sont sans engagement. Vous pouvez annuler votre abonnement à tout moment sans frais cachés. Nous proposons également un essai gratuit de 14 jours pour tester la plateforme."
  }
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const { ref: bgRef, y: bgY } = useParallax(60)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="faq" className="relative py-32 md:py-40 lg:py-48 overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Background Parallax */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          ref={bgRef}
          style={{ y: bgY }}
          className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-brand-blue-pale/30 rounded-full blur-[100px] opacity-40"
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start max-w-7xl mx-auto">
          {/* Left Column - Sticky Header */}
          <div className="lg:sticky lg:top-32">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-8"
            >
              <HelpCircle className="w-4 h-4 text-brand-blue" />
              <span className="text-sm md:text-base font-medium text-brand-blue-darker">Support & FAQ</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-gray-900 mb-8 leading-tighter font-display"
            >
              <span className="font-extralight italic tracking-luxe">Questions</span>{' '}
              <span className="text-gradient-animated font-black not-italic tracking-tightest">
                fréquentes
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed font-light tracking-tight"
            >
              Vous ne trouvez pas la réponse que vous cherchez ?{' '}
              <span className="italic font-normal text-brand-blue">Contactez notre équipe support</span>{' '}
              <span className="font-semibold">disponible 24/7</span>.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.05, x: 5 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-3 text-lg font-semibold text-brand-blue hover:text-brand-blue-dark transition-all duration-600"
            >
              Contacter le support
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-600" />
            </motion.button>
          </div>

          {/* Right Column - FAQ Items */}
          <div ref={containerRef} className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`border-2 rounded-3xl overflow-hidden bg-white shadow-lg transition-all duration-600 ${
                  openIndex === index
                    ? 'border-brand-blue shadow-2xl shadow-brand-blue/10'
                    : 'border-gray-200 hover:border-brand-blue-pale'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="flex items-center justify-between w-full p-8 md:p-10 text-left group"
                >
                  <span className="text-lg md:text-xl font-semibold text-gray-900 pr-6 font-display tracking-tight leading-snug">
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-600 ${
                      openIndex === index
                        ? 'bg-brand-blue text-white'
                        : 'bg-gray-100 text-gray-500 group-hover:bg-brand-blue-pale group-hover:text-brand-blue'
                    }`}
                  >
                    {openIndex === index ? (
                      <Minus className="w-6 h-6" />
                    ) : (
                      <Plus className="w-6 h-6" />
                    )}
                  </motion.span>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-8 md:px-10 pb-8 md:pb-10">
                        <div className="pt-6 border-t-2 border-gray-100">
                          <p className="text-lg text-gray-700 leading-relaxed font-light italic tracking-wide">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
