'use client'

import { createClient } from '@/lib/supabase/client'
import { CalendarService } from './calendar.service'

export * from './calendar.service'
export const calendarService = new CalendarService(createClient())
