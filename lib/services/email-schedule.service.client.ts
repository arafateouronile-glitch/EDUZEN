'use client'

import { EmailScheduleService } from './email-schedule.service'
import { createClient } from '@/lib/supabase/client'

export * from './email-schedule.service'
export const emailScheduleService = new EmailScheduleService(createClient())
