'use client'

import { EmailScheduleService } from './email-schedule.service'
import { createClient } from '@/lib/supabase/client'

export const emailScheduleService = new EmailScheduleService(createClient())
