'use client'

import { memo, useRef, useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles, Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from '@/components/ui/motion'

// Composant de bouton magnétique
const MagneticButton = ({ children, className, ...props }: any) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [isMagneticEnabled, setIsMagneticEnabled] = useState(false);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => setIsMagneticEnabled(hoverFine.matches && !reducedMotion.matches);
    update();

    hoverFine.addEventListener('change', update);
    reducedMotion.addEventListener('change', update);

    return () => {
      hoverFine.removeEventListener('change', update);
      reducedMotion.removeEventListener('change', update);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isMagneticEnabled || !ref.current) return;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (!ref.current || !pointerRef.current) return;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      x.set((pointerRef.current.x - centerX) * 0.2);
      y.set((pointerRef.current.y - centerY) * 0.2);
    });
  };

  const handleMouseLeave = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pointerRef.current = null;
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const Hero = memo(function Hero() {
  const { scrollY } = useScroll();
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  
  // Animation variantes pour le texte
  const textVariants = {
    hidden: { y: "100%" },
    visible: (i: number) => ({
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.8,
        ease: [0.2, 0.65, 0.3, 0.9] as const,
      },
    }),
  };

  return (
    <section className="relative pt-32 pb-4 md:pt-48 md:pb-8 overflow-hidden bg-[#FDFDFD]">
      {/* Background Grille Subtile */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-brand-cyan/20 opacity-20 blur-[100px]" />
         <div className="absolute right-[-10%] top-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-brand-blue/10 opacity-20 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          
          {/* Badge Premium */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm mb-8 hover:border-brand-blue/30 transition-colors cursor-default"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
            </span>
            <span className="text-xs font-medium text-gray-600 tracking-wide uppercase">
              Nouvelle Version 2.0 Disponible
            </span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
          </motion.div>

          {/* Titre Principal avec Mask Reveal */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-[0.95] md:leading-[0.9] font-display text-gray-900 mb-8 md:mb-10">
            <span className="sr-only">EduZen, logiciel organisme de formation : </span>
            <div className="overflow-hidden">
              <motion.span custom={0} variants={textVariants} initial="hidden" animate="visible" className="block pb-2">
                Gérez votre organisme
              </motion.span>
            </div>
            <div className="overflow-hidden">
              <motion.span custom={1} variants={textVariants} initial="hidden" animate="visible" className="block text-gray-400 font-light italic pb-2">
                de formation avec
              </motion.span>
            </div>
            <div className="overflow-hidden">
              <motion.span custom={2} variants={textVariants} initial="hidden" animate="visible" className="block bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x pb-4">
                simplicité absolue.
              </motion.span>
            </div>
          </h1>

          {/* Sous-titre */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl leading-relaxed font-light"
          >
            Automatisez votre conformité Qualiopi, émargement et facturation. 
            <span className="text-gray-900 font-medium"> Gagnez 10h par semaine</span> et concentrez-vous sur ce qui compte vraiment : vos apprenants.
          </motion.p>

          {/* CTAs Magnétiques */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8 md:mb-10 items-center justify-center"
          >
            <Link href="/demo" className="w-full sm:w-auto">
              <MagneticButton className="group relative w-full sm:w-auto overflow-hidden rounded-full bg-[#111] px-8 py-4 text-white transition-all hover:bg-gray-900 active:scale-95 shadow-xl hover:shadow-2xl hover:shadow-brand-blue/20">
                <div className="relative z-10 flex items-center justify-center gap-2 font-semibold">
                  <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>Réserver une démo</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 transition-opacity duration-500 group-hover:opacity-20" />
              </MagneticButton>
            </Link>

            <Link href="/auth/register" className="w-full sm:w-auto">
              <MagneticButton className="group relative w-full sm:w-auto overflow-hidden rounded-full border border-gray-200 bg-white px-8 py-4 text-gray-900 transition-all hover:bg-gray-50 active:scale-95 shadow-sm hover:shadow-md">
                <div className="relative z-10 flex items-center justify-center gap-2 font-semibold">
                  <PlayCircle className="w-4 h-4 text-gray-500 group-hover:text-brand-blue transition-colors" />
                  <span>Démarrer un essai gratuit</span>
                </div>
              </MagneticButton>
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  )
})
