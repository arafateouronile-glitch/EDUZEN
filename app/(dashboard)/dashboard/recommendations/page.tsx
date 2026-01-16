'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RecommendationsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8" />
          Recommandations
        </h1>
        <p className="text-muted-foreground">
          Découvrez des recommandations personnalisées pour améliorer votre expérience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommandations</CardTitle>
          <CardDescription>
            Cette fonctionnalité sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Les recommandations personnalisées vous aideront à optimiser votre utilisation de la plateforme.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}













