'use client'

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  is_system: boolean
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  code: string
  description: string | null
  category: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  organization_id: string
  assigned_by: string | null
  assigned_at: string
  expires_at: string | null
  role?: Role
}

export interface UserPermission {
  id: string
  user_id: string
  permission_id: string
  organization_id: string
  granted: boolean
  granted_by: string | null
  granted_at: string
  permission?: Permission
}

export interface Teacher {
  id: string
  user_id: string
  organization_id: string
  employee_number: string | null
  hire_date: string | null
  specialization: string | null
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    full_name: string
    avatar_url: string | null
  }
}

export interface CreateUserInput {
  email: string
  full_name: string
  phone?: string
  role?: string
  organization_id: string
  password?: string
  send_invitation?: boolean
}

export interface UpdateUserInput {
  full_name?: string
  phone?: string
  role?: string
  is_active?: boolean
}

export interface AssignRoleInput {
  user_id: string
  role_id: string
  organization_id: string
  expires_at?: Date
}

export interface AssignPermissionInput {
  user_id: string
  permission_id: string
  organization_id: string
  granted: boolean
}

export class UserManagementService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  // ==================== ROLES ====================

  /**
   * Récupère tous les rôles disponibles
   */
  async getRoles(organizationId?: string): Promise<Role[]> {
    let query = this.supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true })

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as Role[]
  }

  /**
   * Crée un nouveau rôle
   */
  async createRole(
    name: string,
    code: string,
    description: string | null,
    organizationId: string
  ): Promise<Role> {
    const { data, error } = await this.supabase
      .from('roles')
      .insert({
        name,
        code,
        description,
        organization_id: organizationId,
        is_system: false,
      })
      .select()
      .single()

    if (error) throw error
    return data as Role
  }

  /**
   * Met à jour un rôle
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const { data, error } = await this.supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data as Role
  }

  /**
   * Supprime un rôle
   */
  async deleteRole(roleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (error) throw error
  }

  // ==================== PERMISSIONS ====================

  /**
   * Récupère toutes les permissions disponibles
   */
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Permission[]
  }

  /**
   * Récupère les permissions par catégorie
   */
  async getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
    const permissions = await this.getPermissions()
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
  }

  /**
   * Récupère les permissions d'un rôle
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select('permission_id, permissions(*)')
      .eq('role_id', roleId)

    if (error) throw error
    return (data || []).map((item: { permissions: Permission }) => item.permissions) as Permission[]
  }

  /**
   * Assigner des permissions à un rôle
   */
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    // Supprimer les permissions existantes
    await this.supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Ajouter les nouvelles permissions
    if (permissionIds.length > 0) {
      const { error } = await this.supabase
        .from('role_permissions')
        .insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          }))
        )

      if (error) throw error
    }
  }

  // ==================== USERS ====================

  /**
   * Récupère tous les utilisateurs d'une organisation
   */
  async getUsers(organizationId: string): Promise<Array<{
    id: string
    email: string
    full_name: string
    role: string
    organization_id: string
    is_active: boolean
    created_at: string
    updated_at: string
  }>> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true })

    if (error) throw error
    return (data || [])
  }

  /**
   * Crée un nouvel utilisateur
   */
  async createUser(input: CreateUserInput): Promise<{
    id: string
    email: string
    full_name: string
    role: string
    organization_id: string
  }> {
    // Créer l'utilisateur dans Auth (via API route)
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la création de l\'utilisateur')
    }

    return await response.json()
  }

  /**
   * Met à jour un utilisateur
   */
  async updateUser(userId: string, updates: UpdateUserInput): Promise<{
    id: string
    email: string
    full_name: string
    role: string
    is_active: boolean
  }> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Désactive un utilisateur
   */
  async deactivateUser(userId: string): Promise<void> {
    await this.updateUser(userId, { is_active: false })
  }

  /**
   * Active un utilisateur
   */
  async activateUser(userId: string): Promise<void> {
    await this.updateUser(userId, { is_active: true })
  }

  // ==================== USER ROLES ====================

  /**
   * Récupère les rôles d'un utilisateur
   */
  async getUserRoles(userId: string, organizationId: string): Promise<UserRole[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('*, role:roles(*)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
    return (data || []) as UserRole[]
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRole(input: AssignRoleInput): Promise<UserRole> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .insert({
        user_id: input.user_id,
        role_id: input.role_id,
        organization_id: input.organization_id,
        expires_at: input.expires_at?.toISOString() || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as UserRole
  }

  /**
   * Retirer un rôle d'un utilisateur
   */
  async removeRole(userRoleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_roles')
      .delete()
      .eq('id', userRoleId)

    if (error) throw error
  }

  // ==================== USER PERMISSIONS ====================

  /**
   * Récupère les permissions personnalisées d'un utilisateur
   */
  async getUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<UserPermission[]> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .select('*, permission:permissions(*)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
    return (data || []) as UserPermission[]
  }

  /**
   * Assigner une permission personnalisée à un utilisateur
   */
  async assignPermission(input: AssignPermissionInput): Promise<UserPermission> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .upsert({
        user_id: input.user_id,
        permission_id: input.permission_id,
        organization_id: input.organization_id,
        granted: input.granted,
      }, {
        onConflict: 'user_id,permission_id,organization_id',
      })
      .select()
      .single()

    if (error) throw error
    return data as UserPermission
  }

  /**
   * Vérifie si un utilisateur a une permission
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    organizationId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission_code: permissionCode,
      p_organization_id: organizationId,
    })

    if (error) throw error
    return data as boolean
  }

  /**
   * Récupère toutes les permissions d'un utilisateur (via rôles et personnalisées)
   */
  async getAllUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<Permission[]> {
    const { data, error } = await this.supabase.rpc('get_user_permissions', {
      p_user_id: userId,
      p_organization_id: organizationId,
    })

    if (error) throw error
    return (data || []) as Permission[]
  }

  // ==================== TEACHERS ====================

  /**
   * Récupère tous les enseignants d'une organisation
   */
  async getTeachers(organizationId: string): Promise<Teacher[]> {
    // Récupérer les teachers
    const { data: teachers, error: teachersError } = await this.supabase
      .from('teachers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (teachersError) throw teachersError
    if (!teachers || teachers.length === 0) return []

    // Récupérer les user_ids
    const userIds = teachers.map((t: { user_id: string }) => t.user_id)

    // Récupérer les users correspondants
    const { data: users, error: usersError } = await this.supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds)

    if (usersError) throw usersError

    // Mapper les données pour correspondre à l'interface Teacher
    const usersMap = new Map((users || []).map((u: { id: string; email: string; full_name: string; avatar_url: string | null }) => [u.id, u]))
    
    return (teachers || []).map((teacher: { user_id: string; [key: string]: unknown }) => ({
      ...teacher,
      user: usersMap.get(teacher.user_id) || null,
    })) as Teacher[]
  }

  /**
   * Crée un enseignant (assigne le rôle formateur)
   */
  async createTeacher(
    userId: string,
    organizationId: string,
    data: {
      employee_number?: string
      hire_date?: string
      specialization?: string
      bio?: string
    }
  ): Promise<Teacher> {
    // Créer l'enregistrement teacher
    const { data: teacher, error: teacherError } = await this.supabase
      .from('teachers')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        ...data,
      })
      .select()
      .single()

    if (teacherError) throw teacherError

    // Assigner le rôle formateur
    const formateurRole = await this.supabase
      .from('roles')
      .select('id')
      .eq('code', 'formateur')
      .single()

    if (formateurRole.data) {
      await this.assignRole({
        user_id: userId,
        role_id: formateurRole.data.id,
        organization_id: organizationId,
      })
    }

    return teacher as Teacher
  }

  /**
   * Met à jour un enseignant
   */
  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<Teacher> {
    const { data, error } = await this.supabase
      .from('teachers')
      .update(updates)
      .eq('id', teacherId)
      .select()
      .single()

    if (error) throw error
    return data as Teacher
  }

  /**
   * Désactive un enseignant
   */
  async deactivateTeacher(teacherId: string): Promise<void> {
    await this.updateTeacher(teacherId, { is_active: false })
  }
}

