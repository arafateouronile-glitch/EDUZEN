'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { evaluationTemplateService, type QuestionOption } from '@/lib/services/evaluation-template.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Trash2, GripVertical, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { motion, Reorder } from '@/components/ui/motion'

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'numeric' | 'rating'

/** Types d'évaluation satisfaction : uniquement étoiles + expression libre */
const SATISFACTION_ASSESSMENT_TYPES = ['pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder']

interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  options?: QuestionOption[]
  correct_answer?: string
  correct_answer_pattern?: string
  points: number
  explanation?: string
  order_index: number
}

/**
 * Questions par défaut pour l'évaluation à froid (apprenant)
 * Conformes à l'indicateur 14 du référentiel Qualiopi :
 * mesure de l'impact des actions de formation à distance temporelle.
 */
const DEFAULT_COLD_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    question_text: "Dans quelle mesure avez-vous pu mettre en pratique les compétences acquises lors de la formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Mesure le transfert des apprentissages en situation réelle (Qualiopi indicateur 14).",
    order_index: 1,
  },
  {
    question_text: "Comment évaluez-vous l'utilité de la formation par rapport à votre activité professionnelle actuelle ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue l'adéquation formation/poste après prise de recul.",
    order_index: 2,
  },
  {
    question_text: "Dans quelle mesure avez-vous atteint les objectifs professionnels que vous vous étiez fixés avant la formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Mesure l'atteinte des objectifs apprenants à distance de la formation.",
    order_index: 3,
  },
  {
    question_text: "Comment évaluez-vous l'impact de la formation sur votre performance au travail ?",
    question_type: 'rating',
    points: 1,
    explanation: "Indicateur d'impact professionnel post-formation.",
    order_index: 4,
  },
  {
    question_text: "Dans quelle mesure l'organisme de formation a-t-il assuré un suivi après la fin de la formation (contact, ressources complémentaires, accompagnement) ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue le suivi post-formation de l'OF — preuve que l'organisme s'assure de l'effectivité du transfert (Qualiopi indicateur 14).",
    order_index: 5,
  },
  {
    question_text: "Dans quelle mesure recommanderiez-vous cette formation à un(e) collègue ?",
    question_type: 'rating',
    points: 1,
    explanation: "Net Promoter Score (NPS) à froid, reflet de la valeur perçue à long terme.",
    order_index: 6,
  },
  {
    question_text: "Quelles compétences ou connaissances acquises lors de la formation avez-vous concrètement appliquées dans votre travail ? Pouvez-vous donner un exemple ?",
    question_type: 'essay',
    points: 0,
    explanation: "Recueille des preuves qualitatives de transfert des apprentissages.",
    order_index: 7,
  },
  {
    question_text: "Quels obstacles avez-vous rencontrés pour mettre en œuvre les acquis de la formation ? (manque de temps, environnement de travail, ressources, autre...)",
    question_type: 'essay',
    points: 0,
    explanation: "Identifie les freins au transfert pour améliorer l'ingénierie future.",
    order_index: 8,
  },
  {
    question_text: "Avez-vous des suggestions pour améliorer cette formation afin qu'elle soit encore plus utile dans votre contexte professionnel ?",
    question_type: 'essay',
    points: 0,
    explanation: "Boucle d'amélioration continue — amélioration de l'offre (Qualiopi indicateur 10).",
    order_index: 9,
  },
]

/**
 * Questions par défaut pour l'auto-évaluation formateur (post-session)
 * Conformes aux indicateurs 5 et 8 du référentiel Qualiopi :
 * adéquation des moyens pédagogiques et compétences des intervenants.
 */
