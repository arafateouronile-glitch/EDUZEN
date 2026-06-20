'use client'

import { createClient } from '@/lib/supabase/client'
import { QualiopiService } from './qualiopi.service'

export * from './qualiopi.service'
export const qualiopiService = new QualiopiService(createClient())
