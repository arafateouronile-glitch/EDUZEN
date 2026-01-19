'use client'

import { EmailTemplateService } from './email-template.service'
import { createClient } from '@/lib/supabase/client'

export const emailTemplateService = new EmailTemplateService(createClient())
