'use client'

import { createClient } from '@/lib/supabase/client'
import { SharedCalendarService } from './shared-calendar.service'

export const sharedCalendarService = new SharedCalendarService(createClient())
