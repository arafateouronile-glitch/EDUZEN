'use client'

import { createClient } from '@/lib/supabase/client'
import { GDPRService } from './gdpr.service'

export * from './gdpr.service'
export const gdprService = new GDPRService(createClient())
