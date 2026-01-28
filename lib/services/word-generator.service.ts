'use server'

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as fs from 'fs/promises'
import * as path from 'path'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * Interface pour les données d'une convention de formation
 */
export interface ConventionData {
  // Informations de l'organisme
  organisme: {
    nom: string
    adresse: string
    code_postal: string
    ville: string
    telephone?: string
    email?: string
    siret: string
    numero_declaration_activite: string
    region?: string
    logo_url?: string
  }

  // Informations du stagiaire
  stagiaire: {
    nom: string
    prenom: string
    date_naissance?: string
    adresse?: string
    code_postal?: string
    ville?: string
    telephone?: string
    email?: string
    numero_stagiaire?: string
  }

  // Informations de la formation
  formation: {
    titre: string
    code_rncp?: string
    duree_heures?: number
    duree_jours?: number
    objectifs?: string
    prerequis?: string
    programme?: string
  }

  // Sessions de formation (tableau dynamique)
  sessions: Array<{
    date: string // Format: "16 Janvier 2026"
    debut: string // Format: "09:00"
    fin: string // Format: "17:00"
    lieu: string
    formateur?: string
    duree_heures?: number
  }>

  // Informations financières
  financement?: {
    prix_ht: number
    prix_ttc: number
    tva?: number
    mode_paiement?: string
    acompte?: number
    solde?: number
    echeancier?: Array<{
      date: string
      montant: number
      libelle: string
    }>
  }

  // Dates importantes
  dates: {
    date_signature?: string
    date_debut_formation?: string
    date_fin_formation?: string
    date_limite_inscription?: string
  }

  // Conditions et clauses
  conditions?: {
    annulation?: string
    report?: string
    remboursement?: string
    presence_minimale?: number // Pourcentage
  }

  // Annexes conditionnelles
  annexes?: {
    annexe_2?: boolean // Afficher l'Annexe 2 uniquement si nécessaire
    annexe_2_contenu?: string
  }

  // Métadonnées
  metadata?: {
    numero_convention?: string
    version?: string
    date_generation?: string
  }
}

/**
 * Service de génération de documents Word avec docxtemplater
 */
export class WordGeneratorService {
  /**
   * Génère un document Word à partir d'un template et de données
   * 
   * @param templatePath - Chemin vers le fichier template .docx
   * @param data - Données à injecter dans le template
   * @param outputPath - Chemin où sauvegarder le document généré
   * @returns Promise<void>
   */
  async generateDoc(
    templatePath: string,
    data: ConventionData,
    outputPath: string
  ): Promise<void> {
    try {
      // 1. Lire le fichier template
      const templateBuffer = await fs.readFile(templatePath)
      
      // 2. Décompresser le fichier .docx (qui est un ZIP)
      const zip = new PizZip(templateBuffer)
      
      // 3. Créer l'instance docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true, // Permet de boucler sur les paragraphes
        linebreaks: true, // Gère les retours à la ligne dans les variables
        delimiters: {
          start: '{',
          end: '}',
        },
      })

      // 4. Préparer les données pour docxtemplater
      const templateData = this.prepareData(data)

      // 5. Remplacer les balises dans le template
      doc.render(templateData)