const DEFAULT_INSTRUCTOR_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    question_text: "Comment évaluez-vous l'adéquation entre le contenu délivré et les objectifs pédagogiques prévus ?",
    question_type: 'rating',
    points: 1,
    explanation: "Vérifie la cohérence entre le programme annoncé et ce qui a été réellement délivré (Qualiopi indicateur 5).",
    order_index: 1,
  },
  {
    question_text: "Dans quelle mesure avez-vous pu adapter votre pédagogie aux profils et niveaux des apprenants ?",
    question_type: 'rating',
    points: 1,
    explanation: "Mesure la flexibilité pédagogique face à l'hétérogénéité du groupe (Qualiopi indicateur 5).",
    order_index: 2,
  },
  {
    question_text: "Comment évaluez-vous l'engagement et la participation des apprenants durant cette session ?",
    question_type: 'rating',
    points: 1,
    explanation: "Indicateur de dynamique de groupe — signal pour réviser les modalités pédagogiques si nécessaire.",
    order_index: 3,
  },
  {
    question_text: "Dans quelle mesure les ressources pédagogiques et matérielles disponibles étaient-elles adaptées ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue les conditions d'animation et la pertinence des supports (Qualiopi indicateur 5).",
    order_index: 4,
  },
  {
    question_text: "Comment évaluez-vous votre satisfaction globale concernant le déroulement de cette session ?",
    question_type: 'rating',
    points: 1,
    explanation: "Auto-évaluation globale du formateur — indicateur de qualité interne (Qualiopi indicateur 8).",
    order_index: 5,
  },
  {
    question_text: "Quels points forts avez-vous identifiés dans le déroulement de cette session ?",
    question_type: 'essay',
    points: 0,
    explanation: "Capitalise sur les pratiques efficaces pour les reproduire.",
    order_index: 6,
  },
  {
    question_text: "Quels difficultés ou imprévus avez-vous rencontrés ? Comment les avez-vous gérés ?",
    question_type: 'essay',
    points: 0,
    explanation: "Retour d'expérience terrain pour améliorer la gestion des aléas pédagogiques.",
    order_index: 7,
  },
  {
    question_text: "Quelles modifications apporteriez-vous au contenu ou à la pédagogie pour améliorer les prochaines sessions ?",
    question_type: 'essay',
    points: 0,
    explanation: "Boucle d'amélioration continue portée par le formateur (Qualiopi indicateur 10).",
    order_index: 8,
  },
  {
    question_text: "Avez-vous des observations sur les profils ou niveaux des apprenants à transmettre pour les prochaines sessions ?",
    question_type: 'essay',
    points: 0,
    explanation: "Remontée d'information pour affiner le positionnement et la sélection des futurs apprenants.",
    order_index: 9,
  },
]

/**
 * Questions par défaut pour l'évaluation financeur (OPCO, employeur, État)
 * Conformes aux indicateurs 14 et 7 du référentiel Qualiopi :
 * mesure du retour sur investissement et satisfaction du prescripteur/financeur.
 */
const DEFAULT_FUNDER_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    question_text: "Dans quelle mesure cette action de formation correspond-elle aux objectifs du plan de développement des compétences ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue l'alignement stratégique formation/besoins RH (Qualiopi indicateur 14).",
    order_index: 1,
  },
  {
    question_text: "Comment évaluez-vous le rapport qualité/coût de cette action de formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Mesure la valeur perçue par le financeur au regard de l'investissement consenti.",
    order_index: 2,
  },
  {
    question_text: "Dans quelle mesure les résultats observés justifient-ils l'investissement réalisé ?",
    question_type: 'rating',
    points: 1,
    explanation: "Retour sur investissement formation (ROI/ROE) perçu par le financeur (Qualiopi indicateur 14).",
    order_index: 3,
  },
  {
    question_text: "Comment évaluez-vous la qualité de l'organisme de formation (communication, réactivité, livrables administratifs) ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue la relation OF/financeur et la conformité administrative (Qualiopi indicateur 13).",
    order_index: 4,
  },
  {
    question_text: "Quelle est votre satisfaction globale concernant cette action de formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Satisfaction globale du financeur/prescripteur (Qualiopi indicateur 7).",
    order_index: 5,
  },
  {
    question_text: "Dans quelle mesure renouveleriez-vous votre financement auprès de cet organisme de formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "NPS financeur — fidélisation et confiance à long terme.",
    order_index: 6,
  },
  {
    question_text: "Quels indicateurs concrets attestent de l'impact de cette formation sur les compétences des bénéficiaires ?",
    question_type: 'essay',
    points: 0,
    explanation: "Collecte des preuves d'impact pour le reporting et les audits Qualiopi (indicateur 14).",
    order_index: 7,
  },
  {
    question_text: "Avez-vous des observations ou recommandations concernant cet organisme de formation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Feedback financeur pour l'amélioration de la relation et de l'offre.",
    order_index: 8,
  },
  {
    question_text: "Quelles actions complémentaires préconiseriez-vous pour maximiser l'impact de cette formation dans votre organisation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Ouvre le dialogue sur les suites à donner (parcours complémentaires, mise en pratique accompagnée).",
    order_index: 9,
  },
]

/**
 * Questions par défaut pour l'évaluation manager (N+1 du collaborateur)
 * Conformes à l'indicateur 14 du référentiel Qualiopi :
 * mesure de l'impact de la formation sur les pratiques professionnelles,
 * observée par le responsable hiérarchique.
 */
