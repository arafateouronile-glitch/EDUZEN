'use client'

import { createClient } from '@/lib/supabase/client'
import { SearchService } from './search.service'

export * from './search.service'
export * from './search-filters'
export const searchService = new SearchService(createClient())
