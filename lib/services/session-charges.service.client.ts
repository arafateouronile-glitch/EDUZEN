'use client'

import { createClient } from '@/lib/supabase/client'
import { SessionChargesService } from './session-charges.service'

export const sessionChargesService = new SessionChargesService(createClient())
