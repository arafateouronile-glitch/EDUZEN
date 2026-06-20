'use client'

import { createClient } from '@/lib/supabase/client'
import { UserManagementService } from './user-management.service'

export * from './user-management.service'
export const userManagementService = new UserManagementService(createClient())
