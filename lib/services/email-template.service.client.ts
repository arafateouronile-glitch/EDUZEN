'use client'

import { EmailTemplateService } from './email-template.service'
import { createClient } from '@/lib/supabase/client'

export * from './email-template.service'
export const emailTemplateService = new EmailTemplateService(createClient())
