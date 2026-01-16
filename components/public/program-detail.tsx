'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Users, ArrowLeft, BookOpen, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Program = TableRow<'programs'> & {
  formations?: Array<TableRow<'formations'> & {
    sessions?: TableRow<'sessions'>[]
  }>
  organizations?: TableRow<'organizations'>
}

interface PublicProgramDetailProps {
  program: Program
  primaryColor?: string
  organizationCode?: string
}

export function PublicProgramDetail({ program, primaryColor = '#274472', organizationCode }: PublicProgramDetailProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const organization = program.organizations

  return (
    <div className="min-h-screen bg-white py-12">
        {/* Header avec image */}
        {program.public_image_url && (
          <div className="relative h-64 md:h-96 w-full bg-gray-200">
            <Image
              src={program.public_image_url}
              alt={program.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
              <Link
                href={organizationCode ? `/cataloguepublic/${organizationCode}` : '/programmes'}
                className="inline-flex items-center text-white hover:text-gray-200 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au catalogue
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {program.name}
              </h1>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Contenu principal */}
            <div className="md:col-span-2 space-y-6">
              {/* Informations de l'organisme */}
              {organization && (
                <Card>
                  <CardHeader>
                    <CardTitle>Organisme de formation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {(organization.logo_url || (organization.settings && typeof organization.settings === 'object' && 'logo_url' in organization.settings && (organization.settings as any).logo_url)) && (
                        <img
                          src={organization.logo_url || (organization.settings as any)?.logo_url}
                          alt={organization.name}
                          className="h-20 w-auto object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{organization.name}</h3>
                        {organization.address && (
                          <p className="text-gray-600">{organization.address}</p>
                        )}
                      </div>
                      {/* Lien Qualiopi */}
                      {organization.settings && typeof organization.settings === 'object' && 'qualiopi_certificate_url' in organization.settings && (
                        <a
                          href={(organization.settings as any).qualiopi_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Attestation Qualiopi</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-line">
                      {program.public_description || program.description || 'Aucune description disponible.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Formations et Sessions */}
              {program.formations && program.formations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Formations et sessions disponibles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {program.formations.map((formation) => (
                      <div key={formation.id} className="border-b last:border-0 pb-6 last:pb-0">
                        <h3 className="text-lg font-semibold mb-3">{formation.name}</h3>
                        {formation.description && (
                          <p className="text-gray-600 text-sm mb-4">{formation.description}</p>
                        )}

                        {/* Sessions de cette formation */}
                        {formation.sessions && formation.sessions.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700">Sessions :</h4>
                            {formation.sessions.map((session: any) => (
                              <div
                                key={session.id}
                                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                              >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">{session.name}</div>
                                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                      {session.start_date && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-4 h-4" />
                                          <span>
                                            {formatDate(session.start_date)}
                                            {session.end_date && ` - ${formatDate(session.end_date)}`}
                                          </span>
                                        </div>
                                      )}
                                      {session.location && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-4 h-4" />
                                          <span>{session.location}</span>
                                        </div>
                                      )}
                                      {session.capacity_max && (
                                        <div className="flex items-center gap-1">
                                          <Users className="w-4 h-4" />
                                          <span>Jusqu'à {session.capacity_max} participants</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    className="text-white border-0"
                                    style={{ backgroundColor: primaryColor }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                                  >
                                    S'inscrire
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="md:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {program.formations && program.formations.length > 0 && (
                    <div className="flex items-start">
                      <BookOpen className="w-5 h-5 mr-3 mt-0.5" style={{ color: primaryColor }} />
                      <div>
                        <div className="font-semibold">Formations</div>
                        <div className="text-gray-600">
                          {program.formations.length} formation{program.formations.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  )}

                  {program.formations && (
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 mr-3 mt-0.5" style={{ color: primaryColor }} />
                      <div>
                        <div className="font-semibold">Sessions</div>
                        <div className="text-gray-600">
                          {program.formations.reduce(
                            (acc, f) => acc + (f.sessions?.length || 0),
                            0
                          )}{' '}
                          session
                          {program.formations.reduce((acc, f) => acc + (f.sessions?.length || 0), 0) > 1
                            ? 's'
                            : ''}
                        </div>
                      </div>
                    </div>
                  )}

                  {organization && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        Organisme certifié Qualiopi
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </div>
  )
}

