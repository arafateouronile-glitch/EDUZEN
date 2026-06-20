'use client'

import { createClient } from '@/lib/supabase/client'
import { EvaluationTemplateService } from './evaluation-template.service'

export * from './evaluation-template.service'
export const evaluationTemplateService = new EvaluationTemplateService(createClient())
