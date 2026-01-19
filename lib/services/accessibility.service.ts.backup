/**
 * Service Accessibilité Handicap
 *
 * Gestion complète de l'accessibilité et du handicap pour les organismes de formation.
 * Conforme aux exigences Qualiopi (critère 8) et à la réglementation française.
 *
 * Fonctionnalités :
 * - Configuration organisation (référent handicap, partenaires)
 * - Gestion besoins spécifiques des stagiaires
 * - Aménagements pédagogiques et techniques
 * - Inventaire équipements adaptés
 * - Documents justificatifs (MDPH, RQTH, etc.)
 * - Rapports de conformité
 */

import { createClient } from '@/lib/supabase/client'

// =====================================================
// INTERFACES
// =====================================================

export interface AccessibilityConfiguration {
  id: string
  organization_id: string
  referent_user_id: string | null
  referent_training_date: string | null
  referent_training_certificate: string | null
  accessibility_policy: string | null
  physical_accessibility_statement: string | null
  digital_accessibility_statement: string | null
  partner_agefiph: boolean
  partner_cap_emploi: boolean
  partner_fiphfp: boolean
  partner_other: Array<{ name: string; contact: string }>
  created_at: string
  updated_at: string
}

export interface DisabilityType {
  id: string
  code: string
  name_fr: string
  name_en: string
  description: string | null
  icon: string | null
  color: string | null
  created_at: string
}

