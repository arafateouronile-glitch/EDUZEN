'use client'

import { DocumentTemplateService } from './document-template.service'
import { createClient } from '@/lib/supabase/client'

// Instance par défaut pour usage côté client
export * from './document-template.service'
export const documentTemplateService = new DocumentTemplateService(createClient())
