/**
 * Tests unitaires pour lib/validations/schemas.ts (augmentation couverture)
 */
import { describe, it, expect } from 'vitest'
import {
  studentSchema,
  studentUpdateSchema,
  programSchema,
  formationSchema,
  sessionSchema,
  evaluationSchema,
  invoiceSchema,
  paymentSchema,
  enrollmentSchema,
  generateDocxBodySchema,
  generateWordBodySchema,
  sendEmailBodySchema,
} from '@/lib/validations/schemas'

describe('studentSchema', () => {
  it('valide un etudiant avec tuteur existant (guardian_id)', () => {
    const data = {
      first_name: 'Jean',
      last_name: 'Dupont',
      enrollment_date: '2024-01-15',
      guardian_id: 'guard-1',
    }
    const result = studentSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('valide un etudiant avec nouveau tuteur (nom, prenom, tel)', () => {
    const data = {
      first_name: 'Marie',
      last_name: 'Martin',
      enrollment_date: '2024-01-15',
      guardian_first_name: 'Paul',
      guardian_last_name: 'Martin',
      guardian_phone_primary: '0612345678',
    }
    const result = studentSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('accepte un etudiant sans tuteur (champ optionnel)', () => {
    const data = {
      first_name: 'Jean',
      last_name: 'Dupont',
      enrollment_date: '2024-01-15',
    }
    const result = studentSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si prenom manquant', () => {
    const result = studentSchema.safeParse({
      first_name: '',
      last_name: 'Dupont',
      enrollment_date: '2024-01-15',
      guardian_id: 'g1',
    })
    expect(result.success).toBe(false)
  })
})

describe('studentUpdateSchema', () => {
  it('valide une mise a jour minimale', () => {
    const data = {
      first_name: 'Jean',
      last_name: 'Dupont',
      enrollment_date: '2024-01-15',
    }
    const result = studentUpdateSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('programSchema', () => {
  it('valide un programme minimal', () => {
    const data = {
      code: 'PROG-1',
      name: 'Formation Test',
    }
    const result = programSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si code vide', () => {
    const result = programSchema.safeParse({
      code: '',
      name: 'Formation Test',
    })
    expect(result.success).toBe(false)
  })
})

describe('formationSchema', () => {
  it('valide une formation minimale', () => {
    const data = {
      program_id: 'prog-1',
      code: 'FORM-1',
      name: 'Session Formation',
    }
    const result = formationSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('sessionSchema', () => {
  it('valide une session avec dates coherentes', () => {
    const data = {
      formation_id: 'form-1',
      name: 'Session Janvier',
      start_date: '2024-01-10',
      end_date: '2024-01-20',
    }
    const result = sessionSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si end_date avant start_date', () => {
    const result = sessionSchema.safeParse({
      formation_id: 'form-1',
      name: 'Session',
      start_date: '2024-01-20',
      end_date: '2024-01-10',
    })
    expect(result.success).toBe(false)
  })
})

describe('evaluationSchema', () => {
  it('valide une evaluation minimale', () => {
    const data = {
      student_id: 'std-1',
      subject: 'Controle',
      score: '15',
      graded_at: '2024-01-15',
    }
    const result = evaluationSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si score superieur a max_score', () => {
    const result = evaluationSchema.safeParse({
      student_id: 'std-1',
      subject: 'Controle',
      score: '20',
      max_score: '10',
      graded_at: '2024-01-15',
    })
    expect(result.success).toBe(false)
  })
})

describe('invoiceSchema', () => {
  it('valide une facture minimale', () => {
    const data = {
      student_id: 'std-1',
      issue_date: '2024-01-01',
      due_date: '2024-01-31',
      amount: '1000',
    }
    const result = invoiceSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si due_date avant issue_date', () => {
    const result = invoiceSchema.safeParse({
      student_id: 'std-1',
      issue_date: '2024-01-31',
      due_date: '2024-01-01',
      amount: '1000',
    })
    expect(result.success).toBe(false)
  })
})

describe('paymentSchema', () => {
  it('valide un paiement minimal', () => {
    const data = {
      invoice_id: 'inv-1',
      student_id: 'std-1',
      amount: '500',
    }
    const result = paymentSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si montant invalide', () => {
    const result = paymentSchema.safeParse({
      invoice_id: 'inv-1',
      student_id: 'std-1',
      amount: '-10',
    })
    expect(result.success).toBe(false)
  })
})

describe('enrollmentSchema', () => {
  it('valide une inscription minimale', () => {
    const data = {
      student_id: 'std-1',
      session_id: 'sess-1',
      enrollment_date: '2024-01-15',
    }
    const result = enrollmentSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si paid_amount superieur a total_amount', () => {
    const result = enrollmentSchema.safeParse({
      student_id: 'std-1',
      session_id: 'sess-1',
      enrollment_date: '2024-01-15',
      total_amount: '100',
      paid_amount: '150',
    })
    expect(result.success).toBe(false)
  })
})

describe('generateDocxBodySchema', () => {
  it('valide un body generate-docx', () => {
    const data = {
      templateId: 'tpl-1',
      variables: { name: 'Test' },
    }
    const result = generateDocxBodySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si templateId vide', () => {
    const result = generateDocxBodySchema.safeParse({
      templateId: '',
      variables: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('generateWordBodySchema', () => {
  it('valide un body generate-word', () => {
    const data = {
      template: { name: 'Conv', type: 'convention' },
      variables: { student: 'Jean' },
    }
    const result = generateWordBodySchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('sendEmailBodySchema', () => {
  it('valide un body send-email (to string)', () => {
    const data = {
      to: 'dest@example.com',
      subject: 'Objet',
    }
    const result = sendEmailBodySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('valide un body send-email (to array)', () => {
    const data = {
      to: ['a@b.com', 'c@d.com'],
      subject: 'Objet',
    }
    const result = sendEmailBodySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejette si email invalide', () => {
    const result = sendEmailBodySchema.safeParse({
      to: 'invalid',
      subject: 'Objet',
    })
    expect(result.success).toBe(false)
  })
})
