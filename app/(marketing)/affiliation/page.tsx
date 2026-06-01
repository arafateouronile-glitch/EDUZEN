import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { AffiliationContent } from './affiliation-content'

export const metadata: Metadata = {
  title: "Programme d'affiliation | EduZen",
  description:
    "Recommandez EduZen à votre réseau et touchez 20 % de commission récurrente. Programme d'affiliation gratuit et sans engagement pour les professionnels de la formation.",
  openGraph: {
    title: "Programme d'affiliation | EduZen",
    description:
      "Recommandez EduZen et percevez 20 % de commission récurrente sur chaque abonnement.",
  },
}

export default function AffiliationPage() {
  return (
    <>
      <Navbar />
      <AffiliationContent />
    </>
  )
}
