import { NextRequest, NextResponse } from 'next/server'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * API Route pour la géocodage inverse (coordonnées GPS -> adresse)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'latitude et longitude requis' },
        { status: 400 }
      )
    }

    // Utiliser l'API Nominatim (OpenStreetMap) pour le géocodage inverse
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'EDUZEN/1.0',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Erreur lors du géocodage inverse')
    }

    const data = await response.json()
    const address = data.display_name || `${latitude}, ${longitude}`

    return NextResponse.json({
      success: true,
      address,
      details: data.address,
    })
  } catch (error: unknown) {
    logger.error('Error in reverse geocoding:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors du géocodage inverse'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
