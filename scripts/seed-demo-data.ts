/**
 * Script de génération de données fictives pour les captures d'écran
 * Usage: npx tsx scripts/seed-demo-data.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), '.env.local') })

// Configuration locale française
faker.locale = 'fr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// ID de votre organisation
const ORGANIZATION_ID = '4d27f507-280c-4e55-8a48-6b9840e13f8a'
const CURRENT_USER_ID = 'ff6fe5a3-6f1b-41df-bd2c-17f851afb518'

// Catégories de formations
const FORMATION_CATEGORIES = [
  'Développement Web',
  'Marketing Digital',
  'Design Graphique',
  'Gestion de Projet',
  'Data Science',
  'Cybersécurité',
  'Intelligence Artificielle',
  'Comptabilité',
]

// Noms de formations réalistes
const FORMATION_NAMES = [
  'Développeur Full Stack JavaScript',
  'Marketing Digital et Réseaux Sociaux',
  'Design UI/UX avec Figma',
  'Gestion de Projet Agile Scrum',
  'Data Analyst avec Python',
  'Expert en Cybersécurité',
  'Machine Learning et IA',
  'Comptabilité et Gestion Financière',
  'Développement Mobile React Native',
  'SEO et Référencement Naturel',
]

async function clearExistingData() {
  console.log('🗑️  Nettoyage des données existantes...')

  // Supprimer dans l'ordre inverse des dépendances
  await supabase.from('payments').delete().eq('organization_id', ORGANIZATION_ID)
  await supabase.from('attendance').delete().eq('organization_id', ORGANIZATION_ID)
  await supabase.from('enrollments').delete().eq('organization_id', ORGANIZATION_ID)
  await supabase.from('sessions').delete().eq('organization_id', ORGANIZATION_ID)
  await supabase.from('formations').delete().eq('organization_id', ORGANIZATION_ID)
  await supabase.from('programs').delete().eq('organization_id', ORGANIZATION_ID)
  await supabase.from('students').delete().eq('organization_id', ORGANIZATION_ID)
  await supabase.from('teachers').delete().eq('organization_id', ORGANIZATION_ID)

  console.log('✅ Données nettoyées')
}

async function createTeachers(count: number = 8) {
  console.log(`👨‍🏫 Création de ${count} formateurs...`)

  const teachers = []
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    teachers.push({
      organization_id: ORGANIZATION_ID,
      first_name: firstName,
      last_name: lastName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phone: faker.phone.number('+33 6 ## ## ## ##'),
      specialization: faker.helpers.arrayElement(FORMATION_CATEGORIES),
      bio: faker.lorem.paragraph(),
      hourly_rate: faker.number.int({ min: 50, max: 150 }),
      is_active: true,
    })
  }

  const { data, error } = await supabase.from('teachers').insert(teachers).select()

  if (error) {
    console.error('❌ Erreur création formateurs:', error)
    throw error
  }

  console.log(`✅ ${data.length} formateurs créés`)
  return data
}

async function createStudents(count: number = 50) {
  console.log(`👨‍🎓 Création de ${count} étudiants...`)

  const students = []
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const birthDate = faker.date.birthdate({ min: 18, max: 45, mode: 'age' })

    students.push({
      organization_id: ORGANIZATION_ID,
      first_name: firstName,
      last_name: lastName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phone: faker.phone.number('+33 6 ## ## ## ##'),
      date_of_birth: birthDate.toISOString().split('T')[0],
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      postal_code: faker.location.zipCode(),
      country: 'France',
      emergency_contact: faker.person.fullName(),
      emergency_phone: faker.phone.number('+33 6 ## ## ## ##'),
      photo_url: `https://i.pravatar.cc/300?img=${i + 1}`,
      status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive', 'graduated']),
    })
  }

  const { data, error } = await supabase.from('students').insert(students).select()

  if (error) {
    console.error('❌ Erreur création étudiants:', error)
    throw error
  }

  console.log(`✅ ${data.length} étudiants créés`)
  return data
}

async function createPrograms(count: number = 5) {
  console.log(`📚 Création de ${count} programmes...`)

  const programs = []
  for (let i = 0; i < count; i++) {
    programs.push({
      organization_id: ORGANIZATION_ID,
      code: `PROG-${String(i + 1).padStart(3, '0')}`,
      name: `Programme ${faker.helpers.arrayElement(FORMATION_CATEGORIES)}`,
      description: faker.lorem.paragraphs(2),
      category: faker.helpers.arrayElement(FORMATION_CATEGORIES),
      is_active: true,
    })
  }

  const { data, error } = await supabase.from('programs').insert(programs).select()

  if (error) {
    console.error('❌ Erreur création programmes:', error)
    throw error
  }

  console.log(`✅ ${data.length} programmes créés`)
  return data
}

async function createFormations(programs: any[], count: number = 10) {
  console.log(`📖 Création de ${count} formations...`)

  const formations = []
  for (let i = 0; i < count; i++) {
    const category = faker.helpers.arrayElement(FORMATION_CATEGORIES)
    const program = faker.helpers.arrayElement(programs)

    formations.push({
      organization_id: ORGANIZATION_ID,
      program_id: program.id,
      code: `FORM-${String(i + 1).padStart(3, '0')}`,
      name: FORMATION_NAMES[i] || `Formation ${category}`,
      subtitle: faker.lorem.sentence(),
      category,
      description: faker.lorem.paragraphs(3),
      duration_hours: faker.helpers.arrayElement([35, 70, 105, 140, 210, 280, 350]),
      duration_days: faker.helpers.arrayElement([5, 10, 15, 20, 30, 40, 50]),
      duration_unit: 'hours',
      price: faker.number.int({ min: 1500, max: 8000 }),
      currency: 'EUR',
      payment_plan: faker.helpers.arrayElement(['full', 'installment']),
      capacity_max: faker.number.int({ min: 10, max: 25 }),
      age_min: 18,
      age_max: 65,
      published_online: faker.datatype.boolean(),
      eligible_cpf: faker.datatype.boolean(),
      pedagogical_objectives: faker.lorem.paragraphs(2),
      learner_profile: faker.lorem.paragraph(),
      training_content: faker.lorem.paragraphs(3),
      is_active: true,
    })
  }

  const { data, error } = await supabase.from('formations').insert(formations).select()

  if (error) {
    console.error('❌ Erreur création formations:', error)
    throw error
  }

  console.log(`✅ ${data.length} formations créées`)
  return data
}

async function createSessions(formations: any[], teachers: any[], count: number = 15) {
  console.log(`📅 Création de ${count} sessions...`)

  const sessions = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const formation = faker.helpers.arrayElement(formations)
    const teacher = faker.helpers.arrayElement(teachers)

    // Mélange de sessions passées, en cours et futures
    let startDate: Date
    let status: string

    if (i < 5) {
      // Sessions futures
      startDate = faker.date.future({ years: 0.5 })
      status = 'scheduled'
    } else if (i < 10) {
      // Sessions en cours
      startDate = faker.date.recent({ days: 30 })
      status = 'in_progress'
    } else {
      // Sessions terminées
      startDate = faker.date.past({ years: 0.5 })
      status = 'completed'
    }

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + (formation.duration_days || 10))

    sessions.push({
      organization_id: ORGANIZATION_ID,
      formation_id: formation.id,
      code: `SESS-${String(i + 1).padStart(3, '0')}`,
      name: `Session ${formation.name}`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status,
      location: faker.location.city(),
      capacity: formation.capacity_max,
      price: formation.price,
      currency: formation.currency,
      teacher_id: teacher.id,
      is_online: faker.datatype.boolean(),
    })
  }

  const { data, error } = await supabase.from('sessions').insert(sessions).select()

  if (error) {
    console.error('❌ Erreur création sessions:', error)
    throw error
  }

  console.log(`✅ ${data.length} sessions créées`)
  return data
}

async function createEnrollments(students: any[], sessions: any[]) {
  console.log(`📝 Création des inscriptions...`)

  const enrollments = []

  // Chaque session a entre 5 et 15 étudiants
  for (const session of sessions) {
    const numStudents = faker.number.int({ min: 5, max: 15 })
    const selectedStudents = faker.helpers.arrayElements(students, numStudents)

    for (const student of selectedStudents) {
      enrollments.push({
        organization_id: ORGANIZATION_ID,
        student_id: student.id,
        session_id: session.id,
        enrollment_date: faker.date.past({ years: 0.5 }).toISOString().split('T')[0],
        status: faker.helpers.arrayElement(['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled']),
        amount: session.price,
        currency: session.currency,
      })
    }
  }

  const { data, error } = await supabase.from('enrollments').insert(enrollments).select()

  if (error) {
    console.error('❌ Erreur création inscriptions:', error)
    throw error
  }

  console.log(`✅ ${data.length} inscriptions créées`)
  return data
}

async function createPayments(enrollments: any[]) {
  console.log(`💰 Création des paiements...`)

  const payments = []

  for (const enrollment of enrollments) {
    // 70% des inscriptions ont au moins un paiement
    if (Math.random() > 0.3) {
      const amount = enrollment.amount
      const isPaid = Math.random() > 0.2 // 80% des paiements sont payés

      // Certains paiements en plusieurs fois
      if (Math.random() > 0.7) {
        // Paiement en 2 ou 3 fois
        const installments = faker.helpers.arrayElement([2, 3])
        const installmentAmount = amount / installments

        for (let i = 0; i < installments; i++) {
          const paymentDate = faker.date.past({ years: 0.5 })

          payments.push({
            organization_id: ORGANIZATION_ID,
            student_id: enrollment.student_id,
            enrollment_id: enrollment.id,
            amount: installmentAmount,
            currency: enrollment.currency,
            payment_method: faker.helpers.arrayElement(['bank_transfer', 'credit_card', 'cash', 'check']),
            status: i === 0 ? 'paid' : (isPaid ? 'paid' : 'pending'),
            payment_date: paymentDate.toISOString().split('T')[0],
            paid_at: isPaid ? paymentDate.toISOString() : null,
            description: `Paiement ${i + 1}/${installments}`,
          })
        }
      } else {
        // Paiement unique
        const paymentDate = faker.date.past({ years: 0.5 })

        payments.push({
          organization_id: ORGANIZATION_ID,
          student_id: enrollment.student_id,
          enrollment_id: enrollment.id,
          amount,
          currency: enrollment.currency,
          payment_method: faker.helpers.arrayElement(['bank_transfer', 'credit_card', 'cash', 'check']),
          status: isPaid ? 'paid' : 'pending',
          payment_date: paymentDate.toISOString().split('T')[0],
          paid_at: isPaid ? paymentDate.toISOString() : null,
          description: 'Paiement formation',
        })
      }
    }
  }

  const { data, error } = await supabase.from('payments').insert(payments).select()

  if (error) {
    console.error('❌ Erreur création paiements:', error)
    throw error
  }

  console.log(`✅ ${data.length} paiements créés`)
  return data
}

async function createAttendance(enrollments: any[], sessions: any[]) {
  console.log(`✅ Création des présences...`)

  const attendance = []

  // Pour les sessions en cours et terminées
  const activeSessions = sessions.filter(s =>
    s.status === 'in_progress' || s.status === 'completed'
  )

  for (const session of activeSessions) {
    const sessionEnrollments = enrollments.filter(e => e.session_id === session.id)

    // Créer 5 à 10 journées de présence
    const numDays = faker.number.int({ min: 5, max: 10 })
    const startDate = new Date(session.start_date)

    for (let day = 0; day < numDays; day++) {
      const attendanceDate = new Date(startDate)
      attendanceDate.setDate(attendanceDate.getDate() + day)

      for (const enrollment of sessionEnrollments) {
        // 90% de présence en moyenne
        const isPresent = Math.random() > 0.1

        attendance.push({
          organization_id: ORGANIZATION_ID,
          student_id: enrollment.student_id,
          session_id: session.id,
          date: attendanceDate.toISOString().split('T')[0],
          status: isPresent ? 'present' : faker.helpers.arrayElement(['absent', 'late', 'excused']),
          notes: isPresent ? null : faker.lorem.sentence(),
        })
      }
    }
  }

  const { data, error } = await supabase.from('attendance').insert(attendance).select()

  if (error) {
    console.error('❌ Erreur création présences:', error)
    throw error
  }

  console.log(`✅ ${data.length} présences créées`)
  return data
}

async function main() {
  console.log('🚀 Début de la génération de données fictives...\n')

  try {
    // Étape 1: Nettoyer les données existantes
    await clearExistingData()
    console.log()

    // Étape 2: Créer les formateurs
    const teachers = await createTeachers(8)
    console.log()

    // Étape 3: Créer les étudiants
    const students = await createStudents(50)
    console.log()

    // Étape 4: Créer les programmes
    const programs = await createPrograms(5)
    console.log()

    // Étape 5: Créer les formations
    const formations = await createFormations(programs, 10)
    console.log()

    // Étape 6: Créer les sessions
    const sessions = await createSessions(formations, teachers, 15)
    console.log()

    // Étape 7: Créer les inscriptions
    const enrollments = await createEnrollments(students, sessions)
    console.log()

    // Étape 8: Créer les paiements
    const payments = await createPayments(enrollments)
    console.log()

    // Étape 9: Créer les présences
    const attendanceRecords = await createAttendance(enrollments, sessions)
    console.log()

    console.log('✅ Génération de données terminée avec succès!')
    console.log('\n📊 Résumé:')
    console.log(`   - ${teachers.length} formateurs`)
    console.log(`   - ${students.length} étudiants`)
    console.log(`   - ${programs.length} programmes`)
    console.log(`   - ${formations.length} formations`)
    console.log(`   - ${sessions.length} sessions`)
    console.log(`   - ${enrollments.length} inscriptions`)
    console.log(`   - ${payments.length} paiements`)
    console.log(`   - ${attendanceRecords.length} présences`)

  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error)
    process.exit(1)
  }
}

main()
