'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'
import { Quote, Star, Building2, User } from 'lucide-react'
import { useParallax } from '@/lib/hooks/useParallax'

const testimonials = [
  {
    content: "Avant EduZen, je passais 2 jours par semaine sur l'administratif. Aujourd'hui, tout est automatisé : émargements, conventions, factures CPF. Je me concentre enfin sur mes formations.",
    author: "Caroline Nguyen",
    role: "Formatrice indépendante",
    organization: "Soft Skills Academy, Paris",
    rating: 5,
    type: 'independent' as const,
  },
  {
    content: "Le passage Qualiopi nous stressait énormément. Avec EduZen, le taux de conformité est suivi en temps réel et tous les documents sont générés automatiquement. On a décroché notre certification du premier coup.",
    author: "Philippe Renard",
    role: "Directeur Général",
    organization: "FormaPro Institute, Lyon",
    rating: 5,
    type: 'organization' as const,
  },
  {
    content: "L'émargement par QR Code a changé notre quotidien. Plus de feuilles volantes, plus de signatures oubliées. Nos 15 formateurs l'ont adopté en une semaine. Le support est aussi très réactif.",
    author: "Amira Belkacem",
    role: "Responsable Pédagogique",
    organization: "Centre de Formation Horizon, Marseille",
    rating: 5,
    type: 'organization' as const,
  },
  {
    content: "En tant que formateur indépendant, je n'avais pas les moyens d'un logiciel complexe. EduZen est simple, abordable et fait tout ce dont j'ai besoin. La facturation OPCO en un clic, c'est un vrai gain de temps.",
    author: "Julien Mercier",
    role: "Formateur Développement Web",
    organization: "Indépendant, Bordeaux",
    rating: 5,
    type: 'independent' as const,
  },
  {
    content: "Nous gérons 200+ formations par an sur 3 sites. EduZen centralise tout : inscriptions, suivi qualité, facturation. Le tableau de bord nous donne une vision claire de notre activité en temps réel.",
    author: "Nathalie Dumont",
    role: "Directrice Administrative",
    organization: "Groupe Excellence Formation, Toulouse",
    rating: 5,
    type: 'organization' as const,
  },
  {
    content: "J'ai testé 4 logiciels avant EduZen. C'est le seul qui comprend vraiment les besoins d'un organisme de formation. La génération automatique des BPF et des attestations me fait gagner des heures chaque semaine.",
    author: "Stéphane Dubois",
    role: "Gérant & Formateur",
    organization: "DigiForm Conseil, Nantes",
    rating: 5,
    type: 'independent' as const,
  },
]

export function Testimonials() {
  const { ref: bgRef1, y: bg1Y } = useParallax(80)
  const { ref: bgRef2, y: bg2Y } = useParallax(120)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="testimonials" className="relative py-16 md:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50">
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
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-14 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-8"
          >
            <Star className="w-4 h-4 fill-brand-blue text-brand-blue" />
            <span className="text-sm md:text-base font-medium text-brand-blue-darker">Note moyenne 4.9/5</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-gray-900 mb-6 leading-[0.95] font-display"
          >
            Ce que disent les{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              formateurs
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Organismes certifiés et formateurs indépendants partagent leur expérience avec EduZen
          </motion.p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="group bg-white rounded-3xl p-10 md:p-12 border-2 border-gray-100 hover:border-brand-blue-pale relative shadow-xl hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-600"
            >
              <Quote className="absolute top-10 right-10 w-14 h-14 text-brand-blue-pale/40 group-hover:text-brand-blue-pale/60 group-hover:scale-110 transition-all duration-600" />

              {/* Type badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-6 ${
                testimonial.type === 'organization'
                  ? 'bg-brand-blue/5 text-brand-blue border border-brand-blue/10'
                  : 'bg-brand-cyan/5 text-brand-cyan-darker border border-brand-cyan/10'
              }`}>
                {testimonial.type === 'organization'
                  ? <><Building2 className="w-3 h-3" /> Organisme certifié</>
                  : <><User className="w-3 h-3" /> Formateur indépendant</>
                }
              </div>

              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.05, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </motion.div>
                ))}
              </div>

              <p className="text-base md:text-lg text-gray-700 mb-8 leading-relaxed italic relative z-10">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              <div className="flex items-center gap-4">
                <motion.div
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                >
                  {testimonial.author.charAt(0)}
                </motion.div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{testimonial.author}</h4>
                  <p className="text-sm text-brand-blue font-medium">{testimonial.role}</p>
                  <p className="text-xs text-gray-500">{testimonial.organization}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
