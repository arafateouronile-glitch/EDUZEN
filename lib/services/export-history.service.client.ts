'use client'

import { createClient } from '@/lib/supabase/client'
import { ExportHistoryService } from './export-history.service'

export const exportHistoryService = new ExportHistoryService(createClient())
