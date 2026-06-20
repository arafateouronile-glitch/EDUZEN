'use client'

import { createClient } from '@/lib/supabase/client'
import { ELearningService } from './elearning.service'

export * from './elearning.service'
export const elearningService = new ELearningService(createClient())
