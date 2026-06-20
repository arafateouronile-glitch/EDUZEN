'use client'

import { createClient } from '@/lib/supabase/client'
import { SessionService } from './session.service'

export * from './session.service'
export const sessionService = new SessionService(createClient())
