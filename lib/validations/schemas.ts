import { z } from 'zod'

// Schéma pour la création d'un étudiant
export const studentSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis').max(100, 'Le prénom est trop long'),
  last_name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  class_id: z.string().optional().or(z.literal('')),
  enrollment_date: z.string().min(1, 'La date d\'inscription est requise'),
  // Tuteur - Option 1: Sélectionner un tuteur existant
  guardian_id: z.string().optional().or(z.literal('')),
  // Tuteur - Option 2: Créer un nouveau tuteur
  guardian_first_name: z.string().optional().or(z.literal('')),
  guardian_last_name: z.string().optional().or(z.literal('')),
  guardian_relationship: z.enum(['parent', 'father', 'mother', 'guardian', 'other']).optional().or(z.literal('')),
  guardian_phone_primary: z.string().optional().or(z.literal('')),
  guardian_phone_secondary: z.string().optional().or(z.literal('')),
  guardian_email: z.string().email('Email invalide').optional().or(z.literal('')),
  guardian_address: z.string().optional().or(z.literal('')),
  // Organisation (optionnel - par défaut celle de l'utilisateur)
  organization_id: z.string().optional().or(z.literal('')),
  // Entreprise - Option 1: Sélectionner une entité existante
  entity_id: z.string().optional().or(z.literal('')),
  // Entreprise - Option 2: Saisir manuellement
  company_name: z.string().optional().or(z.literal('')),
  company_address: z.string().optional().or(z.literal('')),
  company_phone: z.string().optional().or(z.literal('')),
  company_email: z.string().email('Email invalide').optional().or(z.literal('')),
  company_siret: z.string().optional().or(z.literal('')),
}).refine(
  (data) => {
    // Au moins un tuteur doit être fourni (existant ou nouveau)
    return data.guardian_id || (data.guardian_first_name && data.guardian_last_name && data.guardian_phone_primary)
  },
  {
    message: 'Vous devez sélectionner un tuteur existant ou créer un nouveau tuteur',
    path: ['guardian_id'],
  }
)

// Schéma pour la mise à jour d'un étudiant
export const studentUpdateSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis').max(100, 'Le prénom est trop long'),
  last_name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  class_id: z.string().optional().or(z.literal('')),
  enrollment_date: z.string().min(1, 'La date d\'inscription est requise'),
  status: z.enum(['active', 'inactive', 'graduated']).default('active'),
})

// Schéma pour la création d'un programme
export const programSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50, 'Le code est trop long'),
  name: z.string().min(1, 'Le nom est requis').max(200, 'Le nom est trop long'),
  subtitle: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  program_version: z.string().optional().or(z.literal('')),
  version_date: z.string().optional().or(z.literal('')),
  duration_hours: z.string().optional().or(z.literal('')),
  duration_days: z.string().optional().or(z.literal('')),
  photo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  price: z.string().optional().or(z.literal('')), // Prix générique ou entreprise
  price_enterprise: z.string().optional().or(z.literal('')),
  price_individual: z.string().optional().or(z.literal('')),
  price_freelance: z.string().optional().or(z.literal('')),
  currency: z.string().default('XOF'),
  payment_plan: z.enum(['full', 'installment', 'free']).default('full'),
  published_online: z.boolean().default(false),
  is_public: z.boolean().default(false),
  eligible_cpf: z.boolean().default(false),
  cpf_code: z.string().optional().or(z.literal('')),
  modalities: z.string().optional().or(z.literal('')),
  training_action_type: z.string().optional().or(z.literal('')),
  pedagogical_objectives: z.string().optional().or(z.literal('')),
  learner_profile: z.string().optional().or(z.literal('')),
  training_content: z.string().optional().or(z.literal('')),
  execution_follow_up: z.string().optional().or(z.literal('')),
  certification_modalities: z.string().optional().or(z.literal('')),
  quality: z.string().optional().or(z.literal('')),
  accounting_product_config: z.string().optional().or(z.literal('')),
  edof_export_fields: z.string().optional().or(z.literal('')),
  competence_domains: z.string().optional().or(z.literal('')),
  prerequisites: z.string().optional().or(z.literal('')),
  capacity_max: z.string().optional().or(z.literal('')),
  age_min: z.string().optional().or(z.literal('')),
  age_max: z.string().optional().or(z.literal('')),
  certification_issued: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