const DEFAULT_MANAGER_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    question_text: "Comment évaluez-vous l'évolution des compétences de votre collaborateur(trice) depuis la formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Mesure la progression perçue par le manager (Qualiopi indicateur 14).",
    order_index: 1,
  },
  {
    question_text: "Dans quelle mesure votre collaborateur(trice) a-t-il/elle mis en pratique les acquis de la formation dans son poste ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue le transfert des apprentissages vu du terrain par le manager.",
    order_index: 2,
  },
  {
    question_text: "Comment évaluez-vous l'impact de la formation sur la performance globale de votre collaborateur(trice) ?",
    question_type: 'rating',
    points: 1,
    explanation: "Indicateur d'impact opérationnel post-formation (Qualiopi indicateur 14).",
    order_index: 3,
  },
  {
    question_text: "Dans quelle mesure la formation a-t-elle contribué à l'atteinte des objectifs professionnels de votre collaborateur(trice) ?",
    question_type: 'rating',
    points: 1,
    explanation: "Croise les objectifs individuels avec les résultats observés.",
    order_index: 4,
  },
  {
    question_text: "Quelle est votre satisfaction globale quant aux résultats de cette action de formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Satisfaction du prescripteur/financeur interne (Qualiopi indicateur 7).",
    order_index: 5,
  },
  {
    question_text: "Dans quelle mesure recommanderiez-vous cette formation à d'autres membres de votre équipe ?",
    question_type: 'rating',
    points: 1,
    explanation: "NPS manager — reflet de la valeur perçue par l'encadrement.",
    order_index: 6,
  },
  {
    question_text: "Quels changements de comportement ou de pratiques professionnelles avez-vous observés chez votre collaborateur(trice) depuis la formation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Preuves qualitatives de changement observable — élément clé pour Qualiopi indicateur 14.",
    order_index: 7,
  },
  {
    question_text: "Quels bénéfices concrets cette formation a-t-elle apportés à votre équipe ou à votre organisation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Mesure de la valeur ajoutée collective et organisationnelle.",
    order_index: 8,
  },
  {
    question_text: "Avez-vous des suggestions pour améliorer cette formation ou mieux l'adapter aux besoins de vos équipes ?",
    question_type: 'essay',
    points: 0,
    explanation: "Remontée terrain pour l'amélioration continue de l'offre (Qualiopi indicateur 10).",
    order_index: 9,
  },
]

/**
 * Questions par défaut pour l'évaluation de pré-formation (apprenant)
 * Conformes à l'indicateur 2 du référentiel Qualiopi :
 * positionnement préalable des apprenants avant l'entrée en formation.
 */
const DEFAULT_PRE_FORMATION_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    question_text: "Comment évaluez-vous votre niveau actuel sur les thématiques abordées dans cette formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Auto-positionnement initial — permet d'adapter le niveau de la formation (Qualiopi indicateur 2).",
    order_index: 1,
  },
  {
    question_text: "Dans quelle mesure maîtrisez-vous les prérequis indiqués pour cette formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Vérification des prérequis déclarés dans le programme (Qualiopi indicateur 2).",
    order_index: 2,
  },
  {
    question_text: "Quelle est votre aisance avec les outils ou méthodes qui seront utilisés pendant la formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue le niveau d'outillage préalable pour adapter les supports pédagogiques.",
    order_index: 3,
  },
  {
    question_text: "Comment évaluez-vous votre motivation à suivre cette formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Indicateur d'engagement initial — utile pour personnaliser l'approche pédagogique.",
    order_index: 4,
  },
  {
    question_text: "Dans quelle mesure pensez-vous que cette formation correspond à vos besoins professionnels actuels ?",
    question_type: 'rating',
    points: 1,
    explanation: "Mesure l'adéquation perçue entre l'offre et le besoin (Qualiopi indicateur 5).",
    order_index: 5,
  },
  {
    question_text: "Quelles sont vos principales attentes vis-à-vis de cette formation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Recueille les attentes individuelles pour personnaliser le parcours (Qualiopi indicateur 2).",
    order_index: 6,
  },
  {
    question_text: "Quelles compétences ou connaissances souhaitez-vous acquérir ou renforcer à l'issue de cette formation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Identifie les objectifs personnels de l'apprenant pour les croiser avec les objectifs pédagogiques.",
    order_index: 7,
  },
  {
    question_text: "Quel est votre contexte professionnel actuel ? (poste occupé, missions principales, secteur d'activité)",
    question_type: 'essay',
    points: 0,
    explanation: "Permet au formateur d'ancrer les exemples dans la réalité terrain de l'apprenant.",
    order_index: 8,
  },
  {
    question_text: "Y a-t-il des points spécifiques sur lesquels vous souhaiteriez que le formateur insiste particulièrement ?",
    question_type: 'essay',
    points: 0,
    explanation: "Personnalisation fine du contenu selon les besoins exprimés (Qualiopi indicateur 5).",
    order_index: 9,
  },
  {
    question_text: "Disposez-vous de certifications, diplômes ou expériences professionnelles reconnues en lien avec les thématiques de cette formation ? Si oui, lesquels ?",
    question_type: 'essay',
    points: 0,
    explanation: "Identification des acquis antérieurs et VAE potentielle — permet d'adapter le niveau de départ (Qualiopi indicateur 2).",
    order_index: 10,
  },
  {
    question_text: "Avez-vous des besoins spécifiques (situation de handicap, troubles cognitifs, contraintes particulières) dont nous devrions tenir compte pour adapter les conditions de formation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Identification préalable des besoins d'accessibilité — exigence transversale obligatoire du référentiel Qualiopi (critère 8). Permet de mobiliser le référent handicap de l'OF.",
    order_index: 11,
  },
]

