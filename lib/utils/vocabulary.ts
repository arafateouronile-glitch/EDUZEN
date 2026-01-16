/**
 * Système de vocabulaire adaptatif pour EDUZEN
 * Permet d'adapter la terminologie selon le type d'organisation
 */

export type OrganizationType = 'training_organization' | 'school' | 'both'

export interface Vocabulary {
  // Personnes
  student: string
  students: string
  student_singular: string
  student_plural: string
  student_label: string
  student_number: string
  
  // Formations/Cours
  course: string
  courses: string
  course_singular: string
  course_plural: string
  course_label: string
  
  // Documents
  report_card: string
  report_cards: string
  report_card_singular: string
  report_card_plural: string
  certificate: string
  certificates: string
  attestation: string
  attestations: string
  
  // Périodes
  academic_year: string
  academic_years: string
  session: string
  sessions: string
  term: string
  terms: string
  
  // Inscriptions
  enrollment: string
  enrollments: string
  enrollment_singular: string
  enrollment_plural: string
  
  // Évaluations
  grade: string
  grades: string
  evaluation: string
  evaluations: string
  assessment: string
  assessments: string
  
  // Présence
  attendance: string
  attendance_singular: string
  attendance_plural: string
  
  // Paiements
  payment: string
  payments: string
  invoice: string
  invoices: string
  
  // Classes/Groups
  class: string
  classes: string
  group: string
  groups: string
  
  // Autres
  teacher: string
  teachers: string
  trainer: string
  trainers: string
  organization: string
  establishment: string
}

