import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { DemoContent } from '../demo-content'

// Lien séparé pour tester un funnel de prise de rendez-vous sans le
// formulaire de capture préalable (prénom/nom/email/organisme) — affiche
// directement le CTA Calendly. Non indexé : page de test/campagne, pas une
// page de contenu destinée au référencement.
export const metadata: Metadata = {
  title: 'Réserver une démo - EDUZEN',
  description: 'Choisissez directement votre créneau pour une démo EDUZEN en visio.',
  robots: { index: false, follow: false },
}

export default function DemoReserverPage() {
  return (
    <>
      <Navbar />
      <DemoContent skipForm />
    </>
  )
}
