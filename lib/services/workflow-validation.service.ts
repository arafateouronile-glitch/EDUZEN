/**

 * Service pour gérer les workflows de validation multi-niveaux
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Types locaux pour les tables workflow qui ne sont pas encore dans le schéma Supabase
type Workflow = any
type WorkflowInsert = any
type WorkflowStep = any
type WorkflowStepInsert = any
type WorkflowInstance = any
type WorkflowInstanceInsert = any
type WorkflowApproval = any
type WorkflowApprovalInsert = any

export interface WorkflowStepConfig {
  step_order: number
  name: string
  description?: string
  approver_role?: string
  approver_user_id?: string
  is_required?: boolean
  can_reject?: boolean
  can_comment?: boolean
  timeout_days?: number
}

export interface CreateWorkflowInput {
  organization_id: string
  name: string
  description?: string
  is_default?: boolean
  steps: WorkflowStepConfig[]
}

export class WorkflowValidationService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== WORKFLOWS ==========

  /**
   * Crée un nouveau workflow de validation
   */
  async createWorkflow(input: CreateWorkflowInput, createdBy: string): Promise<Workflow> {
    // Créer le workflow
    const { data: workflow, error: workflowError } = await (this.supabase as any)
      .from('template_workflows')
      .insert({
        organization_id: input.organization_id,
        name: input.name,
        description: input.description,
        is_default: input.is_default || false,
        created_by: createdBy,
      } as WorkflowInsert)
      .select()
      .single()

    if (workflowError) throw workflowError

    // Créer les étapes
    if (input.steps.length > 0) {
      const steps: WorkflowStepInsert[] = input.steps.map((step) => ({
        workflow_id: workflow.id,
        step_order: step.step_order,
        name: step.name,
        description: step.description,
        approver_role: step.approver_role || null,
        approver_user_id: step.approver_user_id || null,
        is_required: step.is_required ?? true,
        can_reject: step.can_reject ?? true,
        can_comment: step.can_comment ?? true,
        timeout_days: step.timeout_days || null,
      }))

      const { error: stepsError } = await (this.supabase as any)
        .from('template_workflow_steps')
        .insert(steps)

      if (stepsError) throw stepsError
    }

    return workflow
  }

  /**
   * Récupère tous les workflows d'une organisation
   */
  async getWorkflows(organizationId: string): Promise<Workflow[]> {
    const { data, error } = await (this.supabase as any)
      .from('template_workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère un workflow avec ses étapes
   */
  async getWorkflowWithSteps(workflowId: string): Promise<Workflow & { steps: WorkflowStep[] }> {
    const { data: workflow, error: workflowError } = await (this.supabase as any)
      .from('template_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (workflowError) throw workflowError

    const { data: steps, error: stepsError } = await (this.supabase as any)
      .from('template_workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true })

    if (stepsError) throw stepsError

    return {
      ...workflow,
      steps: steps || [],
    }
  }

  /**
   * Met à jour un workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<Workflow> {
    const { data, error } = await (this.supabase as any)
      .from('template_workflows')
      .update(updates)
      .eq('id', workflowId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime un workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('template_workflows')
      .delete()
      .eq('id', workflowId)

    if (error) throw error
  }

  // ========== WORKFLOW STEPS ==========

  /**
   * Ajoute une étape à un workflow
   */
  async addWorkflowStep(workflowId: string, step: WorkflowStepConfig): Promise<WorkflowStep> {
    const { data, error } = await (this.supabase as any)
      .from('template_workflow_steps')
      .insert({
        workflow_id: workflowId,
        ...step,
      } as WorkflowStepInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour une étape
   */
  async updateWorkflowStep(stepId: string, updates: Partial<WorkflowStep>): Promise<WorkflowStep> {
    const { data, error } = await (this.supabase as any)
      .from('template_workflow_steps')
      .update(updates)
      .eq('id', stepId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime une étape
   */
  async deleteWorkflowStep(stepId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('template_workflow_steps')
      .delete()
      .eq('id', stepId)

    if (error) throw error
  }

  // ========== WORKFLOW INSTANCES ==========

  /**
   * Démarre un workflow pour un template
   */
  async startWorkflow(
    templateId: string,
    workflowId: string,
    startedBy: string
  ): Promise<WorkflowInstance> {
    // Récupérer la première étape
    const { data: firstStep } = await (this.supabase as any)
      .from('template_workflow_steps')
      .select('id')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true })
      .limit(1)
      .single()

    // Créer l'instance
    const { data: instance, error: instanceError } = await (this.supabase as any)
      .from('template_workflow_instances')
      .insert({
        template_id: templateId,
        workflow_id: workflowId,
        started_by: startedBy,
        status: 'in_progress',
        current_step_id: firstStep?.id || null,
      } as WorkflowInstanceInsert)
      .select()
      .single()

    if (instanceError) throw instanceError

    // Créer les approbations pour la première étape
    if (firstStep) {
      await this.createApprovalsForStep(instance.id, firstStep.id)
    }

    return instance
  }

  /**
   * Crée les approbations pour une étape
   */
  private async createApprovalsForStep(instanceId: string, stepId: string): Promise<void> {
    const { data: step } = await (this.supabase as any)
      .from('template_workflow_steps')
      .select('*')
      .eq('id', stepId)
      .single()

    if (!step) return

    // Si un utilisateur spécifique est défini
    if (step.approver_user_id) {
      const deadline = step.timeout_days
        ? new Date(Date.now() + step.timeout_days * 24 * 60 * 60 * 1000).toISOString()
        : null

      await (this.supabase as any).from('template_workflow_approvals').insert({
        instance_id: instanceId,
        step_id: stepId,
        approver_id: step.approver_user_id,
        status: 'pending',
        deadline,
      } as WorkflowApprovalInsert)
    } else if (step.approver_role) {
      // Si un rôle est défini, récupérer les utilisateurs avec ce rôle
      const { data: users } = await (this.supabase as any)
        .from('users')
        .select('id')
        .eq('role', step.approver_role)

      if (users) {
        const deadline = step.timeout_days
          ? new Date(Date.now() + step.timeout_days * 24 * 60 * 60 * 1000).toISOString()
          : null

        const approvals: WorkflowApprovalInsert[] = users.map((user: any) => ({
          instance_id: instanceId,
          step_id: stepId,
          approver_id: user.id,
          status: 'pending',
          deadline,
        }))

        await (this.supabase as any).from('template_workflow_approvals').insert(approvals)
      }
    }
  }

  /**
   * Récupère les instances de workflow pour un template
   */
  async getTemplateInstances(templateId: string): Promise<WorkflowInstance[]> {
    const { data, error } = await (this.supabase as any)
      .from('template_workflow_instances')
      .select('*, workflow:template_workflows(*)')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère une instance avec ses détails
   */
  async getInstanceWithDetails(instanceId: string): Promise<
    WorkflowInstance & {
      workflow: Workflow
      current_step: WorkflowStep | null
      approvals: (WorkflowApproval & { step: WorkflowStep; approver: { id: string; full_name: string; email: string } | null })[]
    }
  > {
    const { data: instance, error: instanceError } = await (this.supabase as any)
      .from('template_workflow_instances')
      .select('*, workflow:template_workflows(*)')
      .eq('id', instanceId)
      .single()

    if (instanceError) throw instanceError

    // Récupérer l'étape actuelle
    let current_step: WorkflowStep | null = null
    if (instance.current_step_id) {
      const { data: step } = await (this.supabase as any)
        .from('template_workflow_steps')
        .select('*')
        .eq('id', instance.current_step_id)
        .single()
      current_step = step || null
    }

    // Récupérer les approbations
    const { data: approvals } = await (this.supabase as any)
      .from('template_workflow_approvals')
      .select('*, step:template_workflow_steps(*), approver:users!template_workflow_approvals_approver_id_fkey(id, email, full_name)')
      .eq('instance_id', instanceId)
      .order('created_at', { ascending: true })

    return {
      ...instance,
      workflow: instance.workflow as Workflow,
      current_step,
      approvals: (approvals || []) as (WorkflowApproval & { step: WorkflowStep; approver: { id: string; full_name: string; email: string } | null })[],
    }
  }

  // ========== APPROVALS ==========

  /**
   * Approuve ou rejette une étape
   */
  async approveStep(
    approvalId: string,
    status: 'approved' | 'rejected',
    comment?: string,
    approverId?: string
  ): Promise<WorkflowApproval> {
    // Mettre à jour l'approbation
    const { data: approval, error: approvalError } = await (this.supabase as any)
      .from('template_workflow_approvals')
      .update({
        status,
        comment,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', approvalId)
      .select()
      .single()

    if (approvalError) throw approvalError

    // Si rejeté, mettre à jour l'instance
    if (status === 'rejected') {
      await (this.supabase as any)
        .from('template_workflow_instances')
        .update({
          status: 'rejected',
          completed_at: new Date().toISOString(),
        })
        .eq('id', approval.instance_id)
    } else {
      // Vérifier si toutes les approbations requises de l'étape sont approuvées
      const { data: stepApprovals } = await (this.supabase as any)
        .from('template_workflow_approvals')
        .select('*, step:template_workflow_steps(*)')
        .eq('instance_id', approval.instance_id)
        .eq('step_id', approval.step_id)

      // Récupérer l'étape pour vérifier is_required
      const { data: currentStep } = await (this.supabase as any)
        .from('template_workflow_steps')
        .select('*')
        .eq('id', approval.step_id)
        .single()

      if (!currentStep) {
        throw new Error('Étape non trouvée')
      }

      // Filtrer les approbations requises
      const requiredApprovals = stepApprovals?.filter((a: any) => {
        const step = (a as any).step
        return step?.is_required !== false
      }) || []

      const allRequiredApproved = requiredApprovals.length > 0 && requiredApprovals.every((a: any) => a.status === 'approved')

      if (allRequiredApproved) {
        // Récupérer l'instance pour obtenir le workflow_id
        const { data: instance } = await (this.supabase as any)
          .from('template_workflow_instances')
          .select('workflow_id, current_step_id')
          .eq('id', approval.instance_id)
          .single()

        if (!instance) {
          throw new Error('Instance non trouvée')
        }

        // Trouver l'étape suivante
        const { data: nextStep } = await (this.supabase as any)
          .from('template_workflow_steps')
          .select('*')
          .eq('workflow_id', instance.workflow_id)
          .gt('step_order', currentStep.step_order)
          .order('step_order', { ascending: true })
          .limit(1)
          .single()

        if (nextStep) {
          // Mettre à jour l'instance avec la nouvelle étape
          await (this.supabase as any)
            .from('template_workflow_instances')
            .update({
              current_step_id: nextStep.id,
              status: 'in_progress',
            })
            .eq('id', approval.instance_id)

          // Créer les approbations pour la nouvelle étape
          await this.createApprovalsForStep(approval.instance_id, nextStep.id)
        } else {
          // Dernière étape terminée, approuver le workflow
          await (this.supabase as any)
            .from('template_workflow_instances')
            .update({
              status: 'approved',
              completed_at: new Date().toISOString(),
              current_step_id: null,
            })
            .eq('id', approval.instance_id)
        }
      }
    }

    return approval
  }

  /**
   * Récupère les approbations en attente d'un utilisateur
   */
  async getPendingApprovals(userId: string): Promise<WorkflowApproval[]> {
    const { data, error } = await (this.supabase as any)
      .from('template_workflow_approvals')
      .select('*, instance:template_workflow_instances(*, template:document_templates(*)), step:template_workflow_steps(*)')
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }
}

export const workflowValidationService = new WorkflowValidationService()
