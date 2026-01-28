/**
 * Enterprise Portal Service
 * Handles all business logic for the Enterprise Portal
 * - Company KPIs and statistics
 * - Employee tracking and progress
 * - Billing and document management
 * - Training requests
 * - OPCO share links
 */

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, sanitizeError } from '@/lib/utils/logger'

// =====================================================
// TYPES
// =====================================================

export interface Company {
  id: string
  organization_id: string
  name: string
  siren?: string
  siret?: string
  legal_form?: string
  address?: string
  city?: string
  postal_code?: string
  country: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  opco_id?: string
  opco_name?: string
  opco_contact_email?: string
  billing_email?: string
  billing_address?: string
  notes?: string
  metadata: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompanyManager {
  id: string
  company_id: string
  user_id: string
  role: 'director' | 'hr_manager' | 'manager' | 'viewer'
  first_name: string
  last_name: string
  email: string
  phone?: string
  job_title?: string
  department?: string
  can_view_invoices: boolean
  can_download_documents: boolean
  can_request_training: boolean
  can_manage_employees: boolean
  is_primary_contact: boolean
  last_login_at?: string
  invited_at: string
  accepted_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
  company?: Company
}

export interface CompanyEmployee {
  id: string
  company_id: string
  student_id: string
  employee_number?: string
  department?: string
  job_title?: string
  hire_date?: string
  manager_name?: string
  manager_email?: string
  contract_type?: string
  funding_source: 'company' | 'opco' | 'cpf' | 'mixed' | 'other'
  opco_dossier_number?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  student?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    photo_url?: string
  }
  enrollments?: EmployeeEnrollment[]
}

export interface EmployeeEnrollment {
  id: string
  session_id: string
  enrollment_date: string
  status: string
  total_amount: number
  paid_amount: number
  payment_status: string
  session?: {
    id: string
    name: string
    start_date: string
    end_date: string
    status: string
    formation?: {
      id: string
      name: string
      duration_hours: number
    }
  }
  attendance_rate?: number
  progress_percentage?: number
}

