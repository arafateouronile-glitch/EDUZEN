'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Navbar } from '@/components/landing/Navbar'
import { JsonLd } from '@/components/seo/JsonLd'

// ============================================
// PERFORMANCE OPTIMIZATIONS
// - Hero: SSR + CSS animations (no Framer Motion)
// - Below-fold: Lazy loaded with Suspense
// - Parallax: Loaded only after initial render
// ============================================

// ParallaxProvider - chargé en différé (pas critique pour LCP)
const ParallaxProvider = dynamic(
  () => import('@/components/providers/ParallaxProvider').then(mod => ({ default: mod.ParallaxProvider })),
  { ssr: false }
)

// Hero optimisé - SSR activé, CSS animations uniquement
const Hero = dynamic(
  () => import('@/components/landing/Hero').then(mod => ({ default: mod.Hero })),
  {
    ssr: true,
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
  }
)

// Skeleton pour les sections below-the-fold
const SectionSkeleton = () => (
  <div className="min-h-[50vh] bg-gradient-to-b from-white to-gray-50/30 animate-pulse" />
)

// Sections lazy-loaded - chargées uniquement quand visibles
const Features = dynamic(
  () => import('@/components/landing/Features').then(mod => ({ default: mod.Features })),
  { loading: () => <SectionSkeleton /> }
)

const BentoShowcase = dynamic(
  () => import('@/components/landing/BentoShowcase').then(mod => ({ default: mod.BentoShowcase })),
  { loading: () => <SectionSkeleton /> }
)

const ProductShowcase = dynamic(
  () => import('@/components/landing/ProductShowcase').then(mod => ({ default: mod.ProductShowcase })),
  { loading: () => <SectionSkeleton /> }
)

const Benefits = dynamic(
  () => import('@/components/landing/Benefits').then(mod => ({ default: mod.Benefits })),
  { loading: () => <SectionSkeleton /> }
)

const HowItWorks = dynamic(
  () => import('@/components/landing/HowItWorks').then(mod => ({ default: mod.HowItWorks })),
  { loading: () => <SectionSkeleton /> }
)

const Testimonials = dynamic(
  () => import('@/components/landing/Testimonials').then(mod => ({ default: mod.Testimonials })),
  { loading: () => <SectionSkeleton /> }
)

const Pricing = dynamic(
  () => import('@/components/landing/Pricing').then(mod => ({ default: mod.Pricing })),
  { loading: () => <SectionSkeleton /> }
)

const FAQ = dynamic(
  () => import('@/components/landing/FAQ').then(mod => ({ default: mod.FAQ })),
  { loading: () => <SectionSkeleton /> }
)

const Footer = dynamic(
  () => import('@/components/landing/Footer').then(mod => ({ default: mod.Footer })),
  { loading: () => <div className="min-h-[200px] bg-gray-900" /> }
)

export default function HomePage() {
  return (
    <ParallaxProvider>
      {/* SEO: Données structurées JSON-LD pour Google */}
      <JsonLd />

      <main className="min-h-screen bg-white selection:bg-brand-blue-pale selection:text-brand-blue-darker antialiased">
        {/* Navbar - critique, pas de lazy load */}
        <Navbar />

        {/* Hero - SSR activé, critique pour LCP */}
        <Hero />

        {/* Sections below-the-fold avec Suspense */}
        <Suspense fallback={<SectionSkeleton />}>
          <Features />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <BentoShowcase />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <ProductShowcase />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Benefits />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorks />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Testimonials />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Pricing />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <FAQ />
        </Suspense>

        <Suspense fallback={<div className="min-h-[200px] bg-gray-900" />}>
          <Footer />
        </Suspense>
      </main>
    </ParallaxProvider>
  )
}
