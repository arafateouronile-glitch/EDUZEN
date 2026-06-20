'use client'

import { createClient } from '@/lib/supabase/client'
import { SupportService } from './support.service'

export * from './support.service'
export const supportService = new SupportService(createClient())
