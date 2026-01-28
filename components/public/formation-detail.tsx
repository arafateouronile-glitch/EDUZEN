'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, MapPin, Euro, Calendar, Users, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnrollmentForm } from './enrollment-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import type { TableRow } from '@/lib/types/supabase-helpers'

type PublicFormation = TableRow<'public_formations'>

interface PublicFormationDetailProps {
  formation: PublicFormation
}

export function PublicFormationDetail({ formation }: PublicFormationDetailProps) {
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)

  const formatPrice = (price: number | null, priceLabel?: string | null) => {
    if (!price) return priceLabel || 'Sur devis'
    return `${priceLabel ? priceLabel + ' ' : ''}${price.toFixed(2)} €`
  }

  const isRegistrationOpen = formation.allow_online_registration && (
    !formation.registration_deadline || new Date(formation.registration_deadline) > new Date()
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
      {/* Header avec image */}
      {formation.cover_image_url && (
        <div className="relative h-64 md:h-96 w-full bg-gray-200">
          <Image
            src={formation.cover_image_url}
            alt={formation.public_title}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <Link
              href="/formations"
              className="inline-flex items-center text-white hover:text-gray-200 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au catalogue
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              {formation.public_title}
            </h1>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="md:col-span-2 space-y-6">
            {/* Informations clés */}
            <Card>
              <CardHeader>
                <CardTitle>Informations clés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formation.public_duration_hours && (
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 mr-3 text-brand-blue mt-0.5" />
                    <div>
                      <div className="font-semibold">Durée</div>
                      <div className="text-gray-600">
                        {formation.public_duration_hours} heures
                        {formation.public_duration_days && ` (${formation.public_duration_days} jours)`}
                      </div>
                    </div>
                  </div>
                )}

                {formation.public_price !== null && (
                  <div className="flex items-start">
                    <Euro className="w-5 h-5 mr-3 text-brand-blue mt-0.5" />
                    <div>
                      <div className="font-semibold">Prix</div>
                      <div className="text-gray-600">
                        {formatPrice(formation.public_price, formation.public_price_label)}
                      </div>
                    </div>
                  </div>
                )}

                {formation.min_participants && formation.max_participants && (
                  <div className="flex items-start">
                    <Users className="w-5 h-5 mr-3 text-brand-blue mt-0.5" />
                    <div>
                      <div className="font-semibold">Effectif</div>
                      <div className="text-gray-600">
                        De {formation.min_participants} à {formation.max_participants} participants
                      </div>
                    </div>
                  </div>
                )}

                {formation.registration_deadline && (
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 mr-3 text-brand-blue mt-0.5" />
                    <div>
                      <div className="font-semibold">Date limite d'inscription</div>
                      <div className="text-gray-600">
                        {new Date(formation.registration_deadline).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {formation.public_description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-line">{formation.public_description}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Objectifs */}
            {formation.public_objectives && (
              <Card>
                <CardHeader>
                  <CardTitle>Objectifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-line">{formation.public_objectives}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prérequis */}
            {formation.public_prerequisites && (
              <Card>
                <CardHeader>
                  <CardTitle>Prérequis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-line">{formation.public_prerequisites}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Galerie d'images */}
            {formation.gallery_images && formation.gallery_images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Galerie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formation.gallery_images.map((imageUrl, index) => (
                      <div key={index} className="relative h-48 bg-gray-200 rounded-lg overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={`${formation.public_title} - Image ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar avec CTA */}
          <div className="md:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Inscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isRegistrationOpen ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Inscrivez-vous en ligne à cette formation. Un responsable vous contactera pour finaliser votre inscription.
                    </p>
                    <Button
                      onClick={() => setShowEnrollmentForm(true)}
                      className="w-full bg-brand-blue hover:bg-brand-blue-dark"
                      size="lg"
                    >
                      S'inscrire en ligne
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-4">
                      {formation.registration_deadline
                        ? "Les inscriptions sont closes pour cette formation."
                        : "Les inscriptions en ligne ne sont pas disponibles pour cette formation."}
                    </p>
                    <p className="text-xs text-gray-500">
                      Contactez-nous pour plus d'informations.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Formation certifiée
                  </div>
                  {formation.available_at_sites && formation.available_at_sites.length > 0 && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 text-brand-blue" />
                      <span>Disponible dans {formation.available_at_sites.length} site{formation.available_at_sites.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal d'inscription */}
      <Dialog open={showEnrollmentForm} onOpenChange={setShowEnrollmentForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inscription en ligne</DialogTitle>
          </DialogHeader>
          <EnrollmentForm
            formation={formation}
            onSuccess={() => setShowEnrollmentForm(false)}
            onCancel={() => setShowEnrollmentForm(false)}
          />
        </DialogContent>
      </Dialog>
      </div>
      <Footer />
    </>
  )
}

