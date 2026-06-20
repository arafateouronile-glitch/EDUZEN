'use client'

import { createClient } from '@/lib/supabase/client'
import { WorkflowValidationService } from './workflow-validation.service'

export const workflowValidationService = new WorkflowValidationService(createClient())