/**
 * Questions par défaut pour l'évaluation à chaud (apprenant)
 * Conformes à l'indicateur 7 du référentiel Qualiopi :
 * mesure de la satisfaction des apprenants à l'issue de la formation.
 */
const DEFAULT_HOT_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    question_text: "Comment évaluez-vous votre satisfaction globale concernant cette formation ?",
    question_type: 'rating',
    points: 1,
    explanation: "Indicateur global de satisfaction immédiate (Qualiopi indicateur 7).",
    order_index: 1,
  },
  {
    question_text: "Comment évaluez-vous la qualité du contenu pédagogique (clarté, pertinence, richesse) ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue l'adéquation et la qualité des contenus délivrés.",
    order_index: 2,
  },
  {
    question_text: "Comment évaluez-vous la qualité de l'animation et les compétences du formateur ?",
    question_type: 'rating',
    points: 1,
    explanation: "Mesure la compétence pédagogique du formateur (Qualiopi indicateur 6).",
    order_index: 3,
  },
  {
    question_text: "Dans quelle mesure les exercices pratiques et les exemples étaient-ils adaptés à votre réalité professionnelle ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue la mise en pratique et l'ancrage dans le contexte métier.",
    order_index: 4,
  },
  {
    question_text: "Les objectifs annoncés en début de formation ont-ils été atteints à l'issue de celle-ci ?",
    question_type: 'rating',
    points: 1,
    explanation: "Vérification de l'atteinte des objectifs pédagogiques (Qualiopi indicateur 4).",
    order_index: 5,
  },
  {
    question_text: "Comment évaluez-vous les conditions matérielles et logistiques de la formation (espace, outils, supports) ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue les conditions d'accueil et les ressources mobilisées.",
    order_index: 6,
  },
  {
    question_text: "Comment évaluez-vous les conditions administratives et organisationnelles de la formation (inscription, convocation, documents reçus, information préalable) ?",
    question_type: 'rating',
    points: 1,
    explanation: "Évalue la qualité de l'accueil et de l'information délivrée avant et pendant la formation (Qualiopi critère 1 — information des publics).",
    order_index: 7,
  },
  {
    question_text: "Vos éventuels besoins spécifiques (situation de handicap, difficultés particulières) ont-ils été pris en compte de manière satisfaisante ?",
    question_type: 'rating',
    points: 1,
    explanation: "Accessibilité et compensation du handicap — exigence transversale obligatoire du référentiel Qualiopi (critère 8).",
    order_index: 8,
  },
  {
    question_text: "Dans quelle mesure recommanderiez-vous cette formation à un(e) collègue ?",
    question_type: 'rating',
    points: 1,
    explanation: "Net Promoter Score (NPS) à chaud.",
    order_index: 9,
  },
  {
    question_text: "Qu'avez-vous le plus apprécié dans cette formation ?",
    question_type: 'essay',
    points: 0,
    explanation: "Collecte les points forts perçus pour valoriser les pratiques efficaces.",
    order_index: 10,
  },
  {
    question_text: "Quels aspects de la formation mériteraient selon vous d'être améliorés ?",
    question_type: 'essay',
    points: 0,
    explanation: "Boucle d'amélioration continue (Qualiopi indicateur 10).",
    order_index: 11,
  },
]

