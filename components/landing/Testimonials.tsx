'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'
import { Quote, Star } from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const testimonials = [
  {
    content: "EduZen nous fait gagner un temps considérable sur la gestion administrative. La conformité Qualiopi est maintenant un jeu d'enfant, tous les documents sont générés automatiquement.",
    author: "Sophie Martin",
    role: "Directrice",
    organization: "Formation Excellence, Paris",
    rating: 5
  },
  {
    content: "L'intégration CPF fonctionne parfaitement. Les stagiaires s'inscrivent facilement et nous pouvons suivre en temps réel toutes nos sessions. Un vrai gain de productivité.",
    author: "Thomas Dubois",
    role: "Responsable Administratif",
    organization: "Institut de Formation Pro, Lyon",
    rating: 5
  },
  {
    content: "La plateforme est très intuitive. Nos formateurs apprécient le portail dédié et les stagiaires trouvent rapidement leurs documents. Le support est réactif et professionnel.",
    author: "Marie Leclerc",
    role: "Coordinatrice Pédagogique",
    organization: "Académie des Compétences, Marseille",
    rating: 5
  }
]

export function Testimonials() {
  const { ref: bgRef1, y: bg1Y } = useParallax(80)
  const { ref: bgRef2, y: bg2Y } = useParallax(120)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="testimonials" className="relative py-32 md:py-40 lg:py-48 overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Decorative blobs with parallax */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          ref={bgRef1}
          style={{ y: bg1Y }}
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-brand-blue-pale/30 rounded-full blur-[120px]"
        />
        <motion.div
          ref={bgRef2}
          style={{ y: bg2Y }}
          className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-cyan-pale/30 rounded-full blur-[120px]"
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20 md:mb-24 lg:mb-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-8"
          >
            <Star className="w-4 h-4 fill-brand-blue text-brand-blue" />
            <span className="text-sm md:text-base font-medium text-brand-blue-darker">Ils nous font confiance</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-gray-900 mb-8 leading-[0.95] font-display"
          >
            Ce que disent nos{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              partenaires
            </span>
          </motion.h2>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="group bg-white rounded-3xl p-10 md:p-12 border-2 border-gray-100 hover:border-brand-blue-pale relative shadow-xl hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-600"
            >
              <Quote className="absolute top-10 right-10 w-16 h-16 text-brand-blue-pale/40 group-hover:text-brand-blue-pale/60 group-hover:scale-110 transition-all duration-600" />

              <div className="flex gap-1 mb-8">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </motion.div>
                ))}
              </div>

              <p className="text-lg md:text-xl text-gray-700 mb-10 leading-relaxed italic relative z-10 font-medium">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-4">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-xl shadow-lg"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  {testimonial.author.charAt(0)}
                </motion.div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base md:text-lg">{testimonial.author}</h4>
                  <p className="text-sm text-brand-blue font-medium">{testimonial.role}</p>
                  <p className="text-sm text-gray-500">{testimonial.organization}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
