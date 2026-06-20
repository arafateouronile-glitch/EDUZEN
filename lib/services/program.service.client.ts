'use client'

import { createClient } from '@/lib/supabase/client'
import { ProgramService } from './program.service'

export * from './program.service'
export const programService = new ProgramService(createClient())
