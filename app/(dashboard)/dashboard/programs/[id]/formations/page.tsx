'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { programService } from '@/lib/services/program.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Search, BookMarked, Calendar, Clock, DollarSign, Users, Filter } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function ProgramFormationsPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  // Récupérer le programme
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => programService.getProgramById(programId),
    enabled: !!programId,
  })

  // Récupérer les formations du programme
  const { data: formations, isLoading: formationsLoading } = useQuery({
    queryKey: ['program-formations', programId, search, showActiveOnly],
    queryFn: async () => {
      const allFormations = await programService.getFormationsByProgram(programId)
      let filtered = allFormations || []

      // Filtrer par statut
      if (showActiveOnly) {
        filtered = filtered.filter((f: any) => f.is_active)
      }

      // Filtrer par recherche
      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter((f: any) =>
          f.name?.toLowerCase().includes(searchLower) ||
          f.code?.toLowerCase().includes(searchLower) ||
          f.description?.toLowerCase().includes(searchLower)
        )
      }

      return filtered
    },
    enabled: !!programId,
  })

  if (programLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Programme non trouvé</div>
          <Link href="/dashboard/programs">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const formationsList = formations || []

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/programs/${programId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Formations</h1>
            <p className="mt-2 text-sm text-gray-600">
              Programme: <Link href={`/dashboard/programs/${programId}`} className="text-primary hover:underline">
                {program.name}
              </Link>
            </p>
          </div>
        </div>
        <Link href="/dashboard/formations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle formation
          </Button>
        </Link>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une formation..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activeOnly"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="activeOnly" className="text-sm text-gray-600">
                  Actives uniquement
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {formationsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Chargement...
            </div>
          ) : formationsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {formationsList.map((formation: any) => (
                <Card key={formation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{formation.name}</CardTitle>
                        {formation.subtitle && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {formation.subtitle}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Code: {formation.code}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          formation.is_active
                            ? 'bg-success-bg text-success-primary'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {formation.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {formation.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {formation.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {formation.duration_hours && (
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {formation.duration_hours}h
                        </div>
                      )}
                      {formation.price && (
                        <div className="flex items-center">
                          <DollarSign className="mr-1 h-4 w-4" />
                          {formatCurrency(Number(formation.price), formation.currency || 'XOF')}
                        </div>
                      )}
                    </div>

                    {formation.capacity_max && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-1 h-4 w-4" />
                        Capacité: {formation.capacity_max} apprenants
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Link href={`/dashboard/formations/${formation.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          Voir détails
                        </Button>
                      </Link>
                      <Link href={`/dashboard/formations/${formation.id}/sessions`} className="flex-1">
                        <Button variant="default" className="w-full" size="sm">
                          Sessions
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookMarked className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Aucune formation trouvée</p>
              {search || showActiveOnly ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm">Essayez de modifier vos filtres</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('')
                      setShowActiveOnly(false)
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              ) : (
                <Link href="/dashboard/formations/new">
                  <Button variant="outline" className="mt-4">
                    Créer une formation
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{formationsList.length}</div>
              <div className="text-sm text-muted-foreground">Total des formations</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success-primary">
                {formationsList.filter((f: any) => f.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Formations actives</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {formationsList.filter((f: any) => !f.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Formations inactives</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

