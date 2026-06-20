'use client'

import { createClient } from '@/lib/supabase/client'
import { PublicCatalogSettingsService } from './public-catalog-settings.service'

export * from './public-catalog-settings.service'
export const publicCatalogSettingsService = new PublicCatalogSettingsService(createClient())
