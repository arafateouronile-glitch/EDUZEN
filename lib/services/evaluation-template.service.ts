import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type EvaluationTemplate = TableRow<'evaluation_templates'>
type EvaluationTemplateQuestion = TableRow<'evaluation_template_questions'>
type EvaluationTemplateInstance = TableRow<'evaluation_template_instances'>
type EvaluationResponse = TableRow<'evaluation_responses'>

type EvaluationTemplateInsert = TableInsert<'evaluation_templates'>
type EvaluationTemplateQuestionInsert = TableInsert<'evaluation_template_questions'>
type EvaluationTemplateInstanceInsert = TableInsert<'evaluation_template_instances'>
type EvaluationResponseInsert = TableInsert<'evaluation_responses'>

export interface QuestionOption {
  text: string
  is_correct: boolean
}

export interface EvaluationTemplateWithQuestions extends EvaluationTemplate {
  questions: EvaluationTemplateQuestion[]
}

export interface EvaluationInstanceWithDetails extends EvaluationTemplateInstance {
  template: EvaluationTemplateWithQuestions
  grade: TableRow<'grades'>
  responses?: EvaluationResponse[]
}

export interface EvaluationScore {
  total_score: number
  max_score: number
  percentage: number
  correct_count: number
  total_questions: number
}

