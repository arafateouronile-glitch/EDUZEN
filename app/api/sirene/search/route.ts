import { NextRequest, NextResponse } from 'next/server'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * API Route pour rechercher des informations d'entreprise via l'API SIRENE
 * Documentation: https://api.insee.fr/
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const siret = searchParams.get('siret')
    const siren = searchParams.get('siren')
    const name = searchParams.get('name')

    if (!siret && !siren && !name) {
      return NextResponse.json(
        { error: 'SIRET, SIREN ou nom d\'entreprise requis' },
        { status: 400 }
      )
    }

    // Clé API SIRENE (à configurer dans les variables d'environnement)
    const apiKey = process.env.SIRENE_API_KEY || process.env.NEXT_PUBLIC_SIRENE_API_KEY

    if (!apiKey) {
      logger.warn('SIRENE API - Clé API non configurée')
      return NextResponse.json(
        { error: 'Configuration API SIRENE manquante' },
        { status: 500 }
      )
    }

    let url = ''
    
    // Recherche par SIRET (14 chiffres)
    if (siret && siret.length === 14) {
      url = `https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`
    }
    // Recherche par SIREN (9 chiffres)
    else if (siren && siren.length === 9) {
      url = `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`
    }
    // Recherche par nom (nécessite une recherche plus complexe)
    else if (name) {
      // Recherche par dénomination
      url = `https://api.insee.fr/entreprises/sirene/V3.11/siret?q=denominationUniteLegale:"${encodeURIComponent(name)}"&nombre=10`
    } else {
      return NextResponse.json(
        { error: 'Format de recherche invalide' },
        { status: 400 }
      )
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('SIRENE API - Erreur de l\'API', new Error(errorText), {
        status: response.status,
        url,
      })
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Entreprise non trouvée' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Erreur lors de la recherche SIRENE' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Formater les données pour notre format
    let formattedData: {
      siret: string
      siren: string
      name: string
      address: string
      postalCode: string
      city: string
      activity?: string
      legalForm?: string
    } | null = null

    if (siret || siren) {
      // Résultat direct pour SIRET/SIREN
      const etablissement = data.etablissement || data
      const uniteLegale = etablissement?.uniteLegale || data.uniteLegale

      formattedData = {
        siret: etablissement?.siret || siret || '',
        siren: etablissement?.siren || siren || '',
        name: uniteLegale?.denominationUniteLegale || uniteLegale?.denominationUsuelleUniteLegale || '',
        address: [
          etablissement?.adresseEtablissement?.numeroVoieEtablissement,
          etablissement?.adresseEtablissement?.typeVoieEtablissement,
          etablissement?.adresseEtablissement?.libelleVoieEtablissement,
        ].filter(Boolean).join(' '),
        postalCode: etablissement?.adresseEtablissement?.codePostalEtablissement || '',
        city: etablissement?.adresseEtablissement?.libelleCommuneEtablissement || '',
        activity: uniteLegale?.activitePrincipaleUniteLegale || '',
        legalForm: uniteLegale?.categorieJuridiqueUniteLegale || '',
      }
    } else if (name) {
      // Résultat de recherche - prendre le premier résultat
      const etablissements = data.etablissements || []
      if (etablissements.length > 0) {
        const first = etablissements[0].etablissement
        const uniteLegale = first?.uniteLegale

        formattedData = {
          siret: first?.siret || '',
          siren: first?.siren || '',
          name: uniteLegale?.denominationUniteLegale || uniteLegale?.denominationUsuelleUniteLegale || '',
          address: [
            first?.adresseEtablissement?.numeroVoieEtablissement,
            first?.adresseEtablissement?.typeVoieEtablissement,
            first?.adresseEtablissement?.libelleVoieEtablissement,
          ].filter(Boolean).join(' '),
          postalCode: first?.adresseEtablissement?.codePostalEtablissement || '',
          city: first?.adresseEtablissement?.libelleCommuneEtablissement || '',
          activity: uniteLegale?.activitePrincipaleUniteLegale || '',
          legalForm: uniteLegale?.categorieJuridiqueUniteLegale || '',
        }
      }
    }

    if (!formattedData) {
      return NextResponse.json(
        { error: 'Aucune donnée trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    const searchParams = request.nextUrl.searchParams
    const siretParam = searchParams.get('siret')
    const sirenParam = searchParams.get('siren')
    const nameParam = searchParams.get('name')
    logger.error('SIRENE API - Erreur serveur', error, { 
      error: sanitizeError(error),
      siret: siretParam || undefined,
      siren: sirenParam || undefined,
      name: nameParam || undefined,
    })
    
    // Retourner un message d'erreur plus détaillé en développement
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur lors de la recherche SIRENE'
    const isDev = process.env.NODE_ENV === 'development'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(isDev && { details: sanitizeError(error) })
      },
      { status: 500 }
    )
  }
}
