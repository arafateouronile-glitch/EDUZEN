'use client'

import { createClient } from '@/lib/supabase/client'
import { RealtimeCollaborationService } from './realtime-collaboration.service'

export const realtimeCollaborationService = new RealtimeCollaborationService(createClient())
