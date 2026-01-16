/**
 * Page d'administration - Gestion des certifications RNCP/RS
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { rncpCertificationService } from '@/lib/services/rncp-certification.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Plus, Award, CheckCircle, Calendar, Users, FileText } from 'lucide-react'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'
import Link from 'next/link'
import type { TableRow } from '@/lib/types/supabase-helpers'

// Type pour les certifications RNCP
type RNCPCertification = {
  id: string
  code?: string
  title?: string
  level?: string | number
  [key: string]: any
}

export default function CertificationsPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <CertificationsPageContent />
    </RoleGuard>
  )
}

function CertificationsPageContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: certifications, isLoading } = useQuery<RNCPCertification[]>({
    queryKey: ['rncp-certifications', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const result = await rncpCertificationService.getCertifications(user.organization_id)
      return result as RNCPCertification[]
    },
    enabled: !!user?.organization_id,
  })

  const { data: juries } = useQuery({
    queryKey: ['certification-juries', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return rncpCertificationService.getJuries(user.organization_id, { status: 'scheduled' })
    },
    enabled: !!user?.organization_id,
  })

  if (!user?.organization_id) {
    return (
      <div className="p-6">
        <p>Aucune organisation</p>
      </div>
    )
  }

  const activeCertifications = certifications?.filter((c) => c.is_active) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Certifications RNCP/RS</h1>
          <p className="text-gray-600 mt-1">Gérez vos certifications et jurys</p>
        </div>
        <Button className="bg-brand-blue hover:bg-brand-blue-dark">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle certification
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{certifications?.length || 0}</div>
            <div className="text-sm text-gray-600">Total certifications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCertifications.length}</div>
            <div className="text-sm text-gray-600">Actives</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{juries?.length || 0}</div>
            <div className="text-sm text-gray-600">Jurys à venir</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-blue" />
              <div>
                <div className="text-2xl font-bold">RNCP/RS</div>
                <div className="text-sm text-gray-600">Certifications</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/dashboard/certifications/juries">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-blue" />
                Jurys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Gérer les jurys de certification</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/certifications/attestations">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" />
                Attestations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Consulter les attestations délivrées</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-blue" />
              Calendrier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Voir le calendrier des jurys</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des certifications */}
      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : certifications && certifications.length > 0 ? (
        <div>
          <h2 className="text-xl font-bold mb-4">Certifications</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {certifications.map((certification) => (
              <CertificationCard key={certification.id} certification={certification} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Aucune certification enregistrée</p>
            <Button className="bg-brand-blue hover:bg-brand-blue-dark">
              <Plus className="w-4 h-4 mr-2" />
              Créer la première certification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface CertificationCardProps {
  certification: RNCPCertification
}

function CertificationCard({ certification }: CertificationCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'Non définie'
    return new Date(date).toLocaleDateString('fr-FR')
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle>{certification.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full ${
                  certification.certification_type === 'RNCP'
                    ? 'bg-blue-100 text-blue-800'
                    : certification.certification_type === 'RS'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {certification.certification_type}
              </span>
              {certification.rncp_code && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                  {certification.rncp_code}
                </span>
              )}
              {certification.level && (
                <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                  Niveau {certification.level}
                </span>
              )}
            </div>
          </div>
          {certification.is_active ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {certification.validity_start_date && (
          <div className="text-sm text-gray-600">
            <strong>Validité :</strong> Du {formatDate(certification.validity_start_date)} au{' '}
            {formatDate(certification.validity_end_date)}
          </div>
        )}

        {certification.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{certification.description}</p>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1">
            <FileText className="w-3 h-3 mr-1" />
            Détails
          </Button>
          <Button variant="outline" size="sm">
            <Users className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

