'use client'

import { createClient } from '@/lib/supabase/client'
import { OrganizationSetupService } from './organization-setup.service'

export const organizationSetupService = new OrganizationSetupService(createClient())
