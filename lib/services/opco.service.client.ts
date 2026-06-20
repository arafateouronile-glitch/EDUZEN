'use client'

import { createClient } from '@/lib/supabase/client'
import { OPCOService } from './opco.service'

export const opcoService = new OPCOService(createClient())