// Schéma pour la création d'une formation
export const formationSchema = z.object({
  program_id: z.string().min(1, 'Le programme est requis'),
  code: z.string().min(1, 'Le code est requis').max(50, 'Le code est trop long'),
  name: z.string().min(1, 'Le nom est requis').max(200, 'Le nom est trop long'),
  subtitle: z.string().optional().or(z.literal('')),
  photo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  program_version: z.string().optional().or(z.literal('')),
  version_date: z.string().optional().or(z.literal('')),
  duration_hours: z.string().optional().or(z.literal('')),
  duration_days: z.string().optional().or(z.literal('')),
  duration_unit: z.enum(['hours', 'days']).default('hours'),
  price: z.string().optional().or(z.literal('')),
  currency: z.string().default('XOF'),
  payment_plan: z.enum(['full', 'installment', 'free']).default('full'),
  published_online: z.boolean().default(false),
  eligible_cpf: z.boolean().default(false),
  cpf_code: z.string().optional().or(z.literal('')),
  modalities: z.string().optional().or(z.literal('')),
  training_action_type: z.string().optional().or(z.literal('')),
  pedagogical_objectives: z.string().optional().or(z.literal('')),
  learner_profile: z.string().optional().or(z.literal('')),
  training_content: z.string().optional().or(z.literal('')),
  execution_follow_up: z.string().optional().or(z.literal('')),
  certification_modalities: z.string().optional().or(z.literal('')),
  quality: z.string().optional().or(z.literal('')),
  accounting_product_config: z.string().optional().or(z.literal('')),
  edof_export_fields: z.string().optional().or(z.literal('')),
  competence_domains: z.string().optional().or(z.literal('')),
  prerequisites: z.string().optional().or(z.literal('')),
  capacity_max: z.string().optional().or(z.literal('')),
  age_min: z.string().optional().or(z.literal('')),
  age_max: z.string().optional().or(z.literal('')),
  certification_issued: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

// Schéma pour la création d'une session
export const sessionSchema = z.object({
  formation_id: z.string().min(1, 'La formation est requise'),
  name: z.string().min(1, 'Le nom est requis').max(200, 'Le nom est trop long'),
  code: z.string().optional().or(z.literal('')),
  start_date: z.string().min(1, 'La date de début est requise'),
  end_date: z.string().min(1, 'La date de fin est requise'),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  capacity_max: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val) return true
    const num = parseInt(val)
    return !isNaN(num) && num > 0
  }, 'La capacité maximale doit être un nombre entier positif'),
  currency: z.string().default('XOF'),
  status: z.enum(['planned', 'ongoing', 'completed', 'cancelled']).default('planned'),
  teacher_id: z.string().optional().or(z.literal('')),
  manager1_id: z.string().optional().or(z.literal('')),
  manager2_id: z.string().optional().or(z.literal('')),
  inter_entreprise: z.boolean().default(true),
  sous_traitance: z.boolean().default(false),
  timezone: z.string().default('Europe/Paris'),
  program_ids: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'La date de fin doit être postérieure à la date de début',
  path: ['end_date'],
})

// Schéma pour la création d'une évaluation
export const evaluationSchema = z.object({
  student_id: z.string().min(1, 'L\'étudiant est requis'),
  session_id: z.string().optional().or(z.literal('')),
  subject: z.string().min(1, 'Le sujet est requis').max(200, 'Le sujet est trop long'),
  assessment_type: z.enum([
    'pre_formation',
    'hot',
    'cold',
    'manager',
    'instructor',
    'funder',
    'quiz',
    'exam',
    'project',
    'other',
  ]).default('quiz'),
  score: z.string().min(1, 'La note est requise').refine((val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, 'La note doit être un nombre valide'),
  max_score: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val) return true
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, 'La note maximale doit être un nombre valide supérieur à 0'),
  notes: z.string().optional().or(z.literal('')),
  graded_at: z.string().min(1, 'La date d\'évaluation est requise'),
  coefficient: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val) return true
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, 'Le coefficient doit être un nombre valide supérieur à 0'),
  is_makeup: z.boolean().optional().default(false),
  original_grade_id: z.string().optional().or(z.literal('')),
  appreciation: z.string().optional().or(z.literal('')),
  term_period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'T1', 'T2', 'T3']).optional().or(z.literal('')),
  academic_year_id: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.max_score && data.score) {
    const score = parseFloat(data.score)
    const maxScore = parseFloat(data.max_score)
    return score <= maxScore
  }
  return true
}, {
  message: 'La note ne peut pas être supérieure à la note maximale',
  path: ['score'],
})

