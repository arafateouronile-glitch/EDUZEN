'use client'

import { ComplianceService } from './compliance.service'
import { createClient } from '@/lib/supabase/client'

// Instance par défaut pour usage côté client
export const complianceService = new ComplianceService(createClient())
