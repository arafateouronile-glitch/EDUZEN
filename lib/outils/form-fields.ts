/** Champs propres à chaque outil gratuit (/outils), affichés par le formulaire commun */

import type { OutilKey } from '@/lib/outils/tools'

export interface OutilField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'date'
  required?: boolean
  placeholder?: string
  help?: string
  /** Occupe toute la largeur du formulaire */
  wide?: boolean
}

export const OUTIL_FIELDS: Record<Exclude<OutilKey, 'qualiopi'>, OutilField[]> = {
  convention: [
    { name: 'beneficiaire', label: 'Bénéficiaire (apprenant ou entreprise cliente)', type: 'text', required: true, placeholder: 'Ex. ACME SAS ou Marie Dupont', wide: true },
    { name: 'formation_nom', label: 'Intitulé de la formation', type: 'text', required: true, placeholder: 'Ex. SSIAP 1', wide: true },
    { name: 'formation_duree', label: 'Durée', type: 'text', required: true, placeholder: 'Ex. 67 heures' },
    { name: 'montant_ht', label: 'Montant HT (€)', type: 'text', placeholder: 'Ex. 1 200' },
    { name: 'session_debut', label: 'Date de début', type: 'date', required: true },
    { name: 'session_fin', label: 'Date de fin', type: 'date', required: true },
    { name: 'session_lieu', label: 'Lieu de la formation', type: 'text', placeholder: 'Ex. Paris ou à distance' },
    { name: 'session_effectif', label: 'Effectif', type: 'text', placeholder: 'Ex. 8' },
    { name: 'formation_objectifs', label: 'Objectifs', type: 'textarea', wide: true },
    { name: 'formation_contenu', label: 'Contenu / programme', type: 'textarea', wide: true },
    { name: 'formation_prerequis', label: 'Prérequis', type: 'textarea' },
    { name: 'formation_public', label: 'Public concerné', type: 'textarea' },
  ],
  reglement: [
    { name: 'horaires_ouverture', label: "Horaires d'ouverture", type: 'text', placeholder: 'Ex. du lundi au vendredi, 8h30 – 18h' , wide: true },
    { name: 'horaires_cours', label: 'Horaires des formations', type: 'text', placeholder: 'Ex. 9h – 12h30 et 13h30 – 17h', wide: true },
    { name: 'annee', label: 'Année', type: 'text', placeholder: String(new Date().getFullYear()) },
  ],
  certificat: [
    { name: 'eleve_nom', label: "Nom de l'apprenant", type: 'text', required: true },
    { name: 'eleve_prenom', label: "Prénom de l'apprenant", type: 'text', required: true },
    { name: 'entreprise_nom', label: "Entreprise de l'apprenant", type: 'text', placeholder: 'Raison sociale de l’employeur', wide: true },
    { name: 'formation_nom', label: 'Intitulé de la formation', type: 'text', required: true, wide: true },
    { name: 'session_debut', label: 'Date de début', type: 'date', required: true },
    { name: 'session_fin', label: 'Date de fin', type: 'date', required: true },
    { name: 'formation_duree', label: 'Durée réalisée', type: 'text', required: true, placeholder: 'Ex. 35 heures' },
  ],
  emargement: [
    { name: 'formation_nom', label: 'Intitulé de la formation', type: 'text', required: true, wide: true },
    { name: 'session_debut', label: 'Date de début', type: 'date', required: true },
    { name: 'session_fin', label: 'Date de fin', type: 'date', required: true },
    { name: 'session_lieu', label: 'Lieu', type: 'text' },
    { name: 'formateur', label: 'Formateur', type: 'text' },
    {
      name: 'apprenants',
      label: 'Apprenants',
      type: 'textarea',
      required: true,
      wide: true,
      placeholder: 'DUPONT Marie ; ACME SAS\nMARTIN Paul',
      help: 'Un apprenant par ligne : NOM Prénom, puis éventuellement « ; Entreprise ». 60 apprenants et 31 jours maximum.',
    },
  ],
}
