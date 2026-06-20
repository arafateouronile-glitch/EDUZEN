'use client'

import { createClient } from '@/lib/supabase/client'
import { EnterprisePortalService } from './enterprise-portal.service'

export * from './enterprise-portal.service'
export const enterprisePortalService = new EnterprisePortalService()
