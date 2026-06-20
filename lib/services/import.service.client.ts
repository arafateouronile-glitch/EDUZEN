'use client'

import { createClient } from '@/lib/supabase/client'
import { ImportService } from './import.service'

export const importService = new ImportService(createClient())