export const userManagementService = new UserManagementService()


import { createClient } from '@/lib/supabase/client'

export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  is_system: boolean
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  code: string
  description: string | null
  category: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  organization_id: string
  assigned_by: string | null
  assigned_at: string
  expires_at: string | null
  role?: Role
}

export interface UserPermission {
  id: string
  user_id: string
  permission_id: string
  organization_id: string
  granted: boolean
  granted_by: string | null
  granted_at: string
  permission?: Permission
}

export interface Teacher {
  id: string
  user_id: string
  organization_id: string
  employee_number: string | null
  hire_date: string | null
  specialization: string | null
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    full_name: string
    avatar_url: string | null
  }
}

export interface CreateUserInput {
  email: string
  full_name: string
  phone?: string
  role?: string
  organization_id: string
  password?: string
  send_invitation?: boolean
}

export interface UpdateUserInput {
  full_name?: string
  phone?: string
  role?: string
  is_active?: boolean
}

export interface AssignRoleInput {
  user_id: string
  role_id: string
  organization_id: string
  expires_at?: Date
}

export interface AssignPermissionInput {
  user_id: string
  permission_id: string
  organization_id: string
  granted: boolean
}

export class UserManagementService {
  private supabase = createClient()

  // ==================== ROLES ====================

  /**
   * Récupère tous les rôles disponibles
   */
  async getRoles(organizationId?: string): Promise<Role[]> {
    let query = this.supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true })

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as Role[]
  }

  /**
   * Crée un nouveau rôle
   */
  async createRole(
    name: string,
    code: string,
    description: string | null,
    organizationId: string
  ): Promise<Role> {
    const { data, error } = await this.supabase
      .from('roles')
      .insert({
        name,
        code,
        description,
        organization_id: organizationId,
        is_system: false,
      })
      .select()
      .single()

    if (error) throw error
    return data as Role
  }

  /**
   * Met à jour un rôle
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const { data, error } = await this.supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data as Role
  }

  /**
   * Supprime un rôle
   */
  async deleteRole(roleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (error) throw error
  }

  // ==================== PERMISSIONS ====================

  /**
   * Récupère toutes les permissions disponibles
   */
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Permission[]
  }

  /**
   * Récupère les permissions par catégorie
   */
  async getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
    const permissions = await this.getPermissions()
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
  }

  /**
   * Récupère les permissions d'un rôle
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select('permission_id, permissions(*)')
      .eq('role_id', roleId)

    if (error) throw error
    return (data || []).map((item: { permissions: Permission }) => item.permissions) as Permission[]
  }

  /**
   * Assigner des permissions à un rôle
   */
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    // Supprimer les permissions existantes
    await this.supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Ajouter les nouvelles permissions
    if (permissionIds.length > 0) {
      const { error } = await this.supabase
        .from('role_permissions')
        .insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          }))
        )

      if (error) throw error
    }
  }

  // ==================== USERS ====================

  /**
   * Récupère tous les utilisateurs d'une organisation
   */
  async getUsers(organizationId: string): Promise<Array<{
    id: string
    email: string
    full_name: string
    role: string
    organization_id: string
    is_active: boolean
    created_at: string
    updated_at: string
  }>> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true })

    if (error) throw error
    return (data || [])
  }

  /**
   * Crée un nouvel utilisateur
   */
  async createUser(input: CreateUserInput): Promise<{
    id: string
    email: string
    full_name: string
    role: string
    organization_id: string
  }> {
    // Créer l'utilisateur dans Auth (via API route)
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la création de l\'utilisateur')
    }

    return await response.json()
  }

  /**
   * Met à jour un utilisateur
   */
  async updateUser(userId: string, updates: UpdateUserInput): Promise<{
    id: string
    email: string
    full_name: string
    role: string
    is_active: boolean
  }> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Désactive un utilisateur
   */
  async deactivateUser(userId: string): Promise<void> {
    await this.updateUser(userId, { is_active: false })
  }

  /**
   * Active un utilisateur
   */
  async activateUser(userId: string): Promise<void> {
    await this.updateUser(userId, { is_active: true })
  }

  // ==================== USER ROLES ====================

  /**
   * Récupère les rôles d'un utilisateur
   */
  async getUserRoles(userId: string, organizationId: string): Promise<UserRole[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('*, role:roles(*)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
    return (data || []) as UserRole[]
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRole(input: AssignRoleInput): Promise<UserRole> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .insert({
        user_id: input.user_id,
        role_id: input.role_id,
        organization_id: input.organization_id,
        expires_at: input.expires_at?.toISOString() || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as UserRole
  }

  /**
   * Retirer un rôle d'un utilisateur
   */
  async removeRole(userRoleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_roles')
      .delete()
      .eq('id', userRoleId)

    if (error) throw error
  }

  // ==================== USER PERMISSIONS ====================

  /**
   * Récupère les permissions personnalisées d'un utilisateur
   */
  async getUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<UserPermission[]> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .select('*, permission:permissions(*)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
    return (data || []) as UserPermission[]
  }

  /**
   * Assigner une permission personnalisée à un utilisateur
   */
  async assignPermission(input: AssignPermissionInput): Promise<UserPermission> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .upsert({
        user_id: input.user_id,
        permission_id: input.permission_id,
        organization_id: input.organization_id,
        granted: input.granted,
      }, {
        onConflict: 'user_id,permission_id,organization_id',
      })
      .select()
      .single()

    if (error) throw error
    return data as UserPermission
  }

  /**
   * Vérifie si un utilisateur a une permission
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    organizationId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission_code: permissionCode,
      p_organization_id: organizationId,
    })

    if (error) throw error
    return data as boolean
  }

  /**
   * Récupère toutes les permissions d'un utilisateur (via rôles et personnalisées)
   */
  async getAllUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<Permission[]> {
    const { data, error } = await this.supabase.rpc('get_user_permissions', {
      p_user_id: userId,
      p_organization_id: organizationId,
    })

    if (error) throw error
    return (data || []) as Permission[]
  }

  // ==================== TEACHERS ====================

  /**
   * Récupère tous les enseignants d'une organisation
   */
  async getTeachers(organizationId: string): Promise<Teacher[]> {
    // Récupérer les teachers
    const { data: teachers, error: teachersError } = await this.supabase
      .from('teachers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (teachersError) throw teachersError
    if (!teachers || teachers.length === 0) return []

    // Récupérer les user_ids
    const userIds = teachers.map((t: { user_id: string }) => t.user_id)

    // Récupérer les users correspondants
    const { data: users, error: usersError } = await this.supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds)

    if (usersError) throw usersError

    // Mapper les données pour correspondre à l'interface Teacher
    const usersMap = new Map((users || []).map((u: { id: string; email: string; full_name: string; avatar_url: string | null }) => [u.id, u]))
    
    return (teachers || []).map((teacher: { user_id: string; [key: string]: unknown }) => ({
      ...teacher,
      user: usersMap.get(teacher.user_id) || null,
    })) as Teacher[]
  }

  /**
   * Crée un enseignant (assigne le rôle formateur)
   */
  async createTeacher(
    userId: string,
    organizationId: string,
    data: {
      employee_number?: string
      hire_date?: string
      specialization?: string
      bio?: string
    }
  ): Promise<Teacher> {
    // Créer l'enregistrement teacher
    const { data: teacher, error: teacherError } = await this.supabase
      .from('teachers')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        ...data,
      })
      .select()
      .single()

    if (teacherError) throw teacherError

    // Assigner le rôle formateur
    const formateurRole = await this.supabase
      .from('roles')
      .select('id')
      .eq('code', 'formateur')
      .single()

    if (formateurRole.data) {
      await this.assignRole({
        user_id: userId,
        role_id: formateurRole.data.id,
        organization_id: organizationId,
      })
    }

    return teacher as Teacher
  }

  /**
   * Met à jour un enseignant
   */
  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<Teacher> {
    const { data, error } = await this.supabase
      .from('teachers')
      .update(updates)
      .eq('id', teacherId)
      .select()
      .single()

    if (error) throw error
    return data as Teacher
  }

  /**
   * Désactive un enseignant
   */
  async deactivateTeacher(teacherId: string): Promise<void> {
    await this.updateTeacher(teacherId, { is_active: false })
  }
}

