'use client'

import { createClient } from '@/lib/supabase/client'
import { PublicCatalogService } from './public-catalog.service'

export * from './public-catalog.service'
export const publicCatalogService = new PublicCatalogService(createClient())