export default function NewEvaluationTemplatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assessment_type: '',
    subject: '',
    max_score: 20,
    passing_score: 70,
    time_limit_minutes: null as number | null,
    shuffle_questions: false,
    show_correct_answers: true,
  })

  const [questions, setQuestions] = useState<Question[]>([])

  const loadDefaultColdQuestions = () => {
    const defaultQuestions = DEFAULT_COLD_QUESTIONS.map((q, index) => ({
      ...q,
      id: `default-cold-${index}-${Date.now()}`,
    }))
    setQuestions(defaultQuestions)
    if (!formData.name) {
      setFormData(prev => ({
        ...prev,
        name: 'Évaluation à froid — Apprenant',
        description: 'Questionnaire envoyé 1 à 3 mois après la formation pour mesurer le transfert des acquis et l\'impact professionnel.',
      }))
    }
  }

  const loadDefaultInstructorQuestions = () => {
    const defaultQuestions = DEFAULT_INSTRUCTOR_QUESTIONS.map((q, index) => ({
      ...q,
      id: `default-instructor-${index}-${Date.now()}`,
    }))
    setQuestions(defaultQuestions)
    if (!formData.name) {
      setFormData(prev => ({
        ...prev,
        name: 'Auto-évaluation formateur — Post-session',
        description: 'Questionnaire complété par le formateur à l\'issue de chaque session pour capitaliser sur les bonnes pratiques et identifier les axes d\'amélioration.',
      }))
    }
  }

  const loadDefaultFunderQuestions = () => {
    const defaultQuestions = DEFAULT_FUNDER_QUESTIONS.map((q, index) => ({
      ...q,
      id: `default-funder-${index}-${Date.now()}`,
    }))
    setQuestions(defaultQuestions)
    if (!formData.name) {
      setFormData(prev => ({
        ...prev,
        name: 'Évaluation financeur — Retour sur investissement',
        description: 'Questionnaire destiné au financeur (OPCO, employeur, État) pour mesurer la valeur et l\'impact de l\'action de formation.',
      }))
    }
  }

  const loadDefaultManagerQuestions = () => {
    const defaultQuestions = DEFAULT_MANAGER_QUESTIONS.map((q, index) => ({
      ...q,
      id: `default-manager-${index}-${Date.now()}`,
    }))
    setQuestions(defaultQuestions)
    if (!formData.name) {
      setFormData(prev => ({
        ...prev,
        name: 'Évaluation manager — Impact formation',
        description: 'Questionnaire destiné au responsable hiérarchique pour mesurer l\'impact observable de la formation sur les pratiques professionnelles du collaborateur.',
      }))
    }
  }

  const loadDefaultPreFormationQuestions = () => {
    const defaultQuestions = DEFAULT_PRE_FORMATION_QUESTIONS.map((q, index) => ({
      ...q,
      id: `default-pre-${index}-${Date.now()}`,
    }))
    setQuestions(defaultQuestions)
    if (!formData.name) {
      setFormData(prev => ({
        ...prev,
        name: 'Positionnement pré-formation — Apprenant',
        description: 'Questionnaire complété avant le démarrage de la formation pour positionner l\'apprenant et recueillir ses attentes.',
      }))
    }
  }

  const loadDefaultHotQuestions = () => {
    const defaultQuestions = DEFAULT_HOT_QUESTIONS.map((q, index) => ({
      ...q,
      id: `default-hot-${index}-${Date.now()}`,
    }))
    setQuestions(defaultQuestions)
    if (!formData.name) {
      setFormData(prev => ({
        ...prev,
        name: 'Évaluation à chaud — Apprenant',
        description: 'Questionnaire complété immédiatement à l\'issue de la formation pour mesurer la satisfaction et l\'atteinte des objectifs pédagogiques.',
      }))
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      if (!formData.name) throw new Error('Le nom du modèle est requis')
      if (questions.length === 0) throw new Error('Au moins une question est requise')

      return evaluationTemplateService.createTemplate(
        user.organization_id,
        {
          name: formData.name,
          description: formData.description || null,
          assessment_type: formData.assessment_type || null,
          subject: formData.subject || null,
          max_score: formData.max_score,
          passing_score: formData.passing_score || null,
          time_limit_minutes: formData.time_limit_minutes || null,
          shuffle_questions: formData.shuffle_questions,
          show_correct_answers: formData.show_correct_answers,
        },
        questions.map((q) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ? JSON.stringify(q.options) as any : null,
          correct_answer: q.correct_answer || null,
          correct_answer_pattern: q.correct_answer_pattern || null,
          points: q.points,
          explanation: q.explanation || null,
          order_index: q.order_index,
        }))
      )
    },
    onSuccess: (template: any) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] })
      addToast({
        type: 'success',
        title: 'Modèle créé',
        description: 'Le modèle d\'évaluation a été créé avec succès.',
      })
      if (template?.id) {
        router.push(`/dashboard/evaluations/templates/${template.id}`)
      }
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création.',
      })
    },
  })

  const isSatisfactionTemplate = SATISFACTION_ASSESSMENT_TYPES.includes(formData.assessment_type)

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question_text: '',
      question_type: isSatisfactionTemplate ? 'rating' : 'multiple_choice',
      options: isSatisfactionTemplate ? undefined : [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
      points: 1,
      order_index: questions.length + 1,
    }
    setQuestions([...questions, newQuestion])
  }

  const addExpressionLibreQuestion = () => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question_text: 'Dites-nous en quelques mots ce que vous avez pensé de la formation.',
      question_type: 'essay',
      points: 0,
      order_index: questions.length + 1,
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id).map((q, index) => ({ ...q, order_index: index + 1 })))
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const updated = { ...q, ...updates }
          if (updates.question_type && updates.question_type !== q.question_type) {
            if (updates.question_type === 'multiple_choice') {
              updated.options = [
                { text: '', is_correct: false },
                { text: '', is_correct: false },
              ]
            } else {
              updated.options = undefined
            }
            updated.correct_answer = undefined
          }
          return updated
        }
        return q
      })
    )
  }

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: [...q.options, { text: '', is_correct: false }],
          }
        }
        return q
      })
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = q.options.filter((_, i) => i !== optionIndex)
          return {
            ...q,
            options: newOptions.length > 0 ? newOptions : undefined,
          }
        }
        return q
      })
    )
  }

  const updateOption = (questionId: string, optionIndex: number, updates: Partial<QuestionOption>) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: q.options.map((opt, i) => (i === optionIndex ? { ...opt, ...updates } : opt)),
          }
        }
        return q
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/evaluations/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouveau modèle d'évaluation</h1>
          <p className="text-muted-foreground mt-1">
            Créez un modèle avec questions et réponses pour correction automatique
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="space-y-6"
      >
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du modèle *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Évaluation de fin de module"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du modèle d'évaluation"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Sujet/Matière</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Mathématiques"
                />
              </div>

              <div>
                <Label htmlFor="assessment_type">Type d'évaluation</Label>
                <select
                  id="assessment_type"
                  value={formData.assessment_type}
                  onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Sélectionner...</option>
                  <option value="pre_formation">Pré-formation</option>
                  <option value="hot">À chaud</option>
                  <option value="cold">À froid</option>
                  <option value="quiz">Quiz</option>
                  <option value="exam">Examen</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max_score">Note maximale</Label>
                <Input
                  id="max_score"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.max_score}
                  onChange={(e) => setFormData({ ...formData, max_score: parseFloat(e.target.value) || 20 })}
                />
              </div>

              <div>
                <Label htmlFor="passing_score">Score de réussite (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseFloat(e.target.value) || 70 })}
                />
              </div>

              <div>
                <Label htmlFor="time_limit">Durée (minutes)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  min="1"
                  value={formData.time_limit_minutes || ''}
                  onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Illimité"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.shuffle_questions}
                  onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
                />
                <span>Mélanger les questions</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.show_correct_answers}
                  onChange={(e) => setFormData({ ...formData, show_correct_answers: e.target.checked })}
                />
                <span>Afficher les bonnes réponses après correction</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Questions</CardTitle>
              <div className="flex gap-2">
                {formData.assessment_type === 'instructor' && (
                  <Button
                    type="button"
                    onClick={loadDefaultInstructorQuestions}
                    variant="outline"
                    className="border-sky-200 text-sky-700 hover:bg-sky-50"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Charger le modèle standard
                  </Button>
                )}
                {formData.assessment_type === 'funder' && (
                  <Button
                    type="button"
                    onClick={loadDefaultFunderQuestions}
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Charger le modèle standard
                  </Button>
                )}
                {formData.assessment_type === 'manager' && (
                  <Button
                    type="button"
                    onClick={loadDefaultManagerQuestions}
                    variant="outline"
                    className="border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Charger le modèle standard
                  </Button>
                )}
                {formData.assessment_type === 'pre_formation' && (
                  <Button
                    type="button"
                    onClick={loadDefaultPreFormationQuestions}
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Charger le modèle standard
                  </Button>
                )}
                {formData.assessment_type === 'hot' && (
                  <Button
                    type="button"
                    onClick={loadDefaultHotQuestions}
                    variant="outline"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Charger le modèle standard
                  </Button>
                )}
                {formData.assessment_type === 'cold' && (
                  <Button
                    type="button"
                    onClick={loadDefaultColdQuestions}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Charger le modèle standard
                  </Button>
                )}
                {isSatisfactionTemplate && (
                  <Button type="button" onClick={addExpressionLibreQuestion} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Question expression libre
                  </Button>
                )}
                <Button type="button" onClick={addQuestion} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {isSatisfactionTemplate ? 'Ajouter une question (étoiles)' : 'Ajouter une question'}
                </Button>
              </div>
            </div>
            {formData.assessment_type === 'instructor' && questions.length === 0 && (
              <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                <span className="font-semibold">Auto-évaluation formateur</span> — Complétée par le formateur après chaque session pour capitaliser sur les bonnes pratiques et identifier les axes d&apos;amélioration (Qualiopi indicateurs 5 et 8). Cliquez sur &laquo; Charger le modèle standard &raquo; pour démarrer avec 5 questions étoiles et 4 questions ouvertes.
              </div>
            )}
            {formData.assessment_type === 'funder' && questions.length === 0 && (
              <div className="mt-2 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                <span className="font-semibold">Évaluation financeur</span> — Destinée au financeur (OPCO, employeur, État) pour mesurer la valeur et le retour sur investissement de l&apos;action de formation (Qualiopi indicateurs 7 et 14). Cliquez sur &laquo; Charger le modèle standard &raquo; pour démarrer avec 6 questions étoiles et 3 questions ouvertes.
              </div>
            )}
            {formData.assessment_type === 'manager' && questions.length === 0 && (
              <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <span className="font-semibold">Évaluation manager</span> — Destinée au responsable hiérarchique pour mesurer l&apos;impact observable de la formation sur les pratiques du collaborateur (Qualiopi indicateur 14). Cliquez sur &laquo; Charger le modèle standard &raquo; pour démarrer avec 6 questions étoiles et 3 questions ouvertes.
              </div>
            )}
            {formData.assessment_type === 'pre_formation' && questions.length === 0 && (
              <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span className="font-semibold">Pré-formation (positionnement)</span> — Complétée avant le démarrage pour positionner l&apos;apprenant et recueillir ses attentes (Qualiopi indicateur 2). Cliquez sur &laquo; Charger le modèle standard &raquo; pour démarrer avec 5 questions étoiles et 6 questions ouvertes (dont acquis antérieurs et besoins spécifiques).
              </div>
            )}
            {formData.assessment_type === 'hot' && questions.length === 0 && (
              <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <span className="font-semibold">Évaluation à chaud</span> — Complétée immédiatement après la formation pour mesurer la satisfaction et l&apos;atteinte des objectifs (Qualiopi indicateur 7). Cliquez sur &laquo; Charger le modèle standard &raquo; pour démarrer avec 9 questions étoiles (dont accessibilité et conditions admin.) et 2 questions ouvertes.
              </div>
            )}
            {formData.assessment_type === 'cold' && questions.length === 0 && (
              <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                <span className="font-semibold">Évaluation à froid</span> — Envoyée 1 à 3 mois après la formation pour mesurer le transfert des acquis et l&apos;impact professionnel (Qualiopi indicateur 14). Cliquez sur &laquo; Charger le modèle standard &raquo; pour démarrer avec 6 questions étoiles (dont suivi post-formation) et 3 questions ouvertes.
              </div>
            )}
            {isSatisfactionTemplate && !['instructor', 'funder', 'manager', 'pre_formation', 'hot', 'cold'].includes(formData.assessment_type) && (
              <p className="text-sm text-muted-foreground mt-1">
                Évaluations satisfaction : uniquement notation par étoiles (0–5) et une dernière question en expression libre (ex. Dites-nous en quelques mots ce que vous avez pensé de la formation).
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isSatisfactionTemplate
                  ? 'Aucune question. Cliquez sur "Ajouter une question (étoiles)" ou "Question expression libre" pour commencer.'
                  : 'Aucune question. Cliquez sur "Ajouter une question" pour commencer.'}
              </div>
            ) : (
              questions.map((question, index) => (
                <Card key={question.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">Question {index + 1}</CardTitle>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Texte de la question *</Label>
                      <Textarea
                        value={question.question_text}
                        onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                        placeholder="Entrez la question..."
                        rows={2}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type de question *</Label>
                        <select
                          value={question.question_type}
                          onChange={(e) => updateQuestion(question.id, { question_type: e.target.value as QuestionType })}
                          className="w-full px-4 py-2 border rounded-lg"
                        >
                          {isSatisfactionTemplate ? (
                            <>
                              <option value="rating">Étoiles 0–5 (satisfaction)</option>
                              <option value="essay">Expression libre</option>
                            </>
                          ) : (
                            <>
                              <option value="multiple_choice">Choix multiples</option>
                              <option value="true_false">Vrai/Faux</option>
                              <option value="short_answer">Réponse courte</option>
                              <option value="numeric">Numérique</option>
                              <option value="rating">Étoiles 0-5 (satisfaction)</option>
                              <option value="essay">Expression libre</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <Label>Points *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, { points: parseFloat(e.target.value) || 1 })}
                          required
                        />
                      </div>
                    </div>

                    {/* Options pour choix multiples (masqué pour modèles satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'multiple_choice' && question.options && (
                      <div className="space-y-2">
                        <Label>Options de réponse *</Label>
                        <p className="text-xs text-muted-foreground">
                          Pour les évaluations satisfaction : renseignez « Valeur étoiles » (0–5) pour chaque option (ex. Excellent=5, Moyen=1, Insuffisant=0). La moyenne sera calculée automatiquement.
                        </p>
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex flex-wrap items-center gap-2">
                            <input
                              type="checkbox"
                              checked={option.is_correct ?? false}
                              onChange={(e) => updateOption(question.id, optIndex, { is_correct: e.target.checked })}
                              title="Bonne réponse (quiz noté)"
                            />
                            <Input
                              value={option.text}
                              onChange={(e) => updateOption(question.id, optIndex, { text: e.target.value })}
                              placeholder={`Option ${optIndex + 1}`}
                              className="flex-1 min-w-[120px]"
                            />
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`star-${question.id}-${optIndex}`} className="text-xs whitespace-nowrap">Étoiles</Label>
                              <Input
                                id={`star-${question.id}-${optIndex}`}
                                type="number"
                                min={0}
                                max={5}
                                step={1}
                                value={option.star_value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                                  updateOption(question.id, optIndex, { star_value: v === undefined || Number.isNaN(v) ? undefined : Math.min(5, Math.max(0, v)) })
                                }}
                                placeholder="0–5"
                                className="w-16"
                                title="Valeur étoiles pour satisfaction (0–5)"
                              />
                            </div>
                            {question.options && question.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(question.id, optIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(question.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter une option
                        </Button>
                      </div>
                    )}

                    {/* Réponse pour Vrai/Faux (masqué pour satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'true_false' && (
                      <div>
                        <Label>Bonne réponse *</Label>
                        <select
                          value={question.correct_answer || ''}
                          onChange={(e) => updateQuestion(question.id, { correct_answer: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="true">Vrai</option>
                          <option value="false">Faux</option>
                        </select>
                      </div>
                    )}

                    {/* Réponse pour réponse courte (masqué pour satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'short_answer' && (
                      <div className="space-y-2">
                        <div>
                          <Label>Bonne réponse *</Label>
                          <Input
                            value={question.correct_answer || ''}
                            onChange={(e) => updateQuestion(question.id, { correct_answer: e.target.value })}
                            placeholder="Réponse attendue"
                          />
                        </div>
                        <div>
                          <Label>Pattern regex (optionnel)</Label>
                          <Input
                            value={question.correct_answer_pattern || ''}
                            onChange={(e) => updateQuestion(question.id, { correct_answer_pattern: e.target.value })}
                            placeholder="Ex: ^(oui|yes)$ pour accepter 'oui' ou 'yes'"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Permet une validation flexible (insensible à la casse par défaut)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Réponse pour numérique (masqué pour satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'numeric' && (
                      <div>
                        <Label>Bonne réponse (nombre) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={question.correct_answer || ''}
                          onChange={(e) => updateQuestion(question.id, { correct_answer: e.target.value })}
                          placeholder="Ex: 42"
                        />
                      </div>
                    )}

                    {/* Étoiles 0-5 (satisfaction) */}
                    {question.question_type === 'rating' && (
                      <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-2.5 flex items-center gap-3">
                        <span className="text-lg tracking-widest">★★★★★</span>
                        <p className="text-sm text-amber-800">
                          L&apos;apprenant verra une notation de 0 à 5 étoiles. Aucune bonne réponse à définir — la moyenne est calculée automatiquement.
                        </p>
                      </div>
                    )}

                    {/* Note pour dissertation */}
                    {question.question_type === 'essay' && (
                      <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-2.5">
                        <p className="text-sm text-slate-600">
                          {isSatisfactionTemplate
                            ? "L'apprenant disposera d'un champ texte libre pour exprimer ses observations."
                            : 'Les questions de type "Expression libre" nécessitent une correction manuelle. La note sera attribuée par l\'enseignant après correction.'}
                        </p>
                      </div>
                    )}

                    {/* Explication — uniquement pour les quiz notés */}
                    {!isSatisfactionTemplate && (
                      <div>
                        <Label>Explication (optionnel)</Label>
                        <Textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                          placeholder="Explication de la réponse correcte (affichée après correction)"
                          rows={2}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/dashboard/evaluations/templates">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending || questions.length === 0}>
            {createMutation.isPending ? 'Création...' : 'Créer le modèle'}
          </Button>
        </div>
      </form>
    </div>
  )
}


