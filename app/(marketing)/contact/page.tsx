import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { ContactContent } from './contact-content'

export const metadata: Metadata = {
  title: 'Contact - Nous contacter | EduZen',
  description: 'Une question ? Besoin d\'une démo ? Contactez l\'équipe EduZen. Nous sommes là pour vous accompagner dans la digitalisation de votre organisme de formation.',
  openGraph: {
    title: 'Contact - Nous contacter | EduZen',
    description: 'Une question ? Besoin d\'une démo ? Contactez l\'équipe EduZen.',
  },
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <ContactContent />
    </>
  )
}
