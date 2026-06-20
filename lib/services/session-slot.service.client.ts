'use client'

import { createClient } from '@/lib/supabase/client'
import { SessionSlotService } from './session-slot.service'

export const sessionSlotService = new SessionSlotService(createClient())
