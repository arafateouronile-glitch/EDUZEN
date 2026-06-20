'use client'

import { createClient } from '@/lib/supabase/client'
import { MessagingService } from './messaging.service'

export * from './messaging.service'
export const messagingService = new MessagingService(createClient())