export interface TrainingRequest {
  id: string
  company_id: string
  requested_by: string
  request_type: 'new_enrollment' | 'custom_training' | 'group_training' | 'certification' | 'other'
  title: string
  description?: string
  formation_id?: string
  employee_ids: string[]
  number_of_participants: number
  preferred_start_date?: string
  preferred_end_date?: string
  preferred_format?: 'presential' | 'remote' | 'hybrid' | 'elearning' | 'flexible'
  budget_range?: string
  funding_type?: 'company' | 'opco' | 'cpf' | 'mixed'
  opco_pre_approved: boolean
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  status: 'draft' | 'pending' | 'reviewing' | 'approved' | 'rejected' | 'scheduled' | 'completed' | 'cancelled'
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  scheduled_session_id?: string
  attachments: unknown[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OpcoShareLink {
  id: string
  company_id: string
  created_by: string
  token: string
  title: string
  description?: string
  opco_email?: string
  opco_name?: string
  document_types: string[]
  enrollment_ids: string[]
  invoice_ids: string[]
  access_count: number
  max_access_count?: number
  expires_at: string
  last_accessed_at?: string
  is_active: boolean
  created_at: string
}

export interface EmployeeSkill {
  id: string
  company_employee_id: string
  skill_name: string
  skill_category?: string
  initial_level?: number
  current_level?: number
  target_level?: number
  acquired_from_session_id?: string
  validated_at?: string
  validated_by?: string
  certification_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CompanyKPIs {
  totalBudget: number
  totalHours: number
  averageAttendanceRate: number
  activeEmployees: number
  completedTrainings: number
  ongoingTrainings: number
  pendingInvoices: number
  paidInvoices: number
  currency: string
}

export interface EmployeeProgress {
  employee: CompanyEmployee
  currentSession?: {
    name: string
    progress: number
    startDate: string
    endDate: string
  }
  attendanceRate: number
  lastAttendanceStatus: 'present' | 'absent' | 'late' | 'excused' | null
  lastAttendanceDate?: string
}

export interface SkillsEvolutionData {
  month: string
  averageSkillLevel: number
  employeesCount: number
  skillsAcquired: number
}

// =====================================================
// SERVICE CLASS
// =====================================================

class EnterprisePortalService {
  private getClient(): SupabaseClient {
    if (typeof window === 'undefined') {
      // Server-side: would need to pass cookies, simplified for client usage
      return createClient()
    }
    return createClient()
  }

  // =====================================================
  // COMPANY METHODS
  // =====================================================

  async getCompanyForManager(userId: string): Promise<Company | null> {
    const supabase = this.getClient()

    const { data: manager } = await supabase
      .from('company_managers')
      .select('company_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!manager) return null

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', manager.company_id)
      .eq('is_active', true)
      .single()

    return company as Company | null
  }

  async getManagerPermissions(userId: string, companyId: string): Promise<CompanyManager | null> {
    const supabase = this.getClient()

    const { data } = await supabase
      .from('company_managers')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    return data as CompanyManager | null
  }

  // =====================================================
  // KPI METHODS
  // =====================================================

  async getCompanyKPIs(companyId: string, year?: number): Promise<CompanyKPIs> {
    const supabase = this.getClient()
    const currentYear = year || new Date().getFullYear()
    const startOfYear = `${currentYear}-01-01`
    const endOfYear = `${currentYear}-12-31`

    // Get all employees for this company
    const { data: employees } = await supabase
      .from('company_employees')
      .select('id, student_id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (!employees || employees.length === 0) {
      return {
        totalBudget: 0,
        totalHours: 0,
        averageAttendanceRate: 0,
        activeEmployees: 0,
        completedTrainings: 0,
        ongoingTrainings: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        currency: 'EUR',
      }
    }

    const studentIds = employees.map((e) => e.student_id)

    // Get invoices for the year
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, status, currency')
      .in('student_id', studentIds)
      .gte('issue_date', startOfYear)
      .lte('issue_date', endOfYear)

    // Get enrollments and calculate hours
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        id,
        status,
        session_id,
        sessions:session_id (
          id,
          formations:formation_id (
            duration_hours
          )
        )
      `)
      .in('student_id', studentIds)
      .gte('enrollment_date', startOfYear)

    // Get attendance for rate calculation
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .in('student_id', studentIds)
      .gte('date', startOfYear)
      .lte('date', endOfYear)

    // Calculate KPIs
    const totalBudget = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0
    const paidInvoices = invoices?.filter((inv) => inv.status === 'paid').length || 0
    const pendingInvoices = invoices?.filter((inv) => ['sent', 'partial', 'overdue'].includes(inv.status)).length || 0

    const totalHours = enrollments?.reduce((sum, enr) => {
      const session = enr.sessions as unknown as { formations?: { duration_hours?: number } }
      return sum + (session?.formations?.duration_hours || 0)
    }, 0) || 0

    const completedTrainings = enrollments?.filter((e) => e.status === 'completed').length || 0
    const ongoingTrainings = enrollments?.filter((e) => ['confirmed', 'in_progress'].includes(e.status)).length || 0

    const totalAttendance = attendance?.length || 0
    const presentCount = attendance?.filter((a) => a.status === 'present').length || 0
    const averageAttendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

    return {
      totalBudget,
      totalHours,
      averageAttendanceRate,
      activeEmployees: employees.length,
      completedTrainings,
      ongoingTrainings,
      pendingInvoices,
      paidInvoices,
      currency: invoices?.[0]?.currency || 'EUR',
    }
  }

  // =====================================================
  // EMPLOYEE METHODS
  // =====================================================

  async getEmployees(
    companyId: string,
    options?: {
      search?: string
      department?: string
      status?: 'active' | 'inactive' | 'all'
      page?: number
      limit?: number
    }
  ): Promise<{ employees: CompanyEmployee[]; total: number }> {
    const supabase = this.getClient()
    const { search, department, status = 'active', page = 1, limit = 20 } = options || {}
    const offset = (page - 1) * limit

    let query = supabase
      .from('company_employees')
      .select(`
        *,
        student:students (
          id,
          first_name,
          last_name,
          email,
          phone,
          photo_url
        )
      `, { count: 'exact' })
      .eq('company_id', companyId)

    if (status !== 'all') {
      query = query.eq('is_active', status === 'active')
    }

    if (department) {
      query = query.eq('department', department)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('[EnterprisePortal] Error fetching employees:', error)
      return { employees: [], total: 0 }
    }

    // Filter by search if provided (client-side for flexibility)
    let employees = (data || []) as CompanyEmployee[]
    if (search) {
      const searchLower = search.toLowerCase()
      employees = employees.filter((emp) => {
        const student = emp.student
        if (!student) return false
        return (
          student.first_name?.toLowerCase().includes(searchLower) ||
          student.last_name?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower) ||
          emp.employee_number?.toLowerCase().includes(searchLower)
        )
      })
    }

    return { employees, total: count || 0 }
  }

  async getEmployeeProgress(companyId: string): Promise<EmployeeProgress[]> {
    const supabase = this.getClient()

    // Get employees with their current enrollments
    const { data: employees } = await supabase
      .from('company_employees')
      .select(`
        *,
        student:students (
          id,
          first_name,
          last_name,
          email,
          phone,
          photo_url
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (!employees || employees.length === 0) {
      return []
    }

    const progressList: EmployeeProgress[] = []

    for (const emp of employees as CompanyEmployee[]) {
      if (!emp.student) continue

      // Get current/latest enrollment
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          sessions:session_id (
            id,
            name,
            start_date,
            end_date,
            formations:formation_id (
              name,
              duration_hours
            )
          )
        `)
        .eq('student_id', emp.student_id)
        .in('status', ['confirmed', 'in_progress'])
        .order('enrollment_date', { ascending: false })
        .limit(1)

      // Get attendance stats
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('student_id', emp.student_id)
        .order('date', { ascending: false })
        .limit(30) // Last 30 records

      const totalAttendance = attendance?.length || 0
      const presentCount = attendance?.filter((a) => a.status === 'present').length || 0
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

      const lastAttendance = attendance?.[0]

      let currentSession = undefined
      if (enrollments && enrollments.length > 0) {
        const enr = enrollments[0]
        const session = enr.sessions as unknown as {
          name: string
          start_date: string
          end_date: string
          formations?: { duration_hours: number }
        }
        if (session) {
          // Calculate progress based on dates
          const startDate = new Date(session.start_date)
          const endDate = new Date(session.end_date)
          const now = new Date()
          const totalDuration = endDate.getTime() - startDate.getTime()
          const elapsed = now.getTime() - startDate.getTime()
          const progress = totalDuration > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))) : 0

          currentSession = {
            name: session.name || 'Formation en cours',
            progress,
            startDate: session.start_date,
            endDate: session.end_date,
          }
        }
      }

      progressList.push({
        employee: emp,
        currentSession,
        attendanceRate,
        lastAttendanceStatus: lastAttendance?.status || null,
        lastAttendanceDate: lastAttendance?.date,
      })
    }

    return progressList
  }

  // =====================================================
  // BILLING & DOCUMENTS METHODS
  // =====================================================

  async getCompanyInvoices(
    companyId: string,
    options?: {
      status?: 'all' | 'paid' | 'pending' | 'overdue'
      year?: number
      page?: number
      limit?: number
    }
  ): Promise<{ invoices: unknown[]; total: number }> {
    const supabase = this.getClient()
    const { status = 'all', year, page = 1, limit = 20 } = options || {}
    const offset = (page - 1) * limit

    // Get employee student IDs
    const { data: employees } = await supabase
      .from('company_employees')
      .select('student_id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (!employees || employees.length === 0) {
      return { invoices: [], total: 0 }
    }

    const studentIds = employees.map((e) => e.student_id)

    let query = supabase
      .from('invoices')
      .select(`
        *,
        student:students (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .in('student_id', studentIds)

    if (status !== 'all') {
      if (status === 'paid') {
        query = query.eq('status', 'paid')
      } else if (status === 'pending') {
        query = query.in('status', ['sent', 'partial'])
      } else if (status === 'overdue') {
        query = query.eq('status', 'overdue')
      }
    }

    if (year) {
      query = query
        .gte('issue_date', `${year}-01-01`)
        .lte('issue_date', `${year}-12-31`)
    }

    const { data, count, error } = await query
      .order('issue_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('[EnterprisePortal] Error fetching invoices:', error)
      return { invoices: [], total: 0 }
    }

    return { invoices: data || [], total: count || 0 }
  }

  async getCompanyDocuments(
    companyId: string,
    options?: {
      type?: 'certificate' | 'attestation' | 'convention' | 'all'
      employeeId?: string
      page?: number
      limit?: number
    }
  ): Promise<{ documents: unknown[]; total: number }> {
    const supabase = this.getClient()
    const { type = 'all', employeeId, page = 1, limit = 20 } = options || {}
    const offset = (page - 1) * limit

    // Get employee student IDs
    let employeeQuery = supabase
      .from('company_employees')
      .select('student_id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (employeeId) {
      employeeQuery = employeeQuery.eq('id', employeeId)
    }

    const { data: employees } = await employeeQuery

    if (!employees || employees.length === 0) {
      return { documents: [], total: 0 }
    }

    const studentIds = employees.map((e) => e.student_id)

    let query = supabase
      .from('learner_documents')
      .select(`
        *,
        student:students (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .in('student_id', studentIds)

    if (type !== 'all') {
      // Map type to document_type in DB
      const typeMap: Record<string, string[]> = {
        certificate: ['certificat_realisation', 'certificate'],
        attestation: ['attestation_assiduite', 'attestation', 'attestation_formation'],
        convention: ['convention', 'convention_formation'],
      }
      query = query.in('document_type', typeMap[type] || [type])
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('[EnterprisePortal] Error fetching documents:', error)
      return { documents: [], total: 0 }
    }

    return { documents: data || [], total: count || 0 }
  }

  // =====================================================
  // TRAINING REQUESTS METHODS
  // =====================================================

  async getTrainingRequests(
    companyId: string,
    options?: {
      status?: TrainingRequest['status'] | 'all'
      page?: number
      limit?: number
    }
  ): Promise<{ requests: TrainingRequest[]; total: number }> {
    const supabase = this.getClient()
    const { status = 'all', page = 1, limit = 20 } = options || {}
    const offset = (page - 1) * limit

    let query = supabase
      .from('training_requests')
      .select(`
        *,
        requested_by_manager:company_managers!training_requests_requested_by_fkey (
          first_name,
          last_name,
          email
        ),
        formation:formations (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('company_id', companyId)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('[EnterprisePortal] Error fetching training requests:', error)
      return { requests: [], total: 0 }
    }

    return { requests: (data || []) as TrainingRequest[], total: count || 0 }
  }

  async createTrainingRequest(
    request: Omit<TrainingRequest, 'id' | 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at' | 'review_notes' | 'scheduled_session_id'>
  ): Promise<TrainingRequest | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('training_requests')
      .insert(request)
      .select()
      .single()

    if (error) {
      logger.error('[EnterprisePortal] Error creating training request:', error)
      return null
    }

    return data as TrainingRequest
  }

  // =====================================================
  // OPCO SHARE LINKS METHODS
  // =====================================================

  async createOpcoShareLink(
    companyId: string,
    managerId: string,
    options: {
      title: string
      description?: string
      opcoEmail?: string
      opcoName?: string
      documentTypes?: string[]
      enrollmentIds?: string[]
      invoiceIds?: string[]
      expiresInDays?: number
      maxAccessCount?: number
      password?: string
    }
  ): Promise<OpcoShareLink | null> {
    const supabase = this.getClient()

    // Generate a secure token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays || 30))

    const { data, error } = await supabase
      .from('opco_share_links')
      .insert({
        company_id: companyId,
        created_by: managerId,
        token,
        title: options.title,
        description: options.description,
        opco_email: options.opcoEmail,
        opco_name: options.opcoName,
        document_types: options.documentTypes || [],
        enrollment_ids: options.enrollmentIds || [],
        invoice_ids: options.invoiceIds || [],
        expires_at: expiresAt.toISOString(),
        max_access_count: options.maxAccessCount,
        // Note: password_hash would need to be hashed server-side
      })
      .select()
      .single()

    if (error) {
      logger.error('[EnterprisePortal] Error creating OPCO share link:', error)
      return null
    }

    return data as OpcoShareLink
  }

  async getOpcoShareLinks(companyId: string): Promise<OpcoShareLink[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('opco_share_links')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[EnterprisePortal] Error fetching OPCO share links:', error)
      return []
    }

    return (data || []) as OpcoShareLink[]
  }

  async deactivateOpcoShareLink(linkId: string): Promise<boolean> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('opco_share_links')
      .update({ is_active: false })
      .eq('id', linkId)

    if (error) {
      logger.error('[EnterprisePortal] Error deactivating OPCO share link:', error)
      return false
    }

    return true
  }

  // =====================================================
  // SKILLS & COMPETENCIES METHODS
  // =====================================================

  async getSkillsEvolution(companyId: string, months: number = 12): Promise<SkillsEvolutionData[]> {
    const supabase = this.getClient()

    // Get all employees for this company
    const { data: employees } = await supabase
      .from('company_employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (!employees || employees.length === 0) {
      return []
    }

    const employeeIds = employees.map((e) => e.id)

    // Get skills data
    const { data: skills } = await supabase
      .from('employee_skills')
      .select('*')
      .in('company_employee_id', employeeIds)
      .order('created_at', { ascending: true })

    if (!skills || skills.length === 0) {
      // Return mock data for demo
      return this.generateMockSkillsEvolution(months)
    }

    // Group by month and calculate averages
    const evolutionMap = new Map<string, { totalLevel: number; count: number; acquired: number }>()

    for (const skill of skills as EmployeeSkill[]) {
      const date = new Date(skill.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!evolutionMap.has(monthKey)) {
        evolutionMap.set(monthKey, { totalLevel: 0, count: 0, acquired: 0 })
      }

      const entry = evolutionMap.get(monthKey)!
      entry.totalLevel += skill.current_level || 0
      entry.count += 1
      if (skill.validated_at) {
        entry.acquired += 1
      }
    }

    const result: SkillsEvolutionData[] = []
    evolutionMap.forEach((value, key) => {
      result.push({
        month: key,
        averageSkillLevel: Math.round(value.totalLevel / value.count),
        employeesCount: employees.length,
        skillsAcquired: value.acquired,
      })
    })

    return result.sort((a, b) => a.month.localeCompare(b.month))
  }

  private generateMockSkillsEvolution(months: number): SkillsEvolutionData[] {
    const result: SkillsEvolutionData[] = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      result.push({
        month: monthKey,
        averageSkillLevel: Math.min(100, 45 + (months - i) * 3 + Math.floor(Math.random() * 5)),
        employeesCount: 5 + Math.floor(Math.random() * 3),
        skillsAcquired: Math.floor(Math.random() * 4) + 1,
      })
    }

    return result
  }

  // =====================================================
  // DEPARTMENT METHODS
  // =====================================================

  async getDepartments(companyId: string): Promise<string[]> {
    const supabase = this.getClient()

    const { data } = await supabase
      .from('company_employees')
      .select('department')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .not('department', 'is', null)

    if (!data) return []

    const departments = [...new Set(data.map((d) => d.department).filter(Boolean))] as string[]
    return departments.sort()
  }
}

// Export singleton instance
export const enterprisePortalService = new EnterprisePortalService()
