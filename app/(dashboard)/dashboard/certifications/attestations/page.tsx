'use client'

import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'

export default function AttestationsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/certifications">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attestations</h1>
          <p className="text-gray-500 text-sm mt-1">Génération et suivi des attestations de formation</p>
        </div>
      </div>

      <GlassCard className="p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="p-4 bg-blue-50 rounded-2xl">
          <FileText className="h-10 w-10 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Fonctionnalité à venir</h2>
        <p className="text-gray-500 max-w-md">
          La génération centralisée des attestations sera disponible prochainement.
          Pour générer des attestations par session, rendez-vous dans la fiche de session correspondante.
        </p>
        <Link href="/dashboard/certifications">
          <Button variant="outline">Retour aux certifications</Button>
        </Link>
      </GlassCard>
    </div>
  )
}
