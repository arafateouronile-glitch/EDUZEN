'use client'

import { createClient } from '@/lib/supabase/client'
import { ReportCardService } from './report-card.service'

export * from './report-card.service'
export const reportCardService = new ReportCardService(createClient())