// Schéma pour la création d'une facture ou devis
export const invoiceSchema = z.object({
  student_id: z.string().min(1, 'L\'étudiant est requis'),
  document_type: z.enum(['quote', 'invoice']).default('invoice'),
  invoice_number: z.string().optional().or(z.literal('')), // Peut être généré automatiquement
  type: z.enum(['tuition', 'registration', 'other']).default('tuition'),
  issue_date: z.string().min(1, 'La date d\'émission est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  amount: z.string().min(1, 'Le montant est requis').refine((val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, 'Le montant doit être un nombre valide supérieur ou égal à 0'),
  tax_amount: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val) return true
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, 'Le montant de la taxe doit être un nombre valide supérieur ou égal à 0'),
  currency: z.string().default('XOF'),
  status: z.enum(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled']).default('draft'),
  notes: z.string().optional().or(z.literal('')),
  enrollment_id: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.issue_date && data.due_date) {
    return new Date(data.due_date) >= new Date(data.issue_date)
  }
  return true
}, {
  message: 'La date d\'échéance doit être postérieure à la date d\'émission',
  path: ['due_date'],
})

// Schéma pour la création d'un paiement
export const paymentSchema = z.object({
  invoice_id: z.string().min(1, 'La facture est requise'),
  student_id: z.string().min(1, 'L\'étudiant est requis'),
  amount: z.string().min(1, 'Le montant est requis').refine((val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, 'Le montant doit être un nombre valide supérieur à 0'),
  currency: z.string().default('XOF'),
  payment_method: z.enum(['cash', 'mobile_money', 'card', 'bank_transfer']).default('cash'),
  payment_provider: z.enum(['mtn', 'orange', 'airtel', 'wave']).optional().or(z.literal('')),
  transaction_id: z.string().optional().or(z.literal('')),
  paid_at: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

// Schéma pour l'inscription
export const enrollmentSchema = z.object({
  student_id: z.string().min(1, 'L\'étudiant est requis'),
  session_id: z.string().min(1, 'La session est requise'),
  enrollment_date: z.string().min(1, 'La date d\'inscription est requise'),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'failed']).default('confirmed'),
  payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']).default('pending'),
  total_amount: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val) return true
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, 'Le montant total doit être un nombre valide supérieur ou égal à 0'),
  paid_amount: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val) return true
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, 'Le montant payé doit être un nombre valide supérieur ou égal à 0'),
}).refine((data) => {
  // Vérifier que le montant payé ne dépasse pas le montant total
  if (data.total_amount && data.paid_amount) {
    const total = parseFloat(data.total_amount)
    const paid = parseFloat(data.paid_amount)
    if (!isNaN(total) && !isNaN(paid) && paid > total) {
      return false
    }
  }
  return true
}, {
  message: 'Le montant payé ne peut pas dépasser le montant total',
  path: ['paid_amount'],
})

// Type helper pour extraire le type d'un schéma
export type StudentFormData = z.infer<typeof studentSchema>
export type StudentUpdateFormData = z.infer<typeof studentUpdateSchema>
export type ProgramFormData = z.infer<typeof programSchema>
export type FormationFormData = z.infer<typeof formationSchema>
export type SessionFormData = z.infer<typeof sessionSchema>
export type EvaluationFormData = z.infer<typeof evaluationSchema>
export type InvoiceFormData = z.infer<typeof invoiceSchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type EnrollmentFormData = z.infer<typeof enrollmentSchema>












