'use client'

import { createClient } from '@/lib/supabase/client'
import { FormationService } from './formation.service'

export * from './formation.service'
export const formationService = new FormationService(createClient())
