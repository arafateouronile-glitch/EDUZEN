'use client'

import { createClient } from '@/lib/supabase/client'
import { SiteService } from './site.service'

export * from './site.service'
export const siteService = new SiteService(createClient())
