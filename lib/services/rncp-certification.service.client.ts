'use client'

import { createClient } from '@/lib/supabase/client'
import { RNCPCertificationService } from './rncp-certification.service'

export const rncpCertificationService = new RNCPCertificationService(createClient())
