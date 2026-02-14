'use client'

import { motion, useScroll, useTransform } from '@/components/ui/motion'
import { useRef, useState, useEffect } from 'react'
import { Star, Building2, User } from 'lucide-react'

// Hook pour le défilement infini
const useInfiniteScroll = (ref: React.RefObject<HTMLDivElement>, speed: number) => {
  useEffect(() => {
    const container = ref.current
    if (!container) return

    let animationFrameId: number
    let scrollPos = 0

    const scroll = () => {
      scrollPos += speed
      if (scrollPos >= container.scrollHeight / 2) {
        scrollPos = 0
      }
      container.scrollTop = scrollPos
      animationFrameId = requestAnimationFrame(scroll)
    }

    animationFrameId = requestAnimationFrame(scroll)

    return () => cancelAnimationFrame(animationFrameId)
  }, [ref, speed])
}

const testimonials = [
  {
    content: "Avant EduZen, je passais 2 jours par semaine sur l'administratif. Aujourd'hui, tout est automatisé.",
    author: "Caroline Nguyen",
    role: "Formatrice",
    type: 'independent'
  },
  {
    content: "Le passage Qualiopi nous stressait. Avec le suivi en temps réel d'EduZen, on a été certifiés du premier coup.",
    author: "Philippe Renard",
    role: "Directeur",
    type: 'organization'
  },
  {
    content: "L'émargement QR Code a tout changé. Plus de feuilles perdues, nos 15 formateurs adorent.",
    author: "Amira Belkacem",
    role: "Responsable Pédagogique",
    type: 'organization'
  },
  {
    content: "Simple, abordable et fait tout ce dont j'ai besoin. La facturation OPCO en un clic est magique.",
    author: "Julien Mercier",
    role: "Dév Web",
    type: 'independent'
  },
  {
    content: "200+ formations par an gérées sans stress. Le tableau de bord est une mine d'or.",
    author: "Nathalie Dumont",
    role: "Directrice Admin",
    type: 'organization'
  },
  {
    content: "Le seul logiciel qui comprend vraiment nos besoins. Le gain de temps est colossal.",
    author: "Stéphane Dubois",
    role: "Gérant",
    type: 'independent'
  },
]

// Double the testimonials for infinite loop
const infiniteTestimonials = [...testimonials, ...testimonials, ...testimonials]

const TestimonialCard = ({ data, index }: { data: any, index: number }) => (
  <div className="bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-lg transition-shadow duration-300 w-full mb-6 break-inside-avoid">
    <div className="flex gap-1 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
    <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">
      "{data.content}"
    </p>
    <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
        data.type === 'organization' ? 'bg-brand-blue' : 'bg-brand-cyan'
      }`}>
        {data.author.charAt(0)}
      </div>
      <div>
        <div className="font-bold text-gray-900 text-sm">{data.author}</div>
        <div className="text-xs text-gray-400">{data.role}</div>
      </div>
    </div>
  </div>
)

const MovingColumn = ({ speed, testimonials, className }: { speed: number, testimonials: any[], className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Utilisation d'une animation CSS pure pour la fluidité (GPU)
  // au lieu de JS requestAnimationFrame qui peut saccader
  return (
    <div className={`relative h-[600px] overflow-hidden ${className}`}>
      {/* Gradient masks */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FDFDFD] to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FDFDFD] to-transparent z-10" />
      
      <div 
        className="animate-marquee-vertical" 
        style={{ '--duration': `${speed}s` } as React.CSSProperties}
      >
        {testimonials.map((t, i) => (
          <TestimonialCard key={i} data={t} index={i} />
        ))}
      </div>
      {/* Duplicate for seamless loop */}
      <div 
        className="animate-marquee-vertical" 
        style={{ '--duration': `${speed}s` } as React.CSSProperties}
      >
        {testimonials.map((t, i) => (
          <TestimonialCard key={`dup-${i}`} data={t} index={i} />
        ))}
      </div>
    </div>
  )
}

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 overflow-hidden bg-[#FDFDFD]">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 font-display">
            Aimé par les <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">meilleurs.</span>
          </h2>
          <p className="text-xl text-gray-500 font-light">
            Rejoignez plus de 500 organismes qui ont choisi l'excellence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[600px] overflow-hidden mask-image-gradient">
          <MovingColumn speed={40} testimonials={infiniteTestimonials.slice(0, 6)} />
          <MovingColumn speed={55} testimonials={infiniteTestimonials.slice(6, 12)} className="hidden md:block translate-y-[-20px]" />
          <MovingColumn speed={45} testimonials={infiniteTestimonials.slice(0, 6).reverse()} className="hidden lg:block" />
        </div>

      </div>
    </section>
  )
}
