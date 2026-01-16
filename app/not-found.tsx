'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Page introuvable</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                La page que vous recherchez n'existe pas ou a été déplacée
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Il semble que la page que vous recherchez n'existe pas. 
              Elle a peut-être été supprimée, déplacée ou l'URL est incorrecte.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/dashboard" className="flex-1">
                <Button
                  variant="default"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Retour au tableau de bord
                </Button>
              </Link>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                Page précédente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
