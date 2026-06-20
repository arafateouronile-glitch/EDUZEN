'use client'

import { createClient } from '@/lib/supabase/client'
import { SSOService } from './sso.service'

export * from './sso.service'
export const ssoService = new SSOService()
