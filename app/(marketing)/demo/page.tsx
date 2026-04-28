import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { DemoContent } from './demo-content'

export const metadata: Metadata = {
  title: 'Démo - Voir EDUZEN en action',
  description: 'Découvrez EDUZEN en action : gestion des formations, conformité Qualiopi, émargement digital et facturation automatisée.',
}

export default function DemoPage() {
  return (
    <>
      <Navbar />
      <DemoContent />
    </>
  )
}
