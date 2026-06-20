'use client'

import { createClient } from '@/lib/supabase/client'
import { EvaluationService } from './evaluation.service'

export const evaluationService = new EvaluationService(createClient())
