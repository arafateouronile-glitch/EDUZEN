'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef, useState, useEffect } from 'react'
import { Clock, ShieldCheck, TrendingUp, FileCheck, Sparkles, ArrowRight } from 'lucide-react'

// Composant Spotlight Card
const SpotlightCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-[24px] bg-white border border-gray-100/80 shadow-sm transition-all duration-300 hover:shadow-lg ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(52, 185, 238, 0.08), transparent 40%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-20"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(39, 68, 114, 0.15), transparent 40%)`,
          maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />
      <div className="relative h-full z-0">{children}</div>
    </div>
  );
};

const bentoCards = [
  {
    title: "Gagnez 20h par semaine",
    description: "Automatisez 80% de vos tâches administratives. Feuilles de présence, attestations, conventions... tout est généré en 1 clic.",
    stat: "80%",
    statLabel: "moins d'admin",
    icon: Clock,
    size: 'large',
    gradient: "from-blue-50 to-white"
  },
  {
    title: "Passez Qualiopi sereinement",
    description: "Tous vos documents sont automatiquement conformes aux critères Qualiopi. Préparez votre audit en quelques clics.",
    stat: "100%",
    statLabel: "conforme",
    icon: FileCheck,
    size: 'large',
    gradient: "from-cyan-50 to-white"
  },
  {
    title: "Augmentez vos revenus",
    description: "Proposez des formations e-learning 24/7 et réduisez vos coûts.",
    stat: "+30%",
    statLabel: "de CA moyen",
    icon: TrendingUp,
    size: 'small',
    gradient: "from-gray-50 to-white"
  },
  {
    title: "Sécurisez vos données",
    description: "Cryptage bancaire AES-256, hébergement France, RGPD.",
    stat: "99.9%",
    statLabel: "disponibilité",
    icon: ShieldCheck,
    size: 'small',
    gradient: "from-gray-50 to-white"
  },
]

function BentoCard({ card, index }: { card: any; index: number }) {
  const isLarge = card.size === 'large'
  const Icon = card.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`${isLarge ? 'md:col-span-1' : ''} h-full`}
    >
      <SpotlightCard className="h-full group">
        <div className={`relative h-full p-8 flex flex-col justify-between bg-gradient-to-br ${card.gradient}`}>
          <div>
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-6 h-6 text-brand-blue" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-3 font-display tracking-tight">
              {card.title}
            </h3>
            
            <p className="text-gray-500 leading-relaxed text-sm mb-8">
              {card.description}
            </p>
          </div>

          <div className="relative pt-6 border-t border-gray-100">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan tracking-tighter">
                {card.stat}
              </span>
              <span className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
                {card.statLabel}
              </span>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

export function BentoShowcase() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-white">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-100 mb-6"
          >
            <Sparkles className="w-4 h-4 text-brand-cyan" />
            <span className="text-xs font-bold tracking-widest uppercase text-gray-500">
              Résultats Prouvés
            </span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight leading-tight font-display">
            Concentrez-vous sur <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">l'essentiel.</span>
          </h2>
          
          <p className="text-xl text-gray-500 font-light">
            Pendant que vous formez vos stagiaires, EduZen s'occupe de tout le reste avec une précision chirurgicale.
          </p>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {bentoCards.map((card, index) => (
            <BentoCard key={index} card={card} index={index} />
          ))}
        </div>

      </div>
    </section>
  )
}
