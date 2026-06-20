'use client'

import { createClient } from '@/lib/supabase/client'
import { ABTestingService } from './ab-testing.service'

export const abTestingService = new ABTestingService(createClient())
