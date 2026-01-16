'use client'

import dynamic from 'next/dynamic'
import { Navbar } from '@/components/landing/Navbar'

// Lazy load ParallaxProvider pour améliorer LCP (react-scroll-parallax ~30KB)
// Note: 'use client' nécessaire pour utiliser ssr: false
const ParallaxProvider = dynamic(() => import('@/components/providers/ParallaxProvider').then(mod => ({ default: mod.ParallaxProvider })), {
  ssr: false, // Désactiver SSR pour ParallaxProvider (nécessite window)
})

// Lazy load Hero component pour améliorer LCP (framer-motion ~50KB)
const Hero = dynamic(() => import('@/components/landing/Hero').then(mod => ({ default: mod.Hero })), {
  loading: () => <div className="min-h-screen" />,
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
