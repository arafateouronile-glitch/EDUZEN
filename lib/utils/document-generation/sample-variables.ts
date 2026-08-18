import type { DocumentVariables } from '@/lib/types/document-templates'

/**
 * Données fictives pour prévisualiser un modèle de document sans dépendre
 * de données réelles (étudiant, facture...). Utilisé par la prévisualisation
 * de modèle et par l'éditeur de zones de signature.
 */
export function getSampleDocumentVariables(): DocumentVariables {
  return {
    ecole_nom: 'École Moderne de Dakar',
    ecole_logo: '',
    ecole_adresse: '123 Avenue de l\'Education, Dakar, Sénégal',
    ecole_ville: 'Dakar',
    ecole_telephone: '+221 77 123 45 67',
    ecole_email: 'contact@ecolemoderne.sn',
    ecole_site_web: 'www.ecolemoderne.sn',
    eleve_nom: 'DIALLO',
    eleve_prenom: 'Amadou',
    eleve_numero: 'LYC001',
    eleve_date_naissance: '15/03/2007',
    eleve_classe: 'Terminale A',
    formation_nom: 'Formation en Développement Web',
    formation_code: 'DEV-WEB-2024',
    formation_duree: '6 mois',
    formation_prix: '500 000 EUR',
    session_nom: 'Session Janvier 2024',
    session_debut: '01/01/2024',
    session_fin: '30/06/2024',
    date_jour: new Date().toLocaleDateString('fr-FR'),
    date_emission: new Date().toLocaleDateString('fr-FR'),
    annee_scolaire: '2024-2025',
    numero_document: '2025-001',
    date_generation: new Date().toLocaleDateString('fr-FR'),
    numero_page: 1,
    total_pages: 1,
  }
}
