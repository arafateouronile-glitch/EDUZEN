'use client'

import { DocumentationService } from './documentation.service'
import { createClient } from '@/lib/supabase/client'

// Instance par défaut pour usage côté client
export const documentationService = new DocumentationService(createClient())
