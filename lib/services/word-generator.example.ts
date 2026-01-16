/**
 * EXEMPLE D'UTILISATION DU WordGeneratorService
 * 
 * Ce fichier montre comment utiliser le service pour générer une convention de formation
 */

import { wordGeneratorService, ConventionData } from './word-generator.service'
import * as path from 'path'

/**
 * Exemple de données pour une convention de formation
 */
const exampleConventionData: ConventionData = {
  organisme: {
    nom: 'UNIVERSITE PARIS IVRY',
    adresse: '1 rue jean jacques rousseau',
    code_postal: '94200',
    ville: 'Ivry-sur-Seine',
    telephone: '0753775122',
    email: 'contact@parisivry.fr',
    siret: '12345678901234',
    numero_declaration_activite: '11 75 12345 67',
    region: 'Île-de-France',
    logo_url: 'https://example.com/logo.png',
  },

  stagiaire: {
    nom: 'Nolan',
    prenom: 'Eddie',
    date_naissance: '1998-11-23',
    adresse: '123 Rue de la République',
    code_postal: '75001',
    ville: 'Paris',
    telephone: '0612345678',
    email: 'eddie.nolan@example.com',
    numero_stagiaire: 'STU-00049',
  },

  formation: {
    titre: 'Design UI/UX avec Figma',
    code_rncp: 'RNCP12345',
    duree_heures: 35,
    duree_jours: 5,
    objectifs: 'Maîtriser les outils de design UI/UX et créer des interfaces utilisateur modernes',
    prerequis: 'Connaissances de base en design graphique',
    programme: 'Introduction à Figma, Design System, Prototypage, Collaboration',
  },

  sessions: [
    {
      date: '16 Janvier 2026',
      debut: '09:00',
      fin: '17:00',
      lieu: 'Salle A - Campus Principal',
      formateur: 'Jean Dupont',
      duree_heures: 7,
    },
    {
      date: '17 Janvier 2026',
      debut: '09:00',
      fin: '17:00',
      lieu: 'Salle A - Campus Principal',
      formateur: 'Jean Dupont',
      duree_heures: 7,
    },
    {
      date: '18 Janvier 2026',
      debut: '09:00',
      fin: '17:00',
      lieu: 'Salle B - Campus Principal',
      formateur: 'Marie Martin',
      duree_heures: 7,
    },
    {
      date: '19 Janvier 2026',
      debut: '09:00',
      fin: '17:00',
      lieu: 'Salle B - Campus Principal',
      formateur: 'Marie Martin',
      duree_heures: 7,
    },
    {
      date: '20 Janvier 2026',
      debut: '09:00',
      fin: '17:00',
      lieu: 'Salle A - Campus Principal',
      formateur: 'Jean Dupont',
      duree_heures: 7,
    },
  ],

  financement: {
    prix_ht: 1500.00,
    prix_ttc: 1800.00,
    tva: 300.00,
    mode_paiement: 'Virement bancaire',
    acompte: 600.00,
    solde: 1200.00,
    echeancier: [
      {
        date: '15 Janvier 2026',
        montant: 600.00,
        libelle: 'Acompte',
      },
      {
        date: '20 Janvier 2026',
        montant: 1200.00,
        libelle: 'Solde',
      },
    ],
  },

  dates: {
    date_signature: new Date().toISOString(),
    date_debut_formation: '2026-01-16',
    date_fin_formation: '2026-01-20',
    date_limite_inscription: '2026-01-10',
  },

  conditions: {
    annulation: 'Annulation possible jusqu\'à 7 jours avant le début de la formation',
    report: 'Report possible sous réserve de disponibilité',
    remboursement: 'Remboursement intégral en cas d\'annulation plus de 7 jours avant',
    presence_minimale: 80,
  },

  annexes: {
    annexe_2: true,
    annexe_2_contenu: 'Contenu spécifique de l\'Annexe 2 selon les besoins',
  },

  metadata: {
    numero_convention: 'CONV-2026-001',
    version: '1.0',
    date_generation: new Date().toISOString(),
  },
}

/**
 * Fonction d'exemple pour générer une convention
 */
export async function generateExampleConvention() {
  try {
    // Chemin vers le template Word
    const templatePath = path.join(
      process.cwd(),
      'templates',
      'convention-template.docx'
    )

    // Chemin de sortie
    const outputPath = path.join(
      process.cwd(),
      'output',
      `convention-${exampleConventionData.stagiaire.nom}-${exampleConventionData.stagiaire.prenom}.docx`
    )

    // Générer le document
    await wordGeneratorService.generateDoc(
      templatePath,
      exampleConventionData,
      outputPath
    )

    console.log('✅ Convention générée avec succès:', outputPath)
    return outputPath
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error)
    throw error
  }
}

// Exemple d'utilisation dans une API Route Next.js
export async function generateConventionAPI(data: ConventionData) {
  try {
    // Récupérer le template depuis Supabase ou le système de fichiers
    const templatePath = path.join(
      process.cwd(),
      'templates',
      'convention-template.docx'
    )

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const filename = `convention-${data.stagiaire.nom}-${data.stagiaire.prenom}-${timestamp}.docx`
    const outputPath = path.join(process.cwd(), 'temp', filename)

    // Générer le document
    await wordGeneratorService.generateDoc(
      templatePath,
      data,
      outputPath
    )

    // Lire le fichier généré pour le retourner
    const fs = await import('fs/promises')
    const buffer = await fs.readFile(outputPath)

    // Supprimer le fichier temporaire
    await fs.unlink(outputPath)

    return buffer
  } catch (error) {
    console.error('[API] Erreur lors de la génération:', error)
    throw error
  }
}