export interface StudentNeed {
  id: string
  organization_id: string
  student_id: string
  has_disability: boolean
  disability_type_ids: string[]
  disability_description: string | null
  has_mdph_recognition: boolean
  mdph_number: string | null
  mdph_expiry_date: string | null
  needs_physical_accommodations: boolean
  physical_accommodations_detail: string | null
  needs_pedagogical_accommodations: boolean
  pedagogical_accommodations_detail: string | null
  needs_exam_accommodations: boolean
  exam_accommodations_detail: string | null
  needs_technical_aids: boolean
  technical_aids_detail: string | null
  external_referent_name: string | null
  external_referent_contact: string | null
  consent_share_info: boolean
  declaration_date: string
  status: 'pending' | 'reviewed' | 'implemented'
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Accommodation {
  id: string
  organization_id: string
  student_id: string
  student_need_id: string | null
  accommodation_type: 'physical' | 'pedagogical' | 'exam' | 'technical' | 'schedule'
  category: string | null
  title: string
  description: string | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'inactive' | 'expired'
  assigned_to_user_id: string | null
  completion_rate: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  organization_id: string
  name: string
  category: 'mobility' | 'visual' | 'auditory' | 'ergonomic' | 'software' | 'other' | null
  description: string | null
  location: string | null
  site_id: string | null
  quantity_total: number
  quantity_available: number
  status: 'available' | 'in_use' | 'maintenance' | 'retired'
  purchase_date: string | null
  warranty_expiry_date: string | null
  maintenance_schedule: 'none' | 'monthly' | 'quarterly' | 'biannual' | 'annual' | null
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  responsible_user_id: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EquipmentAssignment {
  id: string
  organization_id: string
  equipment_id: string
  student_id: string
  accommodation_id: string | null
  assigned_date: string
  return_date: string | null
  actual_return_date: string | null
  status: 'assigned' | 'returned' | 'lost' | 'damaged'
  condition_on_assignment: 'excellent' | 'good' | 'fair' | 'poor' | null
  condition_on_return: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged' | 'lost' | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AccessibilityDocument {
  id: string
  organization_id: string
  student_id: string
  student_need_id: string | null
  document_type: 'mdph_certificate' | 'medical_certificate' | 'rqth' | 'disability_card' | 'other' | null
  title: string
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  issue_date: string | null
  expiry_date: string | null
  issuer: string | null
  reference_number: string | null
  is_confidential: boolean
  uploaded_by_user_id: string | null
  verified: boolean
  verified_by_user_id: string | null
  verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ComplianceReport {
  id: string
  organization_id: string
  report_type: 'annual' | 'audit' | 'qualiopi' | 'internal'
  title: string
  period_start: string
  period_end: string
  total_students: number
  students_with_disabilities: number
  accommodations_requested: number
  accommodations_implemented: number
  equipment_used: number
  referent_training_up_to_date: boolean
  physical_accessibility_compliant: boolean
  digital_accessibility_compliant: boolean
  partner_collaborations: number
  compliance_rate: number
  findings: Array<{ category: string; description: string; severity: string }>
  recommendations: Array<{ title: string; description: string; priority: string }>
  generated_by_user_id: string | null
  created_at: string
}

export interface AccessibilityStats {
  total_students_with_needs: number
  active_accommodations: number
  available_equipment: number
  compliance_rate: number
  students_by_disability_type: Array<{ type: string; count: number }>
  accommodations_by_type: Array<{ type: string; count: number }>
  pending_reviews: number
}

// Filtres
export interface StudentNeedFilters {
  status?: 'pending' | 'reviewed' | 'implemented'
  has_disability?: boolean
  search?: string
}

export interface AccommodationFilters {
  student_id?: string
  status?: 'active' | 'inactive' | 'expired'
  type?: 'physical' | 'pedagogical' | 'exam' | 'technical' | 'schedule'
  search?: string
}

export interface EquipmentFilters {
  status?: 'available' | 'in_use' | 'maintenance' | 'retired'
  category?: 'mobility' | 'visual' | 'auditory' | 'ergonomic' | 'software' | 'other'
  search?: string
}

// =====================================================
// SERVICE
// =====================================================

export class AccessibilityService {
  private supabase = createClient()

  // ===================================================
  // CONFIGURATION
  // ===================================================

  /**
   * Récupérer la configuration accessibilité de l'organisation
   */
  async getConfiguration(organizationId: string): Promise<AccessibilityConfiguration | null> {
    try {
      const { data, error } = await this.supabase
        .from('accessibility_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('Table accessibility_configurations does not exist yet:', error?.message)
          return null
        }
        throw error
      }

      return data
    } catch (err: unknown) {
      if ((err as any)?.status === 404 || (err as any)?.message?.toLowerCase().includes('not found')) {
        return null
      }
      throw err
    }
  }

  /**
   * Créer ou mettre à jour la configuration accessibilité
   */
  async updateConfiguration(
    organizationId: string,
    data: Partial<AccessibilityConfiguration>
  ): Promise<AccessibilityConfiguration> {
    // Vérifier si une config existe déjà
    const existing = await this.getConfiguration(organizationId)

    // Nettoyer les données pour la DB (supprimer id, timestamps)
    const cleanData = { ...data }
    delete (cleanData as any).id
    delete (cleanData as any).created_at
    delete (cleanData as any).updated_at
    delete (cleanData as any).organization_id

    // Fonction utilitaire pour valider un UUID
    const isValidUUID = (str: string | null | undefined): boolean => {
      if (!str || str === '') return false
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(str)
    }

    // Convertir les UUID invalides en null pour referent_user_id
    if (cleanData.referent_user_id !== null && cleanData.referent_user_id !== undefined) {
      if (!isValidUUID(cleanData.referent_user_id)) {
        cleanData.referent_user_id = null
      }
    } else if (cleanData.referent_user_id === '') {
      cleanData.referent_user_id = null
    }

    // Convertir les chaînes vides en null pour les champs de type DATE
    if (cleanData.referent_training_date === '' || cleanData.referent_training_date === null) {
      cleanData.referent_training_date = null
    }
    // Convertir les chaînes vides en null pour les autres champs optionnels
    if ((cleanData as any).referent_training_certificate === '') {
      (cleanData as any).referent_training_certificate = null
    }
    if ((cleanData as any).accessibility_policy === '') {
      (cleanData as any).accessibility_policy = null
    }
    if ((cleanData as any).physical_accessibility_statement === '') {
      (cleanData as any).physical_accessibility_statement = null
    }
    if ((cleanData as any).digital_accessibility_statement === '') {
      (cleanData as any).digital_accessibility_statement = null
    }

    if (existing) {
      // Mise à jour
      const { data: updated, error } = await this.supabase
        .from('accessibility_configurations')
        .update(cleanData)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('[AccessibilityService] Erreur lors de la mise à jour de la configuration:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          cleanData,
          organizationId,
        })
        throw error
      }
      return updated
    } else {
      // Création - assurer les valeurs par défaut
      const insertData = {
        organization_id: organizationId,
        partner_agefiph: false,
        partner_cap_emploi: false,
        partner_fiphfp: false,
        partner_other: [],
        ...cleanData,
      }

      const { data: created, error } = await this.supabase
        .from('accessibility_configurations')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('[AccessibilityService] Erreur lors de la création de la configuration:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          insertData,
        })
        throw error
      }
      return created
    }
  }

  /**
   * Définir le référent handicap
   */
  async setReferent(
    organizationId: string,
    userId: string,
    trainingDate?: string,
    certificate?: string
  ): Promise<void> {
    await this.updateConfiguration(organizationId, {
      referent_user_id: userId,
      referent_training_date: trainingDate || null,
      referent_training_certificate: certificate || null,
    })
  }

  // ===================================================
  // TYPES DE HANDICAP
  // ===================================================

  /**
   * Récupérer tous les types de handicap (référentiel)
   */
  async getDisabilityTypes(): Promise<DisabilityType[]> {
    try {
      const { data, error } = await this.supabase
        .from('accessibility_disability_types')
        .select('*')
        .order('name_fr', { ascending: true })

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('Table accessibility_disability_types does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        return []
      }
      throw err
    }
  }

  // ===================================================
  // BESOINS STAGIAIRES
  // ===================================================

  /**
   * Récupérer les besoins spécifiques des stagiaires
   */
  async getStudentNeeds(organizationId: string, filters?: StudentNeedFilters): Promise<StudentNeed[]> {
    try {
      let query = this.supabase
        .from('accessibility_student_needs')
        .select('*')
        .eq('organization_id', organizationId)

      // Filtres
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.has_disability !== undefined) {
        query = query.eq('has_disability', filters.has_disability)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('Table accessibility_student_needs does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        return []
      }
      throw err
    }
  }

  /**
   * Récupérer les besoins d'un stagiaire spécifique
   */
  async getStudentNeedByStudentId(studentId: string): Promise<StudentNeed | null> {
    try {
      const { data, error } = await this.supabase
        .from('accessibility_student_needs')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle()

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          return null
        }
        throw error
      }

      return data
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        return null
      }
      throw err
    }
  }

  /**
   * Créer une déclaration de besoins
   */
  async createStudentNeed(data: Partial<StudentNeed>): Promise<StudentNeed> {
    const { data: created, error } = await this.supabase
      .from('accessibility_student_needs')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  }

  /**
   * Mettre à jour une déclaration de besoins
   */
  async updateStudentNeed(needId: string, data: Partial<StudentNeed>): Promise<StudentNeed> {
    const { data: updated, error } = await this.supabase
      .from('accessibility_student_needs')
      .update(data)
      .eq('id', needId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  /**
   * Marquer une déclaration comme revue
   */
  async reviewStudentNeed(needId: string, reviewerId: string, notes?: string): Promise<StudentNeed> {
    return this.updateStudentNeed(needId, {
      status: 'reviewed',
      reviewed_by_user_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      notes: notes || null,
    })
  }

  // ===================================================
  // AMÉNAGEMENTS
  // ===================================================

  /**
   * Récupérer les aménagements
   */
  async getAccommodations(organizationId: string, filters?: AccommodationFilters): Promise<Accommodation[]> {
    try {
      let query = this.supabase
        .from('accessibility_accommodations')
        .select('*')
        .eq('organization_id', organizationId)

      // Filtres
      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.type) {
        query = query.eq('accommodation_type', filters.type)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('Table accessibility_accommodations does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        return []
      }
      throw err
    }
  }

  /**
   * Récupérer les aménagements d'un stagiaire
   */
  async getStudentAccommodations(studentId: string): Promise<Accommodation[]> {
    return this.getAccommodations('', { student_id: studentId })
  }

  /**
   * Créer un aménagement
   */
  async createAccommodation(data: Partial<Accommodation>): Promise<Accommodation> {
    const { data: created, error } = await this.supabase
      .from('accessibility_accommodations')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  }

  /**
   * Mettre à jour un aménagement
   */
  async updateAccommodation(accommodationId: string, data: Partial<Accommodation>): Promise<Accommodation> {
    const { data: updated, error } = await this.supabase
      .from('accessibility_accommodations')
      .update(data)
      .eq('id', accommodationId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  /**
   * Archiver un aménagement (passer en inactif)
   */
  async archiveAccommodation(accommodationId: string): Promise<void> {
    await this.updateAccommodation(accommodationId, { status: 'inactive' })
  }

  // ===================================================
  // ÉQUIPEMENTS
  // ===================================================

  /**
   * Récupérer les équipements
   */
  async getEquipment(organizationId: string, filters?: EquipmentFilters): Promise<Equipment[]> {
    try {
      let query = this.supabase
        .from('accessibility_equipment')
        .select('*')
        .eq('organization_id', organizationId)

      // Filtres
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('Table accessibility_equipment does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        return []
      }
      throw err
    }
  }

  /**
   * Créer un équipement
   */
  async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
    const { data: created, error } = await this.supabase
      .from('accessibility_equipment')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  }

  /**
   * Mettre à jour un équipement
   */
  async updateEquipment(equipmentId: string, data: Partial<Equipment>): Promise<Equipment> {
    const { data: updated, error } = await this.supabase
      .from('accessibility_equipment')
      .update(data)
      .eq('id', equipmentId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  /**
   * Attribuer un équipement à un stagiaire
   */
  async assignEquipment(
    equipmentId: string,
    studentId: string,
    assignmentData: Partial<EquipmentAssignment>
  ): Promise<EquipmentAssignment> {
    // Récupérer l'équipement
    const { data: equipment, error: eqError } = await this.supabase
      .from('accessibility_equipment')
      .select('*')
      .eq('id', equipmentId)
      .single()

    if (eqError) throw eqError

    // Vérifier disponibilité
    if (equipment.quantity_available <= 0) {
      throw new Error('Équipement non disponible')
    }

    // Créer l'attribution
    const { data: assignment, error: assignError } = await this.supabase
      .from('accessibility_equipment_assignments')
      .insert({
        equipment_id: equipmentId,
        student_id: studentId,
        organization_id: equipment.organization_id,
        ...assignmentData,
      })
      .select()
      .single()

    if (assignError) throw assignError

    // Décrémenter la quantité disponible
    await this.updateEquipment(equipmentId, {
      quantity_available: equipment.quantity_available - 1,
      status: equipment.quantity_available - 1 === 0 ? 'in_use' : equipment.status,
    })

    return assignment
  }

  /**
   * Retourner un équipement
   */
  async returnEquipment(assignmentId: string, condition: EquipmentAssignment['condition_on_return']): Promise<void> {
    // Récupérer l'attribution
    const { data: assignment, error: assignError } = await this.supabase
      .from('accessibility_equipment_assignments')
      .select('*, accessibility_equipment(*)')
      .eq('id', assignmentId)
      .single()

    if (assignError) throw assignError

    // Mettre à jour l'attribution
    await this.supabase
      .from('accessibility_equipment_assignments')
      .update({
        status: 'returned',
        actual_return_date: new Date().toISOString().split('T')[0],
        condition_on_return: condition,
      })
      .eq('id', assignmentId)

    // Incrémenter la quantité disponible (sauf si perdu ou endommagé)
    if (condition !== 'lost' && condition !== 'damaged') {
      const equipment = (assignment as any).accessibility_equipment
      await this.updateEquipment(assignment.equipment_id, {
        quantity_available: equipment.quantity_available + 1,
        status: 'available',
      })
    }
  }

  /**
   * Récupérer les attributions d'un équipement
   */
  async getEquipmentAssignments(equipmentId: string): Promise<EquipmentAssignment[]> {
    try {
      const { data, error } = await this.supabase
        .from('accessibility_equipment_assignments')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('assigned_date', { ascending: false })

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('Table accessibility_equipment_assignments does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        return []
      }
      throw err
    }
  }

  // ===================================================
  // DOCUMENTS
  // ===================================================

  /**
   * Récupérer les documents
   */
  async getDocuments(organizationId: string, studentId?: string): Promise<AccessibilityDocument[]> {
    try {
      let query = this.supabase
        .from('accessibility_documents')
        .select('*')
        .eq('organization_id', organizationId)

      if (studentId) {
        query = query.eq('student_id', studentId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.status === 404 ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('Table accessibility_documents does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        return []
      }
      throw err
    }
  }

  /**
   * Upload un document (métadonnées uniquement, le fichier doit être uploadé via Storage)
   */
  async uploadDocument(metadata: Partial<AccessibilityDocument>): Promise<AccessibilityDocument> {
    const { data, error } = await this.supabase
      .from('accessibility_documents')
      .insert(metadata)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprimer un document
   */
  async deleteDocument(documentId: string): Promise<void> {
    // TODO: Supprimer aussi le fichier du Storage
    const { error } = await this.supabase
      .from('accessibility_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  /**
   * Vérifier un document
   */
  async verifyDocument(documentId: string, verifierId: string): Promise<void> {
    await this.supabase
      .from('accessibility_documents')
      .update({
        verified: true,
        verified_by_user_id: verifierId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', documentId)
  }

  // ===================================================
  // STATISTIQUES ET RAPPORTS
  // ===================================================

  /**
   * Récupérer les statistiques accessibilité
   */
  async getStats(organizationId: string): Promise<AccessibilityStats> {
    const [needs, accommodations, equipment, complianceRate] = await Promise.all([
      this.getStudentNeeds(organizationId, { has_disability: true }),
      this.getAccommodations(organizationId, { status: 'active' }),
      this.getEquipment(organizationId, { status: 'available' }),
      this.calculateComplianceRate(organizationId),
    ])

    // Statistiques par type de handicap
    const disabilityTypeCounts = new Map<string, number>()
    needs.forEach((need) => {
      need.disability_type_ids.forEach((typeId) => {
        disabilityTypeCounts.set(typeId, (disabilityTypeCounts.get(typeId) || 0) + 1)
      })
    })

    // Statistiques par type d'aménagement
    const accommodationTypeCounts = new Map<string, number>()
    accommodations.forEach((acc) => {
      accommodationTypeCounts.set(acc.accommodation_type, (accommodationTypeCounts.get(acc.accommodation_type) || 0) + 1)
    })

    return {
      total_students_with_needs: needs.length,
      active_accommodations: accommodations.length,
      available_equipment: equipment.reduce((sum, eq) => sum + eq.quantity_available, 0),
      compliance_rate: complianceRate,
      students_by_disability_type: Array.from(disabilityTypeCounts.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      accommodations_by_type: Array.from(accommodationTypeCounts.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      pending_reviews: needs.filter((n) => n.status === 'pending').length,
    }
  }

  /**
   * Calculer le taux de conformité
   */
  async calculateComplianceRate(organizationId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('calculate_accessibility_compliance_rate', {
        org_id: organizationId,
      })

      if (error) {
        const is404Error =
          error.code === 'PGRST116' ||
          error.code === '42883' ||
          error.status === 404 ||
          error.message?.toLowerCase().includes('function') ||
          error.message?.toLowerCase().includes('does not exist')

        if (is404Error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Function calculate_accessibility_compliance_rate does not exist yet')
          }
          return 0
        }
        throw error
      }

      return data || 0
    } catch (err: unknown) {
      if ((err as any)?.status === 404 || (err as any)?.message?.toLowerCase().includes('not found')) {
        return 0
      }
      throw err
    }
  }

  /**
   * Générer un rapport de conformité
   */
  async generateComplianceReport(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const stats = await this.getStats(organizationId)
    const config = await this.getConfiguration(organizationId)

    const reportData: Partial<ComplianceReport> = {
      organization_id: organizationId,
      report_type: 'annual',
      title: `Rapport de conformité accessibilité ${new Date().getFullYear()}`,
      period_start: periodStart,
      period_end: periodEnd,
      total_students: 0, // TODO: Récupérer depuis students
      students_with_disabilities: stats.total_students_with_needs,
      accommodations_requested: stats.total_students_with_needs,
      accommodations_implemented: stats.active_accommodations,
      equipment_used: 0, // TODO: Calculer équipements utilisés
      referent_training_up_to_date: !!config?.referent_training_date,
      physical_accessibility_compliant: !!config?.physical_accessibility_statement,
      digital_accessibility_compliant: !!config?.digital_accessibility_statement,
      partner_collaborations:
        (config?.partner_agefiph ? 1 : 0) +
        (config?.partner_cap_emploi ? 1 : 0) +
        (config?.partner_fiphfp ? 1 : 0),
      compliance_rate: stats.compliance_rate,
      findings: [],
      recommendations: [],
      generated_by_user_id: generatedBy,
    }

    const { data, error } = await this.supabase
      .from('accessibility_compliance_reports')
      .insert(reportData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Export singleton
export const accessibilityService = new AccessibilityService()