export const vocabularies: Record<OrganizationType, Vocabulary> = {
  training_organization: {
    // Personnes
    student: 'Stagiaire',
    students: 'Stagiaires',
    student_singular: 'le stagiaire',
    student_plural: 'les stagiaires',
    student_label: 'Stagiaire',
    student_number: 'Numéro de stagiaire',
    
    // Formations
    course: 'Formation',
    courses: 'Formations',
    course_singular: 'la formation',
    course_plural: 'les formations',
    course_label: 'Formation',
    
    // Documents
    report_card: 'Attestation de formation',
    report_cards: 'Attestations de formation',
    report_card_singular: "l'attestation de formation",
    report_card_plural: 'les attestations de formation',
    certificate: 'Certificat',
    certificates: 'Certificats',
    attestation: 'Attestation',
    attestations: 'Attestations',
    
    // Périodes
    academic_year: 'Session de formation',
    academic_years: 'Sessions de formation',
    session: 'Session',
    sessions: 'Sessions',
    term: 'Période',
    terms: 'Périodes',
    
    // Inscriptions
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
    enrollment_singular: "l'inscription",
    enrollment_plural: 'les inscriptions',
    
    // Évaluations
    grade: 'Note',
    grades: 'Notes',
    evaluation: 'Évaluation',
    evaluations: 'Évaluations',
    assessment: 'Évaluation de compétences',
    assessments: 'Évaluations de compétences',
    
    // Présence
    attendance: 'Présence',
    attendance_singular: 'la présence',
    attendance_plural: 'les présences',
    
    // Paiements
    payment: 'Paiement',
    payments: 'Paiements',
    invoice: 'Facture',
    invoices: 'Factures',
    
    // Classes/Groups
    class: 'Groupe',
    classes: 'Groupes',
    group: 'Groupe',
    groups: 'Groupes',
    
    // Autres
    teacher: 'Formateur',
    teachers: 'Formateurs',
    trainer: 'Formateur',
    trainers: 'Formateurs',
    organization: 'Organisme de Formation',
    establishment: 'Organisme de Formation',
  },
  
  school: {
    // Personnes
    student: 'Élève',
    students: 'Élèves',
    student_singular: "l'élève",
    student_plural: 'les élèves',
    student_label: 'Élève',
    student_number: 'Numéro d\'élève',
    
    // Formations
    course: 'Cours',
    courses: 'Cours',
    course_singular: 'le cours',
    course_plural: 'les cours',
    course_label: 'Cours',
    
    // Documents
    report_card: 'Bulletin',
    report_cards: 'Bulletins',
    report_card_singular: 'le bulletin',
    report_card_plural: 'les bulletins',
    certificate: 'Certificat',
    certificates: 'Certificats',
    attestation: 'Attestation',
    attestations: 'Attestations',
    
    // Périodes
    academic_year: 'Année scolaire',
    academic_years: 'Années scolaires',
    session: 'Trimestre',
    sessions: 'Trimestres',
    term: 'Trimestre',
    terms: 'Trimestres',
    
    // Inscriptions
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
    enrollment_singular: "l'inscription",
    enrollment_plural: 'les inscriptions',
    
    // Évaluations
    grade: 'Note',
    grades: 'Notes',
    evaluation: 'Évaluation',
    evaluations: 'Évaluations',
    assessment: 'Contrôle',
    assessments: 'Contrôles',
    
    // Présence
    attendance: 'Présence',
    attendance_singular: 'la présence',
    attendance_plural: 'les présences',
    
    // Paiements
    payment: 'Paiement',
    payments: 'Paiements',
    invoice: 'Facture',
    invoices: 'Factures',
    
    // Classes/Groups
    class: 'Classe',
    classes: 'Classes',
    group: 'Groupe',
    groups: 'Groupes',
    
    // Autres
    teacher: 'Professeur',
    teachers: 'Professeurs',
    trainer: 'Enseignant',
    trainers: 'Enseignants',
    organization: 'Établissement',
    establishment: 'Établissement scolaire',
  },
  
  both: {
    // Vocabulaire générique
    student: 'Apprenant',
    students: 'Apprenants',
    student_singular: "l'apprenant",
    student_plural: 'les apprenants',
    student_label: 'Apprenant',
    student_number: 'Numéro d\'apprenant',
    
    course: 'Formation',
    courses: 'Formations',
    course_singular: 'la formation',
    course_plural: 'les formations',
    course_label: 'Formation',
    
    report_card: 'Document',
    report_cards: 'Documents',
    report_card_singular: 'le document',
    report_card_plural: 'les documents',
    certificate: 'Certificat',
    certificates: 'Certificats',
    attestation: 'Attestation',
    attestations: 'Attestations',
    
    academic_year: 'Période',
    academic_years: 'Périodes',
    session: 'Session',
    sessions: 'Sessions',
    term: 'Période',
    terms: 'Périodes',
    
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
    enrollment_singular: "l'inscription",
    enrollment_plural: 'les inscriptions',
    
    grade: 'Note',
    grades: 'Notes',
    evaluation: 'Évaluation',
    evaluations: 'Évaluations',
    assessment: 'Évaluation',
    assessments: 'Évaluations',
    
    attendance: 'Présence',
    attendance_singular: 'la présence',
    attendance_plural: 'les présences',
    
    payment: 'Paiement',
    payments: 'Paiements',
    invoice: 'Facture',
    invoices: 'Factures',
    
    class: 'Groupe',
    classes: 'Groupes',
    group: 'Groupe',
    groups: 'Groupes',
    
    teacher: 'Enseignant',
    teachers: 'Enseignants',
    trainer: 'Formateur',
    trainers: 'Formateurs',
    organization: 'Organisation',
    establishment: 'Établissement',
  },
}

/**
 * Récupère le vocabulaire selon le type d'organisation
 */
export function getVocabulary(organizationType: OrganizationType = 'school'): Vocabulary {
  return vocabularies[organizationType] || vocabularies.school
}

/**
 * Hook React pour utiliser le vocabulaire dans les composants
 */
export function useVocabulary(organizationType?: OrganizationType): Vocabulary {
  // TODO: Récupérer le type d'organisation depuis le contexte/API
  // Pour l'instant, retourne le vocabulaire par défaut
  return getVocabulary(organizationType || 'school')
}