class EvaluationTemplateService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // =====================================================
  // Templates
  // =====================================================

  /**
   * Récupère tous les modèles d'évaluations d'une organisation
   */
  async getTemplates(organizationId: string): Promise<EvaluationTemplateWithQuestions[]> {
    const { data, error } = await this.supabase
      .from('evaluation_templates')
      .select(`
        *,
        questions:evaluation_template_questions(*)
      `)
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération modèles:', error)
      return []
    }
    return (data || []) as EvaluationTemplateWithQuestions[]
  }

  /**
   * Récupère un modèle par son ID avec ses questions
   */
  async getTemplateById(id: string): Promise<EvaluationTemplateWithQuestions | null> {
    const { data, error } = await this.supabase
      .from('evaluation_templates')
      .select(`
        *,
        questions:evaluation_template_questions(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erreur récupération modèle:', error)
      return null
    }
    return data as EvaluationTemplateWithQuestions
  }

  /**
   * Crée un nouveau modèle d'évaluation
   */
  async createTemplate(
    organizationId: string,
    template: Omit<EvaluationTemplateInsert, 'organization_id' | 'created_at' | 'updated_at'>,
    questions: Omit<EvaluationTemplateQuestionInsert, 'template_id' | 'created_at' | 'updated_at'>[]
  ): Promise<EvaluationTemplateWithQuestions> {
    // Créer le modèle
    const { data: templateData, error: templateError } = await this.supabase
      .from('evaluation_templates')
      .insert({
        ...template,
        organization_id: organizationId,
      })
      .select()
      .single()

    if (templateError) throw templateError

    // Créer les questions
    if (questions.length > 0) {
      const questionsToInsert = questions.map((q, index) => ({
        ...q,
        template_id: templateData.id,
        order_index: q.order_index ?? index + 1,
      }))

      const { error: questionsError } = await this.supabase
        .from('evaluation_template_questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError
    }

    // Récupérer le modèle complet avec les questions
    const fullTemplate = await this.getTemplateById(templateData.id)
    if (!fullTemplate) throw new Error('Erreur lors de la récupération du modèle créé')

    return fullTemplate
  }

  /**
   * Met à jour un modèle d'évaluation
   */
  async updateTemplate(
    id: string,
    template: Partial<EvaluationTemplateInsert>,
    questions?: Omit<EvaluationTemplateQuestionInsert, 'template_id' | 'created_at' | 'updated_at'>[]
  ): Promise<EvaluationTemplateWithQuestions> {
    // Mettre à jour le modèle
    const { error: templateError } = await this.supabase
      .from('evaluation_templates')
      .update(template)
      .eq('id', id)

    if (templateError) throw templateError

    // Si des questions sont fournies, les mettre à jour
    if (questions !== undefined) {
      // Supprimer les anciennes questions
      const { error: deleteError } = await this.supabase
        .from('evaluation_template_questions')
        .delete()
        .eq('template_id', id)

      if (deleteError) throw deleteError

      // Insérer les nouvelles questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q, index) => ({
          ...q,
          template_id: id,
          order_index: q.order_index ?? index + 1,
        }))

        const { error: insertError } = await this.supabase
          .from('evaluation_template_questions')
          .insert(questionsToInsert)

        if (insertError) throw insertError
      }
    }

    // Récupérer le modèle complet
    const fullTemplate = await this.getTemplateById(id)
    if (!fullTemplate) throw new Error('Erreur lors de la récupération du modèle mis à jour')

    return fullTemplate
  }

  /**
   * Supprime un modèle d'évaluation
   */
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('evaluation_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // =====================================================
  // Instances (Association modèle <-> évaluation)
  // =====================================================

  /**
   * Associe un modèle à une évaluation (grade)
   */
  async createInstance(
    gradeId: string,
    templateId: string,
    config?: {
      max_score?: number
      time_limit_minutes?: number
    }
  ): Promise<EvaluationTemplateInstance> {
    const { data, error } = await this.supabase
      .from('evaluation_template_instances')
      .insert({
        grade_id: gradeId,
        template_id: templateId,
        max_score: config?.max_score,
        time_limit_minutes: config?.time_limit_minutes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère l'instance associée à une évaluation
   */
  async getInstanceByGradeId(gradeId: string): Promise<EvaluationInstanceWithDetails | null> {
    try {
      const { data, error } = await this.supabase
        .from('evaluation_template_instances')
        .select(`
          *,
          template:evaluation_templates(
            *,
            questions:evaluation_template_questions(*)
          ),
          grade:grades(*)
        `)
        .eq('grade_id', gradeId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data as EvaluationInstanceWithDetails
    } catch {
      return null
    }
  }

  /**
   * Récupère toutes les réponses d'une instance
   */
  async getResponses(instanceId: string, studentId?: string): Promise<EvaluationResponse[]> {
    let query = this.supabase
      .from('evaluation_responses')
      .select('*')
      .eq('instance_id', instanceId)

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Erreur récupération réponses:', error)
      return []
    }
    return data || []
  }

  // =====================================================
  // Réponses des étudiants
  // =====================================================

  /**
   * Enregistre ou met à jour une réponse d'étudiant
   */
  async saveResponse(
    instanceId: string,
    questionId: string,
    studentId: string,
    answer: {
      answer_text?: string
      answer_choice?: string[]
      answer_boolean?: boolean
    }
  ): Promise<EvaluationResponse> {
    const { data, error } = await this.supabase
      .from('evaluation_responses')
      .upsert({
        instance_id: instanceId,
        question_id: questionId,
        student_id: studentId,
        answer_text: answer.answer_text,
        answer_choice: answer.answer_choice,
        answer_boolean: answer.answer_boolean,
      }, {
        onConflict: 'instance_id,question_id,student_id'
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Corrige automatiquement toutes les réponses d'une instance
   */
  async autoCorrectResponses(instanceId: string): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('auto_correct_evaluation_responses', { p_instance_id: instanceId })

    if (error) throw error
    return data || 0
  }

  /**
   * Calcule le score d'une évaluation
   */
  async calculateScore(instanceId: string): Promise<EvaluationScore | null> {
    const { data, error } = await this.supabase
      .rpc('calculate_evaluation_score', { p_instance_id: instanceId })

    if (error) {
      console.error('Erreur calcul score:', error)
      return null
    }

    if (!data || data.length === 0) return null

    return {
      total_score: Number(data[0].total_score) || 0,
      max_score: Number(data[0].max_score) || 0,
      percentage: Number(data[0].percentage) || 0,
      correct_count: Number(data[0].correct_count) || 0,
      total_questions: Number(data[0].total_questions) || 0,
    }
  }

  /**
   * Met à jour la note de l'évaluation (grade) avec le score calculé
   */
  async updateGradeFromScore(gradeId: string, instanceId: string): Promise<void> {
    const score = await this.calculateScore(instanceId)
    if (!score) return

    const { error } = await this.supabase
      .from('grades')
      .update({
        score: score.total_score,
        max_score: score.max_score,
        // percentage est une colonne générée, elle sera calculée automatiquement
      })
      .eq('id', gradeId)

    if (error) throw error
  }
}

export const evaluationTemplateService = new EvaluationTemplateService()