      // 6. Générer le document final
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })

      // 7. Créer le répertoire de sortie s'il n'existe pas
      const outputDir = path.dirname(outputPath)
      await fs.mkdir(outputDir, { recursive: true })

      // 8. Sauvegarder le document
      await fs.writeFile(outputPath, buffer)

      logger.info('WordGeneratorService - Document généré avec succès', { outputPath })
    } catch (error: any) {
      logger.error('WordGeneratorService - Erreur lors de la génération', error, { error: sanitizeError(error) })
      
      // Gestion des erreurs spécifiques à docxtemplater
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
          .map((e: any) => e.message)
          .join(', ')
        throw new Error(`Erreur docxtemplater: ${errorMessages}`)
      }
      
      throw error
    }
  }

  /**
   * Prépare les données pour docxtemplater
   * Formate les dates, gère les tableaux, etc.
   */
  private prepareData(data: ConventionData): any {
    const prepared: any = {
      // Informations de l'organisme
      organisme_nom: data.organisme.nom,
      organisme_adresse: data.organisme.adresse,
      organisme_code_postal: data.organisme.code_postal,
      organisme_ville: data.organisme.ville,
      organisme_adresse_complete: `${data.organisme.adresse}, ${data.organisme.code_postal} ${data.organisme.ville}`,
      organisme_telephone: data.organisme.telephone || '',
      organisme_email: data.organisme.email || '',
      organisme_siret: data.organisme.siret,
      organisme_nda: data.organisme.numero_declaration_activite,
      organisme_region: data.organisme.region || '',
      organisme_logo: data.organisme.logo_url || '',

      // Informations du stagiaire
      stagiaire_nom: data.stagiaire.nom,
      stagiaire_prenom: data.stagiaire.prenom,
      stagiaire_nom_complet: `${data.stagiaire.prenom} ${data.stagiaire.nom}`,
      stagiaire_date_naissance: data.stagiaire.date_naissance 
        ? this.formatDate(data.stagiaire.date_naissance) 
        : '',
      stagiaire_adresse: data.stagiaire.adresse || '',
      stagiaire_code_postal: data.stagiaire.code_postal || '',
      stagiaire_ville: data.stagiaire.ville || '',
      stagiaire_adresse_complete: data.stagiaire.adresse && data.stagiaire.code_postal && data.stagiaire.ville
        ? `${data.stagiaire.adresse}, ${data.stagiaire.code_postal} ${data.stagiaire.ville}`
        : '',
      stagiaire_telephone: data.stagiaire.telephone || '',
      stagiaire_email: data.stagiaire.email || '',
      stagiaire_numero: data.stagiaire.numero_stagiaire || '',

      // Informations de la formation
      formation_titre: data.formation.titre,
      formation_code_rncp: data.formation.code_rncp || '',
      formation_duree_heures: data.formation.duree_heures || 0,
      formation_duree_jours: data.formation.duree_jours || 0,
      formation_objectifs: data.formation.objectifs || '',
      formation_prerequis: data.formation.prerequis || '',
      formation_programme: data.formation.programme || '',

      // Sessions de formation (tableau pour boucle)
      sessions: data.sessions.map(session => ({
        date: session.date,
        debut: session.debut,
        fin: session.fin,
        lieu: session.lieu,
        formateur: session.formateur || '',
        duree_heures: session.duree_heures || 0,
        horaire: `${session.debut} - ${session.fin}`,
      })),

      // Informations financières
      prix_ht: data.financement?.prix_ht || 0,
      prix_ttc: data.financement?.prix_ttc || 0,
      tva: data.financement?.tva || 0,
      prix_ht_formate: this.formatCurrency(data.financement?.prix_ht || 0),
      prix_ttc_formate: this.formatCurrency(data.financement?.prix_ttc || 0),
      tva_formate: this.formatCurrency(data.financement?.tva || 0),
      mode_paiement: data.financement?.mode_paiement || '',
      acompte: data.financement?.acompte || 0,
      acompte_formate: this.formatCurrency(data.financement?.acompte || 0),
      solde: data.financement?.solde || 0,
      solde_formate: this.formatCurrency(data.financement?.solde || 0),
      echeancier: data.financement?.echeancier?.map(e => ({
        date: e.date,
        montant: e.montant,
        montant_formate: this.formatCurrency(e.montant),
        libelle: e.libelle,
      })) || [],

      // Dates importantes
      date_signature: data.dates.date_signature 
        ? this.formatDate(data.dates.date_signature) 
        : this.formatDate(new Date().toISOString()),
      date_debut_formation: data.dates.date_debut_formation 
        ? this.formatDate(data.dates.date_debut_formation) 
        : '',
      date_fin_formation: data.dates.date_fin_formation 
        ? this.formatDate(data.dates.date_fin_formation) 
        : '',
      date_limite_inscription: data.dates.date_limite_inscription 
        ? this.formatDate(data.dates.date_limite_inscription) 
        : '',

      // Conditions
      condition_annulation: data.conditions?.annulation || '',
      condition_report: data.conditions?.report || '',
      condition_remboursement: data.conditions?.remboursement || '',
      presence_minimale: data.conditions?.presence_minimale || 80,

      // Annexes conditionnelles
      afficher_annexe_2: data.annexes?.annexe_2 || false,
      annexe_2_contenu: data.annexes?.annexe_2_contenu || '',

      // Métadonnées
      numero_convention: data.metadata?.numero_convention || '',
      version: data.metadata?.version || '1.0',
      date_generation: data.metadata?.date_generation 
        ? this.formatDate(data.metadata.date_generation) 
        : this.formatDate(new Date().toISOString()),
    }

    return prepared
  }

  /**
   * Formate une date au format français
   * Exemple: "16 Janvier 2026"
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      return format(date, 'd MMMM yyyy', { locale: fr })
    } catch (error) {
      logger.error('WordGeneratorService - Erreur de formatage de date', error, { error: sanitizeError(error) })
      return dateString
    }
  }

  /**
   * Formate un montant en devise
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }
}

// Instance singleton
export const wordGeneratorService = new WordGeneratorService()
