'use client'

import dynamic from 'next/dynamic'
import { Navbar } from '@/components/landing/Navbar'

// Lazy load ParallaxProvider pour améliorer LCP (react-scroll-parallax ~30KB)
// Note: 'use client' nécessaire pour utiliser ssr: false
const ParallaxProvider = dynamic(() => import('@/components/providers/ParallaxProvider').then(mod => ({ default: mod.ParallaxProvider })), {
  ssr: false, // Désactiver SSR pour ParallaxProvider (nécessite window)
})

// Hero avec SSR pour LCP optimal - animations réduites au chargement initial
const Hero = dynamic(() => import('@/components/landing/Hero').then(mod => ({ default: mod.Hero })), {
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
  ssr: true, // Garder SSR pour Hero (contenu critique)
})

// Lazy load composants non-critiques pour améliorer LCP et TBT
const Features = dynamic(() => import('@/components/landing/Features').then(mod => ({ default: mod.Features })), {
  loading: () => <div className="min-h-screen" />,
})
const BentoShowcase = dynamic(() => import('@/components/landing/BentoShowcase').then(mod => ({ default: mod.BentoShowcase })), {
  loading: () => <div className="min-h-screen" />,
})
const ProductShowcase = dynamic(() => import('@/components/landing/ProductShowcase').then(mod => ({ default: mod.ProductShowcase })), {
  loading: () => <div className="min-h-screen" />,
})
const Testimonials = dynamic(() => import('@/components/landing/Testimonials').then(mod => ({ default: mod.Testimonials })), {
  loading: () => <div className="min-h-screen" />,
})
const Pricing = dynamic(() => import('@/components/landing/Pricing').then(mod => ({ default: mod.Pricing })), {
  loading: () => <div className="min-h-screen" />,
})
const FAQ = dynamic(() => import('@/components/landing/FAQ').then(mod => ({ default: mod.FAQ })), {
  loading: () => <div className="min-h-screen" />,
})
const Footer = dynamic(() => import('@/components/landing/Footer').then(mod => ({ default: mod.Footer })), {
  loading: () => <div className="min-h-[200px]" />,
})

export default function HomePage() {
  return (
    <ParallaxProvider>
      <main className="min-h-screen bg-white selection:bg-brand-blue-pale selection:text-brand-blue-darker smooth-scroll-premium antialiased">
        <Navbar />
        {/* Hero lazy loaded pour améliorer LCP - se charge après Navbar */}
        <Hero />
        {/* Composants non-critiques lazy loaded */}
        <Features />
        <BentoShowcase />
        <ProductShowcase />
        <Testimonials />
        <Pricing />
        <FAQ />
        <Footer />
      </main>
    </ParallaxProvider>
  )
}
