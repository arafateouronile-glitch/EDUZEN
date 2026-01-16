'use server'

import { NextRequest, NextResponse } from 'next/server'
// import { wordGeneratorService, ConventionData } from '@/lib/services/word-generator.service' // TODO: Implémenter wordGeneratorService
import * as path from 'path'
import * as fs from 'fs/promises'

// Type temporaire en attendant l'implémentation
type ConventionData = any

/**
 * Route API pour générer un document Word à partir d'un template docxtemplater
 * 
 * POST /api/documents/generate-word-template
 * Body: { templatePath, data, outputPath? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templatePath, data, outputPath } = body

    if (!templatePath || !data) {
      return NextResponse.json(
        { error: 'templatePath et data sont requis' },
        { status: 400 }
      )
    }

    // Si outputPath n'est pas fourni, générer un chemin temporaire
    const finalOutputPath = outputPath || path.join(
      process.cwd(),
      'temp',
      `convention-${Date.now()}.docx`
    )

    // TODO: Implémenter wordGeneratorService.generateDoc dans lib/services/word-generator.service.ts
    return NextResponse.json(
      { error: 'La génération de documents Word via template n\'est pas encore implémentée.' },
      { status: 501 }
    )

    // Générer le document (code commenté en attendant l'implémentation)
    // await wordGeneratorService.generateDoc(
    //   templatePath,
    //   data as ConventionData,
    //   finalOutputPath
    // )

    // Lire le fichier généré
    const buffer = await fs.readFile(finalOutputPath)

    // Supprimer le fichier temporaire si nécessaire
    if (!outputPath) {
      await fs.unlink(finalOutputPath).catch(() => {
        // Ignorer les erreurs de suppression
      })
    }

    // Retourner le fichier
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="convention-${data.stagiaire?.nom || 'document'}.docx"`,
      },
    })
  } catch (error: any) {
    console.error('[API] Erreur lors de la génération Word:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du document Word',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
