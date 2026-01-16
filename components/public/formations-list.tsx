'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, Euro, Star, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { TableRow } from '@/lib/types/supabase-helpers'

type PublicFormation = TableRow<'public_formations'>

interface PublicFormationsListProps {
  formations: PublicFormation[]
  featured?: boolean
}

export function PublicFormationsList({ formations, featured = false }: PublicFormationsListProps) {
  const formatPrice = (price: number | null, priceLabel?: string | null) => {
    if (!price) return priceLabel || 'Sur devis'
    return `${priceLabel ? priceLabel + ' ' : ''}${price.toFixed(2)} €`
  }

  return (
    <div className={`grid gap-6 ${featured ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
      {formations.map((formation) => (
        <Card
          key={formation.id}
          className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-200"
        >
          {/* Image de couverture */}
          {formation.cover_image_url && (
            <div className="relative h-48 w-full bg-gray-200">
              <Image
                src={formation.cover_image_url}
                alt={formation.public_title}
                fill
                className="object-cover"
              />
              {formation.is_featured && (
                <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Mise en avant
                </div>
              )}
            </div>
          )}

          <CardContent className="p-6">
            {/* Titre */}
            <h3 className="text-xl font-bold mb-2 text-gray-900 line-clamp-2">
              {formation.public_title}
            </h3>

            {/* Description courte */}
            {formation.public_description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {formation.public_description.substring(0, 150)}
                {formation.public_description.length > 150 ? '...' : ''}
              </p>
            )}

            {/* Informations */}
            <div className="space-y-2 mb-4">
              {formation.public_duration_hours && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {formation.public_duration_hours} heures
                  {formation.public_duration_days && ` (${formation.public_duration_days} jours)`}
                </div>
              )}

              {formation.public_price !== null && (
                <div className="flex items-center text-sm text-gray-600">
                  <Euro className="w-4 h-4 mr-2" />
                  {formatPrice(formation.public_price, formation.public_price_label)}
                </div>
              )}
            </div>

            {/* Bouton */}
            <Link
              href={`/formations/${formation.slug || formation.id}`}
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors font-medium"
            >
              Voir les détails
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}



