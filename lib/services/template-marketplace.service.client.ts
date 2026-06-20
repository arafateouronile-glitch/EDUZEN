'use client'

import { createClient } from '@/lib/supabase/client'
import { TemplateMarketplaceService } from './template-marketplace.service'

export const templateMarketplaceService = new TemplateMarketplaceService(createClient())
