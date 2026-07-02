export type QuestionType = 'mcq' | 'true_false'

export interface QuizOption {
  id: string
  text: string
  correct: boolean
}

export interface QuizQuestion {
  id: string
  type: QuestionType
  question: string
  points: number
  explanation?: string
  // mcq
  options?: QuizOption[]
  // true_false
  correct?: boolean
}

export interface QuizSettings {
  pass_threshold: number       // 0-100 (%)
  max_attempts: number         // 0 = illimité
  show_correct_answers: boolean
  shuffle_questions: boolean
  time_limit_minutes: number | null
}

export interface QuizContent {
  settings: QuizSettings
  questions: QuizQuestion[]
}

export interface QuizAttemptAnswer {
  [questionId: string]: string | boolean  // option_id ou true/false
}

export interface QuizAttempt {
  id: string
  lesson_id: string
  student_id: string
  attempt_number: number
  answers: QuizAttemptAnswer
  score_percentage: number | null
  passed: boolean | null
  completed_at: string | null
  created_at: string
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  pass_threshold: 70,
  max_attempts: 3,
  show_correct_answers: true,
  shuffle_questions: false,
  time_limit_minutes: null,
}
