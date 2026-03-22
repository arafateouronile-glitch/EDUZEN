import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { AboutContent } from './about-content'

export const metadata: Metadata = {
  title: 'À propos - Notre histoire | EduZen',
  description: 'Découvrez l\'histoire d\'EduZen, une solution créée par des professionnels de la formation, pour des professionnels de la formation. Notre mission : simplifier votre quotidien.',
  openGraph: {
    title: 'À propos - Notre histoire | EduZen',
    description: 'Découvrez l\'histoire d\'EduZen, une solution créée par des professionnels de la formation.',
  },
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <AboutContent />
    </>
  )
}