export const userManagementService = new UserManagementService()


import { createClient } from '@/lib/supabase/client'

export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  is_system: boolean
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  code: string
  description: string | null
  category: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  organization_id: string
  assigned_by: string | null
  assigned_at: string
  expires_at: string | null
  role?: Role
}

export interface UserPermission {
  id: string
  user_id: string
  permission_id: string
  organization_id: string
  granted: boolean
  granted_by: string | null
  granted_at: string
  permission?: Permission
}

export interface Teacher {
  id: string
  user_id: string
  organization_id: string
  employee_number: string | null
  hire_date: string | null
  specialization: string | null
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    full_name: string
    avatar_url: string | null
  }
}

export interface CreateUserInput {
  email: string
  full_name: string
  phone?: string
  role?: string
  organization_id: string
  password?: string
  send_invitation?: boolean
}

export interface UpdateUserInput {
  full_name?: string
  phone?: string
  role?: string
  is_active?: boolean
}

export interface AssignRoleInput {
  user_id: string
  role_id: string
  organization_id: string
  expires_at?: Date
}

export interface AssignPermissionInput {
  user_id: string
  permission_id: string
  organization_id: string
  granted: boolean
}

export class UserManagementService {
  private supabase = createClient()

  // ==================== ROLES ====================

  /**
   * Récupère tous les rôles disponibles
   */
  async getRoles(organizationId?: string): Promise<Role[]> {
    let query = this.supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true })

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as Role[]
  }

  /**
   * Crée un nouveau rôle
   */
  async createRole(
    name: string,
    code: string,
    description: string | null,
    organizationId: string
  ): Promise<Role> {
    const { data, error } = await this.supabase
      .from('roles')
      .insert({
        name,
        code,
        description,
        organization_id: organizationId,
        is_system: false,
      })
      .select()
      .single()

    if (error) throw error
    return data as Role
  }

  /**
   * Met à jour un rôle
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const { data, error } = await this.supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data as Role
  }

  /**
   * Supprime un rôle
   */
  async deleteRole(roleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (error) throw error
  }

  // ==================== PERMISSIONS ====================

  /**
   * Récupère toutes les permissions disponibles
   */
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Permission[]
  }

  /**
   * Récupère les permissions par catégorie
   */
  async getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
    const permissions = await this.getPermissions()
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
  }

  /**
   * Récupère les permissions d'un rôle
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select('permission_id, permissions(*)')
      .eq('role_id', roleId)

    if (error) throw error
    return (data || []).map((item: { permissions: Permission }) => item.permissions) as Permission[]
  }

  /**
   * Assigner des permissions à un rôle
   */
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    // Supprimer les permissions existantes
    await this.supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Ajouter les nouvelles permissions
    if (permissionIds.length > 0) {
      const { error } = await this.supabase
        .from('role_permissions')
        .insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          }))
        )

      if (error) throw error
    }
  }

  // ==================== USERS ====================

  /**
   * Récupère tous les utilisateurs d'une organisation
   */
  async getUsers(organizationId: string): Promise<Array<{
    id: string
    email: string
    full_name: string
    role: string
    organization_id: string
    is_active: boolean
    created_at: string
    updated_at: string
  }>> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true })

    if (error) throw error
    return (data || [])
  }

  /**
   * Crée un nouvel utilisateur
   */
  async createUser(input: CreateUserInput): Promise<{
    id: string
    email: string
    full_name: string
    role: string
    organization_id: string
  }> {
    // Créer l'utilisateur dans Auth (via API route)
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la création de l\'utilisateur')
    }

    return await response.json()
  }

  /**
   * Met à jour un utilisateur
   */
  async updateUser(userId: string, updates: UpdateUserInput): Promise<{
    id: string
    email: string
    full_name: string
    role: string
    is_active: boolean
  }> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Désactive un utilisateur
   */
  async deactivateUser(userId: string): Promise<void> {
    await this.updateUser(userId, { is_active: false })
  }

  /**
   * Active un utilisateur
   */
  async activateUser(userId: string): Promise<void> {
    await this.updateUser(userId, { is_active: true })
  }

  // ==================== USER ROLES ====================

  /**
   * Récupère les rôles d'un utilisateur
   */
  async getUserRoles(userId: string, organizationId: string): Promise<UserRole[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('*, role:roles(*)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
    return (data || []) as UserRole[]
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRole(input: AssignRoleInput): Promise<UserRole> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .insert({
        user_id: input.user_id,
        role_id: input.role_id,
        organization_id: input.organization_id,
        expires_at: input.expires_at?.toISOString() || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as UserRole
  }

  /**
   * Retirer un rôle d'un utilisateur
   */
  async removeRole(userRoleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_roles')
      .delete()
      .eq('id', userRoleId)

    if (error) throw error
  }

  // ==================== USER PERMISSIONS ====================

  /**
   * Récupère les permissions personnalisées d'un utilisateur
   */
  async getUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<UserPermission[]> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .select('*, permission:permissions(*)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
    return (data || []) as UserPermission[]
  }

  /**
   * Assigner une permission personnalisée à un utilisateur
   */
  async assignPermission(input: AssignPermissionInput): Promise<UserPermission> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .upsert({
        user_id: input.user_id,
        permission_id: input.permission_id,
        organization_id: input.organization_id,
        granted: input.granted,
      }, {
        onConflict: 'user_id,permission_id,organization_id',
      })
      .select()
      .single()

    if (error) throw error
    return data as UserPermission
  }

  /**
   * Vérifie si un utilisateur a une permission
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    organizationId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission_code: permissionCode,
      p_organization_id: organizationId,
    })

    if (error) throw error
    return data as boolean
  }

  /**
   * Récupère toutes les permissions d'un utilisateur (via rôles et personnalisées)
   */
  async getAllUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<Permission[]> {
    const { data, error } = await this.supabase.rpc('get_user_permissions', {
      p_user_id: userId,
      p_organization_id: organizationId,
    })

    if (error) throw error
    return (data || []) as Permission[]
  }

  // ==================== TEACHERS ====================

  /**
   * Récupère tous les enseignants d'une organisation
   */
  async getTeachers(organizationId: string): Promise<Teacher[]> {
    // Récupérer les teachers
    const { data: teachers, error: teachersError } = await this.supabase
      .from('teachers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (teachersError) throw teachersError
    if (!teachers || teachers.length === 0) return []

    // Récupérer les user_ids
    const userIds = teachers.map((t: { user_id: string }) => t.user_id)

    // Récupérer les users correspondants
    const { data: users, error: usersError } = await this.supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds)

    if (usersError) throw usersError

    // Mapper les données pour correspondre à l'interface Teacher
    const usersMap = new Map((users || []).map((u: { id: string; email: string; full_name: string; avatar_url: string | null }) => [u.id, u]))
    
    return (teachers || []).map((teacher: { user_id: string; [key: string]: unknown }) => ({
      ...teacher,
      user: usersMap.get(teacher.user_id) || null,
    })) as Teacher[]
  }

  /**
   * Crée un enseignant (assigne le rôle formateur)
   */
  async createTeacher(
    userId: string,
    organizationId: string,
    data: {
      employee_number?: string
      hire_date?: string
      specialization?: string
      bio?: string
    }
  ): Promise<Teacher> {
    // Créer l'enregistrement teacher
    const { data: teacher, error: teacherError } = await this.supabase
      .from('teachers')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        ...data,
      })
      .select()
      .single()

    if (teacherError) throw teacherError

    // Assigner le rôle formateur
    const formateurRole = await this.supabase
      .from('roles')
      .select('id')
      .eq('code', 'formateur')
      .single()

    if (formateurRole.data) {
      await this.assignRole({
        user_id: userId,
        role_id: formateurRole.data.id,
        organization_id: organizationId,
      })
    }

    return teacher as Teacher
  }

  /**
   * Met à jour un enseignant
   */
  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<Teacher> {
    const { data, error } = await this.supabase
      .from('teachers')
      .update(updates)
      .eq('id', teacherId)
      .select()
      .single()

    if (error) throw error
    return data as Teacher
  }

  /**
   * Désactive un enseignant
   */
  async deactivateTeacher(teacherId: string): Promise<void> {
    await this.updateTeacher(teacherId, { is_active: false })
  }
}

export const userManagementService = new UserManagementService()












